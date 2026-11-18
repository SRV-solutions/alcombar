/**
 * Etapa 5: contabilidad (cuentas, categorías, movimientos, transferencias, cierres mensuales, presupuesto, reportes)
 * y cuotas/pagos de protagonistas (plan de cuotas, becas, generación de cuotas, cuenta corriente, pagos y recibos).
 * Reglas:
 *  - Los movimientos de un mes cerrado no se editan ni se borran: se corrigen con "Anular" (contra-asiento).
 *  - Cada pago crea su recibo numerado (R-<año>-0001) y el/los ingresos en contabilidad (por concepto).
 */
import { Router, type Request } from 'express';
import { Op, QueryTypes, type Transaction as SqlTx, type WhereOptions } from 'sequelize';
import {
  accountSchema,
  accountTransferSchema,
  budgetSchema,
  can,
  canGroupWide,
  categorySchema,
  CHARGE_CONCEPT_CATEGORY,
  CHARGE_CONCEPT_LABELS,
  chargeSchema,
  feePlanSchema,
  feeSettingSchema,
  formatDate,
  generateChargesSchema,
  MONTH_NAMES,
  paymentSchema,
  periodCloseSchema,
  round2,
  todayIso,
  transactionSchema,
  unitsWith,
  voidSchema,
  type ChargeConcept,
} from '../shared';
import { sequelize } from '../db';
import { Guardian, Member, MemberGuardian, Unit, User } from '../models';
import {
  Account,
  Budget,
  BudgetLine,
  Camp,
  Category,
  Charge,
  FeePlan,
  GroupEvent,
  MemberFeeSetting,
  Movement,
  NATURE,
  Payment,
  PaymentAllocation,
  PeriodClose,
  SIGNED,
} from '../models/treasury';
import { writeAudit } from '../lib/audit';
import { currentContext } from '../lib/context';
import { sendCsv, toCsv } from '../lib/csv';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';

export const accountingRouter = Router();

// ===================================================================
// Utilidades
// ===================================================================
const monthKey = (iso: string) => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) });

async function isClosed(iso: string, transaction?: SqlTx) {
  const { year, month } = monthKey(iso);
  return Boolean(await PeriodClose.findOne({ where: { year, month }, transaction }));
}
async function assertOpen(iso: string, transaction?: SqlTx) {
  if (await isClosed(iso, transaction)) {
    const { year, month } = monthKey(iso);
    throw badRequest(`${MONTH_NAMES[month - 1]} de ${year} está cerrado: no se puede modificar. Para corregir usá "Anular".`);
  }
}

const movementInclude = [
  { model: Account, as: 'account', attributes: ['id', 'name', 'type'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'kind', 'code'] },
  { model: GroupEvent, as: 'event', attributes: ['id', 'name'] },
  { model: Camp, as: 'camp', attributes: ['id', 'name'] },
  { model: Payment, as: 'payment', attributes: ['id', 'receiptNumber', 'memberId'] },
  { model: User, as: 'createdBy', attributes: ['id', 'name'] },
];

/** Recalcula lo pagado y el estado de un cargo a partir de sus imputaciones (de pagos no anulados). */
async function refreshCharge(chargeId: string, transaction: SqlTx) {
  const charge = await Charge.findByPk(chargeId, { transaction });
  if (!charge) return;
  const [row] = await sequelize.query<{ paid: string | null }>(
    `SELECT COALESCE(SUM(pa.amount),0) AS paid FROM payment_allocations pa
     JOIN payments p ON p.id = pa.payment_id AND p.deleted_at IS NULL AND p.voided = false
     WHERE pa.charge_id = :id`,
    { type: QueryTypes.SELECT, replacements: { id: chargeId }, transaction },
  );
  const paid = round2(Number(row?.paid ?? 0));
  const status = charge.status === 'anulado' ? 'anulado' : paid >= charge.amount - 0.001 ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
  if (charge.paidAmount !== paid || charge.status !== status) await charge.update({ paidAmount: paid, status }, { transaction });
}

/** Próximo número de recibo del año (correlativo, con bloqueo para que no se repita). */
async function nextReceiptNumber(year: number, transaction: SqlTx) {
  await sequelize.query('SELECT pg_advisory_xact_lock(155000155)', { transaction });
  const [row] = await sequelize.query<{ n: number | null }>(
    `SELECT MAX(CAST(SUBSTRING(receipt_number FROM 8) AS INTEGER)) AS n FROM payments WHERE receipt_number LIKE :prefix`,
    { type: QueryTypes.SELECT, replacements: { prefix: `R-${year}-%` }, transaction },
  );
  return `R-${year}-${String((row?.n ?? 0) + 1).padStart(4, '0')}`;
}

/** Crea el contra-asiento de un movimiento y lo marca anulado. */
async function reverseMovement(m: Movement, date: string, reason: string | null, transaction: SqlTx) {
  if (m.voided) throw badRequest('El movimiento ya está anulado');
  if (m.reversesId) throw badRequest('Es una anulación: no se puede anular');
  await assertOpen(date, transaction);
  const rev = await Movement.create(
    {
      date,
      kind: m.kind === 'ingreso' ? 'egreso' : 'ingreso',
      accountId: m.accountId,
      categoryId: m.categoryId,
      amount: m.amount,
      description: `Anulación: ${m.description ?? ''}${reason ? ` (${reason})` : ''}`.slice(0, 300),
      eventId: m.eventId,
      campId: m.campId,
      campRubro: m.campRubro,
      paymentId: m.paymentId,
      transferGroup: m.transferGroup,
      reversesId: m.id,
      createdByUserId: currentContext().userId,
    },
    { transaction },
  );
  await m.update({ voided: true }, { transaction });
  return rev;
}

const memberUnit = async (req: Request) => (await Member.findByPk(req.params.memberId, { attributes: ['unitId'] }))?.unitId;
async function chargeWithMember(id: string) {
  const c = await Charge.findByPk(id, { include: [{ model: Member, as: 'member', attributes: ['id', 'unitId', 'firstName', 'lastName'] }] });
  if (!c) throw notFound('Cargo inexistente');
  return c;
}

// ===================================================================
// Catálogos: cuentas y categorías
// ===================================================================
accountingRouter.get(
  '/accounts',
  ah(async (req, res) => {
    // Las ven quienes llevan la contabilidad o registran pagos
    if (!(can(req.auth, 'accounting', 'view') || can(req.auth, 'fees', 'create') || can(req.auth, 'fees', 'edit'))) throw forbidden();
    const accounts = await Account.findAll({ order: [['name', 'ASC']] });
    const balances = await sequelize.query<{ account_id: string; net: string }>(
      `SELECT account_id, SUM(CASE WHEN kind='ingreso' THEN amount ELSE -amount END) AS net
       FROM transactions WHERE deleted_at IS NULL GROUP BY account_id`,
      { type: QueryTypes.SELECT },
    );
    const showBalance = can(req.auth, 'accounting', 'view');
    res.json(
      accounts.map((a) => ({
        ...a.toJSON(),
        balance: showBalance ? round2(a.initialBalance + Number(balances.find((b) => b.account_id === a.id)?.net ?? 0)) : null,
      })),
    );
  }),
);
accountingRouter.post(
  '/accounts',
  authorize('accounting', 'create'),
  ah(async (req, res) => {
    res.status(201).json(await Account.create(parse(accountSchema, req.body)));
  }),
);
accountingRouter.put(
  '/accounts/:id',
  authorize('accounting', 'edit'),
  ah(async (req, res) => {
    const a = await Account.findByPk(req.params.id);
    if (!a) throw notFound();
    await a.update(parse(accountSchema, req.body));
    res.json(a);
  }),
);
accountingRouter.delete(
  '/accounts/:id',
  authorize('accounting', 'delete'),
  ah(async (req, res) => {
    const a = await Account.findByPk(req.params.id);
    if (!a) throw notFound();
    if (await Movement.count({ where: { accountId: a.id }, paranoid: false })) throw badRequest('La cuenta tiene movimientos: desactivala en lugar de eliminarla.');
    await a.destroy();
    res.json({ ok: true });
  }),
);

accountingRouter.get(
  '/categories',
  ah(async (_req, res) => {
    res.json(await Category.findAll({ order: [['kind', 'DESC'], ['sortOrder', 'ASC'], ['name', 'ASC']] }));
  }),
);
accountingRouter.post(
  '/categories',
  authorize('accounting', 'create'),
  ah(async (req, res) => {
    res.status(201).json(await Category.create({ ...parse(categorySchema, req.body), code: null }));
  }),
);
accountingRouter.put(
  '/categories/:id',
  authorize('accounting', 'edit'),
  ah(async (req, res) => {
    const c = await Category.findByPk(req.params.id);
    if (!c) throw notFound();
    const data = parse(categorySchema, req.body);
    if (c.code && data.kind !== c.kind) throw badRequest('No se puede cambiar el tipo de una categoría del sistema');
    await c.update(data);
    res.json(c);
  }),
);

// ===================================================================
// Movimientos
// ===================================================================
function movementWhere(req: Request): WhereOptions {
  const w: Record<string | symbol, unknown> = {};
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (from && to) w.date = { [Op.between]: [from, to] };
  else if (from) w.date = { [Op.gte]: from };
  else if (to) w.date = { [Op.lte]: to };
  for (const [q, col] of [
    ['accountId', 'accountId'],
    ['categoryId', 'categoryId'],
    ['kind', 'kind'],
    ['eventId', 'eventId'],
    ['campId', 'campId'],
  ] as const) {
    if (req.query[q]) w[col] = String(req.query[q]);
  }
  const q = String(req.query.q ?? '').trim();
  if (q) w.description = { [Op.iLike]: `%${q}%` };
  return w;
}

accountingRouter.get(
  '/movements',
  authorize('accounting', 'view'),
  ah(async (req, res) => {
    const where = movementWhere(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Number(req.query.pageSize) || 100);
    const { rows, count } = await Movement.findAndCountAll({
      where,
      include: movementInclude,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const totals = await Movement.findAll({
      where: { ...(where as object), transferGroup: null },
      attributes: ['kind', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['kind'],
      raw: true,
    });
    const sum = (k: string) => round2(Number((totals as unknown as { kind: string; total: string }[]).find((t) => t.kind === k)?.total ?? 0));
    const closes = await PeriodClose.findAll({ attributes: ['year', 'month'] });
    const closed = new Set(closes.map((c) => `${c.year}-${c.month}`));
    res.json({
      rows: rows.map((m) => {
        const { year, month } = monthKey(m.date);
        return { ...m.toJSON(), closed: closed.has(`${year}-${month}`) };
      }),
      total: count,
      page,
      pageSize,
      totals: { ingresos: sum('ingreso'), egresos: sum('egreso'), resultado: round2(sum('ingreso') - sum('egreso')) },
    });
  }),
);

accountingRouter.get(
  '/movements/export',
  authorize('accounting', 'export'),
  ah(async (req, res) => {
    const rows = await Movement.findAll({ where: movementWhere(req), include: movementInclude, order: [['date', 'ASC'], ['createdAt', 'ASC']] });
    const csv = toCsv(
      ['fecha', 'tipo', 'cuenta', 'categoria', 'monto', 'descripcion', 'evento', 'campamento', 'recibo', 'comprobante', 'anulado', 'cargado_por'],
      rows.map((m) => [
        formatDate(m.date),
        m.kind,
        m.account?.name,
        m.transferGroup ? 'Transferencia' : m.category?.name,
        m.amount.toFixed(2).replace('.', ','),
        m.description,
        (m as unknown as { event?: { name: string } }).event?.name,
        (m as unknown as { camp?: { name: string } }).camp?.name,
        (m as unknown as { payment?: { receiptNumber: string } }).payment?.receiptNumber,
        m.receiptUrl,
        m.voided ? 'sí' : m.reversesId ? 'anulación' : '',
        m.createdBy?.name,
      ]),
    );
    await writeAudit({ action: 'export', entity: 'Movement', summary: `Exportación de ${rows.length} movimientos` });
    sendCsv(res, `movimientos-${todayIso()}.csv`, csv);
  }),
);

/** Un gasto de campamento siempre lleva rubro (por defecto "otro"); un ingreso nunca. */
const withRubro = <T extends { kind: string; campId: string | null; campRubro: string | null }>(d: T): T => ({
  ...d,
  campRubro: d.campId ? (d.kind === 'egreso' ? d.campRubro ?? 'otro' : null) : null,
});

async function validateRefs(data: { accountId: string; categoryId?: string | null; kind?: string; eventId?: string | null; campId?: string | null }) {
  if (!(await Account.findByPk(data.accountId))) throw badRequest('Revisá los datos', { accountId: 'Cuenta inexistente' });
  if (data.categoryId) {
    const c = await Category.findByPk(data.categoryId);
    if (!c) throw badRequest('Revisá los datos', { categoryId: 'Categoría inexistente' });
    if (data.kind && c.kind !== data.kind) throw badRequest('Revisá los datos', { categoryId: `Es una categoría de ${c.kind}` });
  }
  if (data.eventId && !(await GroupEvent.findByPk(data.eventId))) throw badRequest('Revisá los datos', { eventId: 'Evento inexistente' });
  if (data.campId && !(await Camp.findByPk(data.campId))) throw badRequest('Revisá los datos', { campId: 'Campamento inexistente' });
}

accountingRouter.post(
  '/movements',
  authorize('accounting', 'create'),
  ah(async (req, res) => {
    const data = withRubro(parse(transactionSchema, req.body));
    await validateRefs(data);
    await assertOpen(data.date);
    const m = await Movement.create({ ...data, createdByUserId: currentContext().userId });
    res.status(201).json(m);
  }),
);

async function editableMovement(id: string) {
  const m = await Movement.findByPk(id);
  if (!m) throw notFound();
  if (m.voided || m.reversesId) throw badRequest('Un movimiento anulado (o una anulación) no se modifica');
  if (m.paymentId) throw badRequest('Es el ingreso de un pago: para corregirlo anulá el pago desde la cuenta del protagonista');
  if (m.transferGroup) throw badRequest('Es una transferencia: para corregirla usá "Anular"');
  await assertOpen(m.date);
  return m;
}

accountingRouter.put(
  '/movements/:id',
  authorize('accounting', 'edit'),
  ah(async (req, res) => {
    const m = await editableMovement(req.params.id);
    const data = withRubro(parse(transactionSchema, req.body));
    await validateRefs(data);
    await assertOpen(data.date);
    await m.update(data);
    res.json(m);
  }),
);

accountingRouter.delete(
  '/movements/:id',
  authorize('accounting', 'delete'),
  ah(async (req, res) => {
    const m = await editableMovement(req.params.id);
    await m.destroy();
    res.json({ ok: true });
  }),
);

accountingRouter.post(
  '/movements/:id/void',
  authorize('accounting', 'edit'),
  ah(async (req, res) => {
    const data = parse(voidSchema, req.body ?? {});
    const date = data.date ?? todayIso();
    const m = await Movement.findByPk(req.params.id);
    if (!m) throw notFound();
    if (m.paymentId) throw badRequest('Es el ingreso de un pago: anulá el pago desde la cuenta del protagonista');
    await sequelize.transaction(async (transaction) => {
      const legs = m.transferGroup ? await Movement.findAll({ where: { transferGroup: m.transferGroup, reversesId: null }, transaction }) : [m];
      for (const leg of legs) await reverseMovement(leg, date, data.reason, transaction);
    });
    res.json({ ok: true });
  }),
);

accountingRouter.post(
  '/transfers',
  authorize('accounting', 'create'),
  ah(async (req, res) => {
    const data = parse(accountTransferSchema, req.body);
    if (data.fromAccountId === data.toAccountId) throw badRequest('Revisá los datos', { toAccountId: 'Elegí otra cuenta' });
    const [from, to] = await Promise.all([Account.findByPk(data.fromAccountId), Account.findByPk(data.toAccountId)]);
    if (!from || !to) throw badRequest('Cuenta inexistente');
    await assertOpen(data.date);
    const group = crypto.randomUUID();
    const desc = data.description ?? `Transferencia ${from.name} → ${to.name}`;
    await sequelize.transaction(async (transaction) => {
      const base = { date: data.date, amount: data.amount, description: desc, transferGroup: group, createdByUserId: currentContext().userId, categoryId: null };
      await Movement.create({ ...base, kind: 'egreso', accountId: from.id }, { transaction });
      await Movement.create({ ...base, kind: 'ingreso', accountId: to.id }, { transaction });
    });
    res.status(201).json({ ok: true });
  }),
);

// ===================================================================
// Resumen, cierres, presupuesto y reportes
// ===================================================================
accountingRouter.get(
  '/summary',
  authorize('accounting', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const accounts = await Account.findAll({ order: [['name', 'ASC']] });
    const net = await sequelize.query<{ account_id: string; net: string }>(
      `SELECT account_id, SUM(CASE WHEN kind='ingreso' THEN amount ELSE -amount END) AS net FROM transactions WHERE deleted_at IS NULL GROUP BY account_id`,
      { type: QueryTypes.SELECT },
    );
    const months = await sequelize.query<{ m: number; kind: string; total: string }>(
      `SELECT EXTRACT(MONTH FROM date)::int AS m, kind, SUM(amount) AS total FROM transactions
       WHERE deleted_at IS NULL AND transfer_group IS NULL AND date BETWEEN :from AND :to GROUP BY 1, 2`,
      { type: QueryTypes.SELECT, replacements: { from: `${year}-01-01`, to: `${year}-12-31` } },
    );
    const closes = await PeriodClose.findAll({ where: { year }, include: [{ model: User, as: 'closedBy', attributes: ['id', 'name'] }], order: [['month', 'ASC']] });
    const recent = await Movement.findAll({ include: movementInclude, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 8 });
    const budget = await Budget.findOne({ where: { year } });
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const inc = Number(months.find((x) => x.m === i + 1 && x.kind === 'ingreso')?.total ?? 0);
      const exp = Number(months.find((x) => x.m === i + 1 && x.kind === 'egreso')?.total ?? 0);
      return { month: i + 1, ingresos: round2(inc), egresos: round2(exp), resultado: round2(inc - exp), closed: closes.some((c) => c.month === i + 1) };
    });
    res.json({
      year,
      accounts: accounts.map((a) => ({
        ...a.toJSON(),
        balance: round2(a.initialBalance + Number(net.find((n) => n.account_id === a.id)?.net ?? 0)),
      })),
      byMonth,
      totals: {
        ingresos: round2(byMonth.reduce((s, m) => s + m.ingresos, 0)),
        egresos: round2(byMonth.reduce((s, m) => s + m.egresos, 0)),
      },
      closes,
      recent,
      budget: budget ? { status: budget.status, approvedAt: budget.approvedAt } : null,
    });
  }),
);

accountingRouter.get(
  '/closes',
  authorize('accounting', 'view'),
  ah(async (_req, res) => {
    res.json(await PeriodClose.findAll({ include: [{ model: User, as: 'closedBy', attributes: ['id', 'name'] }], order: [['year', 'DESC'], ['month', 'DESC']] }));
  }),
);
accountingRouter.post(
  '/closes',
  authorize('accounting', 'approve'),
  ah(async (req, res) => {
    const data = parse(periodCloseSchema, req.body);
    const now = new Date();
    if (data.year * 12 + data.month > now.getFullYear() * 12 + now.getMonth() + 1) throw badRequest('No se puede cerrar un mes que todavía no empezó');
    if (await PeriodClose.findOne({ where: { year: data.year, month: data.month } })) throw badRequest('Ese mes ya está cerrado');
    const c = await PeriodClose.create({ ...data, closedByUserId: currentContext().userId });
    res.status(201).json(c);
  }),
);
accountingRouter.delete(
  '/closes/:id',
  authorize('accounting', 'approve'),
  ah(async (req, res) => {
    const c = await PeriodClose.findByPk(req.params.id);
    if (!c) throw notFound();
    await c.destroy();
    res.json({ ok: true });
  }),
);

/** Real por categoría en un año: ingresos − egresos (categorías de ingreso) o al revés (de egreso). Sin transferencias. */
async function actualByCategory(year: number) {
  const rows = await sequelize.query<{ category_id: string; kind: string; total: string }>(
    `SELECT category_id, kind, SUM(amount) AS total FROM transactions
     WHERE deleted_at IS NULL AND transfer_group IS NULL AND category_id IS NOT NULL AND date BETWEEN :from AND :to
     GROUP BY 1, 2`,
    { type: QueryTypes.SELECT, replacements: { from: `${year}-01-01`, to: `${year}-12-31` } },
  );
  return (cat: Category) => {
    const inc = Number(rows.find((r) => r.category_id === cat.id && r.kind === 'ingreso')?.total ?? 0);
    const exp = Number(rows.find((r) => r.category_id === cat.id && r.kind === 'egreso')?.total ?? 0);
    return round2(cat.kind === 'ingreso' ? inc - exp : exp - inc);
  };
}

accountingRouter.get(
  '/budgets/:year',
  authorize('accounting', 'view'),
  ah(async (req, res) => {
    const year = Number(req.params.year);
    const budget = await Budget.findOne({ where: { year }, include: [{ model: BudgetLine, as: 'lines' }, { model: User, as: 'approvedBy', attributes: ['id', 'name'] }] });
    const categories = await Category.findAll({ order: [['kind', 'DESC'], ['sortOrder', 'ASC'], ['name', 'ASC']] });
    const actual = await actualByCategory(year);
    const lines = categories
      .filter((c) => c.active || budget?.lines?.some((l) => l.categoryId === c.id))
      .map((c) => {
        const l = budget?.lines?.find((x) => x.categoryId === c.id);
        const planned = l?.amount ?? 0;
        const real = actual(c);
        return { categoryId: c.id, name: c.name, kind: c.kind, planned, actual: real, notes: l?.notes ?? null, pct: planned ? Math.round((real / planned) * 100) : null };
      });
    const sum = (kind: string, k: 'planned' | 'actual') => round2(lines.filter((l) => l.kind === kind).reduce((s, l) => s + l[k], 0));
    res.json({
      year,
      status: budget?.status ?? 'borrador',
      exists: Boolean(budget),
      notes: budget?.notes ?? null,
      approvedAt: budget?.approvedAt ?? null,
      approvedBy: (budget as unknown as { approvedBy?: { name: string } })?.approvedBy?.name ?? null,
      lines,
      totals: {
        plannedIncome: sum('ingreso', 'planned'),
        plannedExpense: sum('egreso', 'planned'),
        actualIncome: sum('ingreso', 'actual'),
        actualExpense: sum('egreso', 'actual'),
      },
    });
  }),
);
accountingRouter.put(
  '/budgets/:year',
  authorize('accounting', 'edit'),
  ah(async (req, res) => {
    const year = Number(req.params.year);
    if (!year || year < 2000 || year > 2100) throw badRequest('Año inválido');
    const data = parse(budgetSchema, req.body);
    await sequelize.transaction(async (transaction) => {
      let budget = await Budget.findOne({ where: { year }, transaction });
      if (budget?.status === 'aprobado' && !can(req.auth, 'accounting', 'approve')) throw forbidden('El presupuesto está aprobado: solo quien aprueba lo puede modificar');
      if (!budget) budget = await Budget.create({ year, status: 'borrador', notes: data.notes }, { transaction });
      else await budget.update({ notes: data.notes }, { transaction });
      const current = await BudgetLine.findAll({ where: { budgetId: budget.id }, transaction });
      for (const l of data.lines) {
        const ex = current.find((c) => c.categoryId === l.categoryId);
        if (ex) {
          if (ex.amount !== l.amount || ex.notes !== l.notes) await ex.update({ amount: l.amount, notes: l.notes }, { transaction });
        } else if (l.amount > 0) {
          await BudgetLine.create({ budgetId: budget.id, categoryId: l.categoryId, amount: l.amount, notes: l.notes }, { transaction });
        }
      }
    });
    res.json({ ok: true });
  }),
);
accountingRouter.post(
  '/budgets/:year/approve',
  authorize('accounting', 'approve'),
  ah(async (req, res) => {
    const budget = await Budget.findOne({ where: { year: Number(req.params.year) } });
    if (!budget) throw badRequest('Primero cargá el presupuesto');
    await budget.update({ status: budget.status === 'aprobado' ? 'borrador' : 'aprobado', approvedAt: budget.status === 'aprobado' ? null : new Date(), approvedByUserId: currentContext().userId });
    res.json({ status: budget.status });
  }),
);

accountingRouter.get(
  '/reports/cash',
  authorize('accounting', 'view'),
  ah(async (req, res) => {
    const year = new Date().getFullYear();
    const from = String(req.query.from || `${year}-01-01`);
    const to = String(req.query.to || todayIso());
    const accounts = await Account.findAll({ order: [['name', 'ASC']] });
    const before = await sequelize.query<{ account_id: string; net: string }>(
      `SELECT account_id, SUM(CASE WHEN kind='ingreso' THEN amount ELSE -amount END) AS net FROM transactions
       WHERE deleted_at IS NULL AND date < :from GROUP BY account_id`,
      { type: QueryTypes.SELECT, replacements: { from } },
    );
    const range = await sequelize.query<{ account_id: string; kind: string; total: string }>(
      `SELECT account_id, kind, SUM(amount) AS total FROM transactions
       WHERE deleted_at IS NULL AND date BETWEEN :from AND :to GROUP BY 1, 2`,
      { type: QueryTypes.SELECT, replacements: { from, to } },
    );
    const rows = accounts.map((a) => {
      const opening = round2(a.initialBalance + Number(before.find((b) => b.account_id === a.id)?.net ?? 0));
      const inc = round2(Number(range.find((r) => r.account_id === a.id && r.kind === 'ingreso')?.total ?? 0));
      const exp = round2(Number(range.find((r) => r.account_id === a.id && r.kind === 'egreso')?.total ?? 0));
      return { accountId: a.id, name: a.name, opening, ingresos: inc, egresos: exp, closing: round2(opening + inc - exp) };
    });
    res.json({ from, to, rows });
  }),
);

/** Resultado por evento y por campamento (previsto vs. real). */
accountingRouter.get(
  '/reports/projects',
  ah(async (req, res) => {
    if (!(can(req.auth, 'accounting', 'view') || can(req.auth, 'events', 'view') || can(req.auth, 'camps', 'view'))) throw forbidden();
    const year = Number(req.query.year) || new Date().getFullYear();
    const real = await sequelize.query<{ key: string; id: string; kind: string; total: string }>(
      `SELECT 'event' AS key, event_id AS id, ${NATURE} AS kind, SUM(${SIGNED}) AS total FROM transactions WHERE deleted_at IS NULL AND event_id IS NOT NULL GROUP BY 2, 3
       UNION ALL
       SELECT 'camp' AS key, camp_id AS id, ${NATURE} AS kind, SUM(${SIGNED}) AS total FROM transactions WHERE deleted_at IS NULL AND camp_id IS NOT NULL GROUP BY 2, 3`,
      { type: QueryTypes.SELECT },
    );
    const planned = await sequelize.query<{ key: string; id: string; kind: string; total: string }>(
      `SELECT 'event' AS key, event_id AS id, kind, SUM(planned) AS total FROM event_budget_lines WHERE deleted_at IS NULL GROUP BY 2, 3
       UNION ALL
       SELECT 'camp' AS key, camp_id AS id, 'egreso' AS kind, SUM(planned) AS total FROM camp_budget_lines WHERE deleted_at IS NULL GROUP BY 2`,
      { type: QueryTypes.SELECT },
    );
    const val = (list: typeof real, key: string, id: string, kind: string) => round2(Number(list.find((r) => r.key === key && r.id === id && r.kind === kind)?.total ?? 0));
    const range = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    const showEvents = can(req.auth, 'accounting', 'view') || can(req.auth, 'events', 'view');
    const events = showEvents ? await GroupEvent.findAll({ where: { date: range }, order: [['date', 'ASC']] }) : [];
    const campsAll = await Camp.findAll({ where: { startDate: range }, order: [['startDate', 'ASC']] });
    const camps = campsAll.filter((c) => can(req.auth, 'accounting', 'view') || can(req.auth, 'camps', 'view', c.ownerUnitId));
    res.json({
      year,
      events: events.map((e) => {
        const inc = val(real, 'event', e.id, 'ingreso');
        const exp = val(real, 'event', e.id, 'egreso');
        return {
          id: e.id,
          name: e.name,
          date: e.date,
          status: e.status,
          plannedIncome: val(planned, 'event', e.id, 'ingreso'),
          plannedExpense: val(planned, 'event', e.id, 'egreso'),
          ingresos: inc,
          egresos: exp,
          resultado: round2(inc - exp),
        };
      }),
      camps: camps.map((c) => {
        const inc = val(real, 'camp', c.id, 'ingreso');
        const exp = val(real, 'camp', c.id, 'egreso');
        return { id: c.id, name: c.name, startDate: c.startDate, status: c.status, plannedExpense: val(planned, 'camp', c.id, 'egreso'), ingresos: inc, egresos: exp, resultado: round2(inc - exp) };
      }),
    });
  }),
);

// ===================================================================
// CUOTAS Y PAGOS
// ===================================================================
const DEFAULT_PLAN = { monthlyAmount: 0, months: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], affiliationAmount: 0, siblingDiscountPct: 0, dueDay: 10, notes: null };

accountingRouter.get(
  '/fees/plans/:year',
  authorize('fees', 'view'),
  ah(async (req, res) => {
    const year = Number(req.params.year);
    const plan = await FeePlan.findOne({ where: { year } });
    res.json(plan ? { ...plan.toJSON(), exists: true } : { year, ...DEFAULT_PLAN, exists: false });
  }),
);
accountingRouter.put(
  '/fees/plans/:year',
  ah(async (req, res) => {
    if (!canGroupWide(req.auth, 'fees', 'edit')) throw forbidden();
    const year = Number(req.params.year);
    if (!year || year < 2000 || year > 2100) throw badRequest('Año inválido');
    const data = parse(feePlanSchema, req.body);
    const months = [...new Set(data.months)].sort((a, b) => a - b);
    const plan = await FeePlan.findOne({ where: { year } });
    if (plan) await plan.update({ ...data, months });
    else await FeePlan.create({ ...data, months, year });
    res.json({ ok: true });
  }),
);

/** Grupos de hermanos: protagonistas que comparten algún responsable. Devuelve el "orden" de cada uno en su familia (0 = el mayor). */
async function siblingOrder(memberIds: string[]) {
  const links = await MemberGuardian.findAll({ where: { memberId: memberIds }, attributes: ['memberId', 'guardianId'] });
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    while (parent.get(x) && parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const id of memberIds) parent.set(id, id);
  const byGuardian = new Map<string, string[]>();
  for (const l of links) byGuardian.set(l.guardianId, [...(byGuardian.get(l.guardianId) ?? []), l.memberId]);
  for (const ids of byGuardian.values()) for (const id of ids.slice(1)) parent.set(find(id), find(ids[0]));
  return parent.size ? find : (x: string) => x;
}

accountingRouter.post(
  '/fees/generate',
  ah(async (req, res) => {
    if (!canGroupWide(req.auth, 'fees', 'create') || !canGroupWide(req.auth, 'fees', 'edit')) throw forbidden('Generar cuotas lo hace Tesorería');
    const data = parse(generateChargesSchema, req.body);
    const preview = req.query.preview === '1' || req.body?.preview === true;
    const plan = await FeePlan.findOne({ where: { year: data.year } });
    if (!plan) throw badRequest(`Primero cargá el plan de cuotas ${data.year}`);
    let period: string;
    let dueDate: string;
    let base: number;
    if (data.concept === 'cuota') {
      if (!data.month) throw badRequest('Elegí el mes');
      if (!plan.months.includes(data.month)) throw badRequest(`${MONTH_NAMES[data.month - 1]} no está entre los meses que se cobran en el plan`);
      period = `${data.year}-${String(data.month).padStart(2, '0')}`;
      dueDate = `${period}-${String(plan.dueDay).padStart(2, '0')}`;
      base = plan.monthlyAmount;
    } else {
      period = String(data.year);
      dueDate = `${data.year}-04-30`;
      base = plan.affiliationAmount;
    }
    if (!(base > 0)) throw badRequest(`El monto de ${data.concept === 'cuota' ? 'la cuota' : 'la afiliación'} del plan es $ 0`);

    const members = await Member.findAll({
      where: { status: 'activo', unitId: data.unitId ? data.unitId : { [Op.ne]: null } },
      attributes: ['id', 'birthDate', 'firstName', 'lastName'],
      order: [['birthDate', 'ASC']],
    });
    const ids = members.map((m) => m.id);
    const existing = new Set(
      (await Charge.findAll({ where: { memberId: ids, concept: data.concept, period, status: { [Op.ne]: 'anulado' } }, attributes: ['memberId'] })).map((c) => c.memberId),
    );
    const settings = await MemberFeeSetting.findAll({ where: { memberId: ids } });
    const familyOf = data.concept === 'cuota' && plan.siblingDiscountPct > 0 ? await siblingOrder(ids) : null;
    const seenFamilies = new Set<string>();
    const toCreate: Record<string, unknown>[] = [];
    let exempt = 0;
    for (const m of members) {
      // Hermanos: el mayor paga completo y los demás tienen el descuento (los miembros vienen ordenados por edad)
      let sibling = 0;
      if (familyOf) {
        const fam = familyOf(m.id);
        if (seenFamilies.has(fam)) sibling = plan.siblingDiscountPct;
        seenFamilies.add(fam);
      }
      if (existing.has(m.id)) continue;
      const beca = data.concept === 'cuota' ? settings.find((s) => s.memberId === m.id)?.discountPct ?? 0 : 0;
      const amount = round2(base * (1 - sibling / 100) * (1 - beca / 100));
      if (amount <= 0) {
        exempt++;
        continue;
      }
      toCreate.push({
        memberId: m.id,
        concept: data.concept,
        period,
        description: data.concept === 'cuota' ? `Cuota ${MONTH_NAMES[data.month! - 1]} ${data.year}` : `Afiliación ${data.year}`,
        amount,
        paidAmount: 0,
        dueDate,
        status: 'pendiente',
      });
    }
    const total = round2(toCreate.reduce((s, c) => s + (c.amount as number), 0));
    if (!preview && toCreate.length) {
      await sequelize.transaction(async (transaction) => {
        await Charge.bulkCreate(toCreate, { transaction });
        await writeAudit(
          { action: 'create', entity: 'Charge', summary: `Generación: ${toCreate.length} cargos de ${toCreate[0].description}`, changes: { period, concept: data.concept, total } },
          transaction,
        );
      });
    }
    res.json({ preview, created: toCreate.length, alreadyHad: existing.size, exempt, total, period });
  }),
);

accountingRouter.get(
  '/fees/debtors',
  authorize('fees', 'view'),
  ah(async (req, res) => {
    const allowed = unitsWith(req.auth, 'fees', 'view');
    const unitId = String(req.query.unitId ?? '');
    if (unitId && allowed !== 'all' && !allowed.includes(unitId)) throw forbidden();
    const today = todayIso();
    const rows = await sequelize.query<{
      member_id: string;
      first_name: string;
      last_name: string;
      unit_id: string | null;
      unit_code: string | null;
      unit_name: string | null;
      unit_branch: string | null;
      pending: string;
      overdue: string;
      oldest: string | null;
      n: number;
    }>(
      `SELECT c.member_id, m.first_name, m.last_name, m.unit_id, u.code AS unit_code, u.name AS unit_name, u.branch AS unit_branch,
              SUM(c.amount - c.paid_amount) AS pending,
              SUM(CASE WHEN c.due_date IS NOT NULL AND c.due_date < :today THEN c.amount - c.paid_amount ELSE 0 END) AS overdue,
              MIN(c.due_date)::text AS oldest, COUNT(*)::int AS n
       FROM charges c JOIN members m ON m.id = c.member_id AND m.deleted_at IS NULL LEFT JOIN units u ON u.id = m.unit_id
       WHERE c.deleted_at IS NULL AND c.status IN ('pendiente','parcial')
         ${unitId ? 'AND m.unit_id = :unitId' : ''}
         ${!unitId && allowed !== 'all' ? 'AND m.unit_id IN (:allowed)' : ''}
       GROUP BY c.member_id, m.first_name, m.last_name, m.unit_id, u.code, u.name, u.branch
       HAVING SUM(c.amount - c.paid_amount) > 0
       ORDER BY overdue DESC, m.last_name ASC`,
      { type: QueryTypes.SELECT, replacements: { today, unitId, allowed: allowed === 'all' ? [] : allowed.length ? allowed : ['00000000-0000-0000-0000-000000000000'] } },
    );
    const list = rows.map((r) => ({
      memberId: r.member_id,
      firstName: r.first_name,
      lastName: r.last_name,
      unit: r.unit_id ? { id: r.unit_id, code: r.unit_code, name: r.unit_name, branch: r.unit_branch } : null,
      pending: round2(Number(r.pending)),
      overdue: round2(Number(r.overdue)),
      oldestDue: r.oldest,
      charges: r.n,
    }));
    res.json({ rows: list, totals: { pending: round2(list.reduce((s, r) => s + r.pending, 0)), overdue: round2(list.reduce((s, r) => s + r.overdue, 0)) } });
  }),
);

accountingRouter.get(
  '/fees/settings',
  authorize('fees', 'view'),
  ah(async (req, res) => {
    const allowed = unitsWith(req.auth, 'fees', 'view');
    const list = await MemberFeeSetting.findAll({
      where: { discountPct: { [Op.gt]: 0 } },
      include: [
        {
          model: Member,
          as: 'member',
          required: true,
          attributes: ['id', 'firstName', 'lastName', 'unitId'],
          where: allowed === 'all' ? undefined : { unitId: allowed },
          include: [{ model: Unit, as: 'unit', attributes: ['id', 'code', 'name', 'branch'] }],
        },
      ],
    });
    res.json(list);
  }),
);

/** Cuenta corriente de un protagonista. */
accountingRouter.get(
  '/fees/members/:memberId',
  authorize('fees', 'view', memberUnit),
  ah(async (req, res) => {
    const member = await Member.findByPk(req.params.memberId, {
      attributes: ['id', 'firstName', 'lastName', 'unitId', 'status'],
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'code', 'name', 'branch'] }],
    });
    if (!member) throw notFound();
    const u = member.unitId;
    const [charges, payments, setting] = await Promise.all([
      Charge.findAll({ where: { memberId: member.id }, include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }], order: [['dueDate', 'ASC'], ['createdAt', 'ASC']] }),
      Payment.findAll({
        where: { memberId: member.id },
        include: [
          { model: Account, as: 'account', attributes: ['id', 'name'] },
          { model: PaymentAllocation, as: 'allocations', include: [{ model: Charge, as: 'charge', attributes: ['id', 'concept', 'period', 'description'] }] },
        ],
        order: [['date', 'DESC'], ['createdAt', 'DESC']],
      }),
      MemberFeeSetting.findOne({ where: { memberId: member.id } }),
    ]);
    const live = charges.filter((c) => c.status !== 'anulado');
    const today = todayIso();
    const charged = round2(live.reduce((s, c) => s + c.amount, 0));
    const paid = round2(live.reduce((s, c) => s + c.paidAmount, 0));
    const overdue = round2(live.filter((c) => c.dueDate && c.dueDate < today).reduce((s, c) => s + (c.amount - c.paidAmount), 0));
    // Nombre sugerido para el recibo: el primer responsable (si se pueden ver los contactos)
    let payerSuggestion: string | null = null;
    if (can(req.auth, 'member_contacts', 'view', u)) {
      const link = await MemberGuardian.findOne({ where: { memberId: member.id }, include: [{ model: Guardian, as: 'guardian', attributes: ['name'] }], order: [['sortOrder', 'ASC']] });
      payerSuggestion = link?.guardian?.name ?? null;
    }
    res.json({
      member,
      setting: setting ? { discountPct: setting.discountPct, note: setting.note } : { discountPct: 0, note: null },
      charges,
      payments,
      totals: { charged, paid, balance: round2(charged - paid), overdue },
      payerSuggestion,
      canCreate: can(req.auth, 'fees', 'create', u),
      canEdit: can(req.auth, 'fees', 'edit', u),
      canDelete: can(req.auth, 'fees', 'delete', u),
    });
  }),
);

accountingRouter.put(
  '/fees/members/:memberId/setting',
  authorize('fees', 'edit', memberUnit),
  ah(async (req, res) => {
    const data = parse(feeSettingSchema, req.body);
    const s = await MemberFeeSetting.findOne({ where: { memberId: req.params.memberId } });
    if (s) await s.update(data);
    else await MemberFeeSetting.create({ ...data, memberId: req.params.memberId });
    res.json({ ok: true });
  }),
);

accountingRouter.post(
  '/fees/members/:memberId/charges',
  authorize('fees', 'create', memberUnit),
  ah(async (req, res) => {
    const data = parse(chargeSchema, req.body);
    if (data.concept === 'campamento') throw badRequest('Los cargos de campamento se generan al inscribir en el campamento');
    if (data.period) {
      const dup = await Charge.findOne({ where: { memberId: req.params.memberId, concept: data.concept, period: data.period, status: { [Op.ne]: 'anulado' } } });
      if (dup) throw badRequest('Revisá los datos', { period: `Ya tiene un cargo de ${CHARGE_CONCEPT_LABELS[data.concept as ChargeConcept]} para ese período` });
    }
    const c = await Charge.create({ ...data, memberId: req.params.memberId, paidAmount: 0, status: 'pendiente' });
    res.status(201).json(c);
  }),
);

accountingRouter.put(
  '/fees/charges/:id',
  ah(async (req, res) => {
    const c = await chargeWithMember(req.params.id);
    assertCan(req, 'fees', 'edit', c.member?.unitId ?? null);
    if (c.status === 'anulado') throw badRequest('El cargo está anulado');
    const data = parse(chargeSchema.partial({ concept: true }), req.body);
    if (data.amount !== undefined && data.amount < c.paidAmount) throw badRequest('Revisá los datos', { amount: 'No puede ser menor a lo ya pagado' });
    await sequelize.transaction(async (transaction) => {
      await c.update({ amount: data.amount ?? c.amount, description: data.description ?? c.description, dueDate: data.dueDate ?? c.dueDate }, { transaction });
      await refreshCharge(c.id, transaction);
    });
    res.json({ ok: true });
  }),
);

accountingRouter.post(
  '/fees/charges/:id/void',
  ah(async (req, res) => {
    const c = await chargeWithMember(req.params.id);
    assertCan(req, 'fees', 'edit', c.member?.unitId ?? null);
    if (c.paidAmount > 0) throw badRequest('Tiene pagos imputados: anulá primero el pago');
    await c.update({ status: 'anulado' });
    res.json({ ok: true });
  }),
);

accountingRouter.post(
  '/fees/members/:memberId/payments',
  authorize('fees', 'create', memberUnit),
  ah(async (req, res) => {
    const data = parse(paymentSchema, req.body);
    const member = await Member.findByPk(req.params.memberId, { attributes: ['id', 'firstName', 'lastName', 'unitId'] });
    if (!member) throw notFound();
    if (!(await Account.findByPk(data.accountId))) throw badRequest('Revisá los datos', { accountId: 'Cuenta inexistente' });
    const result = await sequelize.transaction(async (transaction) => {
      await assertOpen(data.date, transaction);
      const where: Record<string, unknown> = { memberId: member.id, status: { [Op.in]: ['pendiente', 'parcial'] } };
      if (data.chargeIds.length) where.id = data.chargeIds;
      const charges = await Charge.findAll({ where, order: [['dueDate', 'ASC'], ['createdAt', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      if (data.chargeIds.length && charges.length !== new Set(data.chargeIds).size) throw badRequest('Hay cargos que no son de este protagonista o ya están pagos');
      const pending = round2(charges.reduce((s, c) => s + (c.amount - c.paidAmount), 0));
      if (!charges.length) throw badRequest('No tiene cargos pendientes: primero cargá el cargo (cuota, afiliación u otro)');
      if (data.amount > pending + 0.001) throw badRequest('Revisá los datos', { amount: `Supera lo pendiente de los cargos elegidos ($ ${pending.toFixed(2).replace('.', ',')})` });

      const receiptNumber = await nextReceiptNumber(Number(data.date.slice(0, 4)), transaction);
      const payment = await Payment.create(
        { memberId: member.id, date: data.date, amount: data.amount, method: data.method, accountId: data.accountId, receiptNumber, payerName: data.payerName, notes: data.notes },
        { transaction },
      );
      // Imputación: a los cargos más viejos primero (o a los elegidos, en ese orden)
      let rest = data.amount;
      const groups = new Map<string, { concept: ChargeConcept; campId: string | null; amount: number; labels: string[] }>();
      for (const c of charges) {
        if (rest <= 0.001) break;
        const part = round2(Math.min(rest, c.amount - c.paidAmount));
        if (part <= 0) continue;
        await PaymentAllocation.create({ paymentId: payment.id, chargeId: c.id, amount: part }, { transaction });
        await refreshCharge(c.id, transaction);
        rest = round2(rest - part);
        const key = `${c.concept}|${c.campId ?? ''}`;
        const g = groups.get(key) ?? { concept: c.concept, campId: c.campId, amount: 0, labels: [] };
        g.amount = round2(g.amount + part);
        g.labels.push(c.description ?? CHARGE_CONCEPT_LABELS[c.concept]);
        groups.set(key, g);
      }
      // Ingresos en contabilidad: uno por concepto (así el presupuesto y el resultado de cada campamento cierran)
      const cats = await Category.findAll({ where: { code: Object.values(CHARGE_CONCEPT_CATEGORY) }, transaction });
      for (const g of groups.values()) {
        const cat = cats.find((x) => x.code === CHARGE_CONCEPT_CATEGORY[g.concept]);
        await Movement.create(
          {
            date: data.date,
            kind: 'ingreso',
            accountId: data.accountId,
            categoryId: cat?.id ?? null,
            amount: g.amount,
            description: `${receiptNumber} · ${member.lastName}, ${member.firstName} · ${g.labels.join(', ')}`.slice(0, 300),
            campId: g.campId,
            paymentId: payment.id,
            createdByUserId: currentContext().userId,
          },
          { transaction },
        );
      }
      return payment;
    });
    res.status(201).json({ id: result.id, receiptNumber: result.receiptNumber });
  }),
);

accountingRouter.post(
  '/fees/payments/:id/void',
  ah(async (req, res) => {
    const payment = await Payment.findByPk(req.params.id, { include: [{ model: Member, as: 'member', attributes: ['unitId'] }] });
    if (!payment) throw notFound();
    assertCan(req, 'fees', 'delete', payment.member?.unitId ?? null);
    if (payment.voided) throw badRequest('El pago ya está anulado');
    const data = parse(voidSchema, req.body ?? {});
    const date = data.date ?? todayIso();
    await sequelize.transaction(async (transaction) => {
      const allocations = await PaymentAllocation.findAll({ where: { paymentId: payment.id }, transaction });
      await payment.update({ voided: true, voidedAt: new Date() }, { transaction });
      for (const a of allocations) await refreshCharge(a.chargeId, transaction);
      const movements = await Movement.findAll({ where: { paymentId: payment.id, voided: false, reversesId: null }, transaction });
      for (const m of movements) await reverseMovement(m, date, `pago ${payment.receiptNumber} anulado${data.reason ? `: ${data.reason}` : ''}`, transaction);
    });
    res.json({ ok: true });
  }),
);

/** Datos del recibo para imprimir. */
accountingRouter.get(
  '/fees/payments/:id',
  ah(async (req, res) => {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'unitId', 'dni'], include: [{ model: Unit, as: 'unit', attributes: ['id', 'code', 'name', 'branch'] }] },
        { model: Account, as: 'account', attributes: ['id', 'name'] },
        { model: PaymentAllocation, as: 'allocations', include: [{ model: Charge, as: 'charge', attributes: ['id', 'concept', 'period', 'description'] }] },
      ],
    });
    if (!payment) throw notFound();
    assertCan(req, 'fees', 'view', payment.member?.unitId ?? null);
    res.json(payment);
  }),
);

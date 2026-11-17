import { Router, type Request } from 'express';
import { Op, QueryTypes, type Transaction } from 'sequelize';
import {
  ACTIVE_LOAN_STATUSES,
  BAD_CONDITIONS,
  can,
  formatDate,
  isLoanOverdue,
  ITEM_CONDITION_LABELS,
  itemCategorySchema,
  itemLocationSchema,
  itemSchema,
  loanReturnSchema,
  loanSchema,
  todayIso,
  type ItemCondition,
} from '../shared';
import { sequelize } from '../db';
import { Adult, Unit, User } from '../models';
import { Item, ItemCategory, ItemLocation, Loan, LoanItem } from '../models/operations';
import { writeAudit } from '../lib/audit';
import { sendCsv, toCsv } from '../lib/csv';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';

/** Etapa 7: inventario y préstamos. */
export const inventoryRouter = Router();

const unitAttrs = ['id', 'name', 'code', 'branch'];
const itemInclude = [
  { model: ItemCategory, as: 'category', attributes: ['id', 'name'] },
  { model: ItemLocation, as: 'location', attributes: ['id', 'name'] },
  { model: Unit, as: 'unit', attributes: unitAttrs },
];

/** Cantidad comprometida por bien: lo autorizado y lo entregado que todavía no volvió. */
async function committedByItem(itemIds?: string[], excludeLoanId?: string, transaction?: Transaction): Promise<Map<string, number>> {
  const rows = await sequelize.query<{ item_id: string; n: number }>(
    `SELECT li.item_id, COALESCE(SUM(li.quantity), 0)::int AS n
     FROM loan_items li JOIN loans l ON l.id = li.loan_id AND l.deleted_at IS NULL
     WHERE l.status IN (:statuses) ${itemIds ? 'AND li.item_id IN (:itemIds)' : ''} ${excludeLoanId ? 'AND l.id <> :excludeLoanId' : ''}
     GROUP BY li.item_id`,
    {
      type: QueryTypes.SELECT,
      replacements: { statuses: ACTIVE_LOAN_STATUSES, itemIds: itemIds?.length ? itemIds : ['00000000-0000-0000-0000-000000000000'], excludeLoanId },
      transaction,
    },
  );
  return new Map(rows.map((r) => [r.item_id, r.n]));
}

function serializeItem(item: Item, committed: Map<string, number>) {
  const out = committed.get(item.id) ?? 0;
  return {
    ...(item.toJSON() as object),
    purchaseValue: item.purchaseValue === null || item.purchaseValue === undefined ? null : Number(item.purchaseValue),
    committed: out,
    available: Math.max(0, item.quantity - out),
  };
}

const itemUnit = async (req: Request) => (await Item.findByPk(req.params.id, { attributes: ['unitId'] }))?.unitId;

// ---------------- Catálogos ----------------
inventoryRouter.get(
  '/catalogs',
  authorize('inventory', 'view'),
  ah(async (_req, res) => {
    const [categories, locations] = await Promise.all([
      ItemCategory.findAll({ order: [['sortOrder', 'ASC'], ['name', 'ASC']] }),
      ItemLocation.findAll({ order: [['name', 'ASC']] }),
    ]);
    res.json({ categories, locations });
  }),
);

inventoryRouter.post(
  '/categories',
  ah(async (req, res) => {
    assertCan(req, 'inventory', 'edit', null);
    res.status(201).json(await ItemCategory.create(parse(itemCategorySchema, req.body)));
  }),
);
inventoryRouter.put(
  '/categories/:id',
  ah(async (req, res) => {
    assertCan(req, 'inventory', 'edit', null);
    const c = await ItemCategory.findByPk(req.params.id);
    if (!c) throw notFound();
    await c.update(parse(itemCategorySchema, req.body));
    res.json(c);
  }),
);
inventoryRouter.post(
  '/locations',
  ah(async (req, res) => {
    assertCan(req, 'inventory', 'edit', null);
    res.status(201).json(await ItemLocation.create(parse(itemLocationSchema, req.body)));
  }),
);
inventoryRouter.put(
  '/locations/:id',
  ah(async (req, res) => {
    assertCan(req, 'inventory', 'edit', null);
    const l = await ItemLocation.findByPk(req.params.id);
    if (!l) throw notFound();
    await l.update(parse(itemLocationSchema, req.body));
    res.json(l);
  }),
);

// ---------------- Bienes ----------------
function itemWhere(req: Request) {
  const where: Record<string | symbol, unknown> = {};
  const q = String(req.query.q ?? '').trim();
  if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { notes: { [Op.iLike]: `%${q}%` } }];
  if (req.query.categoryId) where.categoryId = String(req.query.categoryId);
  if (req.query.locationId) where.locationId = String(req.query.locationId);
  if (req.query.condition) where.condition = String(req.query.condition);
  const unit = String(req.query.unitId ?? '');
  if (unit === 'grupo') where.unitId = null;
  else if (unit) where.unitId = unit;
  return where;
}

inventoryRouter.get(
  '/items',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const items = await Item.findAll({ where: itemWhere(req), include: itemInclude, order: [['name', 'ASC']] });
    const committed = await committedByItem(items.map((i) => i.id));
    res.json(
      items.map((i) => ({
        ...serializeItem(i, committed),
        canEdit: can(req.auth, 'inventory', 'edit', i.unitId),
        canDelete: can(req.auth, 'inventory', 'delete', i.unitId),
      })),
    );
  }),
);

inventoryRouter.get(
  '/items/export',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const items = await Item.findAll({ where: itemWhere(req), include: itemInclude, order: [['name', 'ASC']] });
    const committed = await committedByItem(items.map((i) => i.id));
    const csv = toCsv(
      ['nombre', 'categoria', 'cantidad', 'prestados', 'disponibles', 'estado', 'ubicacion', 'unidad', 'fecha_compra', 'valor_compra', 'notas'],
      items.map((i) => {
        const s = serializeItem(i, committed);
        return [
          i.name,
          i.category?.name,
          i.quantity,
          s.committed,
          s.available,
          ITEM_CONDITION_LABELS[i.condition as ItemCondition] ?? i.condition,
          i.location?.name,
          i.unit?.name ?? 'Grupo',
          formatDate(i.purchaseDate),
          s.purchaseValue ?? '',
          i.notes,
        ];
      }),
    );
    await writeAudit({ action: 'export', entity: 'Item', summary: `Exportación de ${items.length} bienes del inventario` });
    sendCsv(res, `inventario-${todayIso()}.csv`, csv);
  }),
);

inventoryRouter.get(
  '/items/:id',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const item = await Item.findByPk(req.params.id, { include: itemInclude });
    if (!item) throw notFound();
    const committed = await committedByItem([item.id]);
    const history = await LoanItem.findAll({
      where: { itemId: item.id },
      include: [
        {
          model: Loan,
          as: 'loan',
          required: true,
          include: [{ model: Adult, as: 'borrower', attributes: ['id', 'firstName', 'lastName', 'totem'] }],
        },
      ],
      order: [[{ model: Loan, as: 'loan' }, 'outDate', 'DESC']],
      limit: 50,
    });
    const today = todayIso();
    res.json({
      ...serializeItem(item, committed),
      canEdit: can(req.auth, 'inventory', 'edit', item.unitId),
      canDelete: can(req.auth, 'inventory', 'delete', item.unitId),
      loans: history.map((h) => ({
        loanId: h.loan!.id,
        quantity: h.quantity,
        status: h.loan!.status,
        overdue: isLoanOverdue(h.loan!, today),
        purpose: h.loan!.purpose,
        borrower: h.loan!.borrower ? `${h.loan!.borrower.firstName} ${h.loan!.borrower.lastName}` : h.loan!.borrowerName,
        outDate: h.loan!.outDate,
        dueDate: h.loan!.dueDate,
        returnedAt: h.loan!.returnedAt,
        returnCondition: h.returnCondition,
        returnNotes: h.returnNotes,
      })),
    });
  }),
);

async function checkCatalog(data: { categoryId: string; locationId: string | null; unitId: string | null }) {
  if (!(await ItemCategory.findByPk(data.categoryId))) throw badRequest('Revisá los datos', { categoryId: 'Categoría inexistente' });
  if (data.locationId && !(await ItemLocation.findByPk(data.locationId))) throw badRequest('Revisá los datos', { locationId: 'Ubicación inexistente' });
  if (data.unitId && !(await Unit.findByPk(data.unitId))) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
}

inventoryRouter.post(
  '/items',
  ah(async (req, res) => {
    const data = parse(itemSchema, req.body);
    // Bien de una unidad: lo puede cargar esa unidad; bien del Grupo: quien tiene el permiso para todo el Grupo
    assertCan(req, 'inventory', 'create', data.unitId);
    await checkCatalog(data);
    const item = await Item.create(data);
    res.status(201).json(item);
  }),
);

inventoryRouter.put(
  '/items/:id',
  authorize('inventory', 'edit', itemUnit),
  ah(async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    if (!item) throw notFound();
    const data = parse(itemSchema, req.body);
    if (data.unitId !== item.unitId) assertCan(req, 'inventory', 'create', data.unitId);
    await checkCatalog(data);
    const committed = (await committedByItem([item.id])).get(item.id) ?? 0;
    if (data.quantity < committed) {
      throw badRequest('Revisá los datos', { quantity: `Hay ${committed} prestados: la cantidad no puede ser menor` });
    }
    await item.update(data);
    res.json(item);
  }),
);

inventoryRouter.delete(
  '/items/:id',
  authorize('inventory', 'delete', itemUnit),
  ah(async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    if (!item) throw notFound();
    if ((await committedByItem([item.id])).get(item.id)) throw badRequest('El bien está prestado: registrá la devolución antes de eliminarlo.');
    await item.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Préstamos ----------------
const loanInclude = [
  { model: Adult, as: 'borrower', attributes: ['id', 'firstName', 'lastName', 'totem'] },
  { model: Unit, as: 'unit', attributes: unitAttrs },
  { model: User, as: 'approvedBy', attributes: ['id', 'name'] },
  { model: User, as: 'createdBy', attributes: ['id', 'name'] },
  {
    model: LoanItem,
    as: 'loanItems',
    include: [{ model: Item, as: 'item', attributes: ['id', 'name', 'unitId', 'condition', 'quantity'], paranoid: false }],
  },
];

/** Quien autoriza, entrega y recibe: tiene "Aprobar" en inventario para la unidad dueña de cada bien. */
const canManage = (req: Request, loan: Loan) =>
  (loan.loanItems ?? []).length > 0 && (loan.loanItems ?? []).every((li) => can(req.auth, 'inventory', 'approve', li.item?.unitId ?? null));

function serializeLoan(req: Request, loan: Loan, today: string) {
  const manage = canManage(req, loan);
  const mine = loan.createdByUserId === req.user?.id;
  return {
    ...(loan.toJSON() as object),
    borrowerLabel: loan.borrower ? `${loan.borrower.firstName} ${loan.borrower.lastName}` : loan.borrowerName,
    overdue: isLoanOverdue(loan, today),
    canManage: manage,
    canEdit: loan.status === 'pedido' && (manage || mine),
    canCancel: (loan.status === 'pedido' && (manage || mine)) || (loan.status === 'autorizado' && manage),
  };
}

inventoryRouter.get(
  '/loans',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const today = todayIso();
    const where: Record<string | symbol, unknown> = {};
    const status = String(req.query.status ?? 'activos');
    if (status === 'activos') where.status = { [Op.in]: ['pedido', 'autorizado', 'entregado'] };
    else if (status === 'vencidos') Object.assign(where, { status: { [Op.in]: ACTIVE_LOAN_STATUSES }, dueDate: { [Op.lt]: today } });
    else if (status !== 'todos') where.status = status;
    const q = String(req.query.q ?? '').trim();
    if (q) where[Op.or] = [{ purpose: { [Op.iLike]: `%${q}%` } }, { borrowerName: { [Op.iLike]: `%${q}%` } }];
    if (req.query.campId) where.campId = String(req.query.campId);
    if (req.query.activitySheetId) where.activitySheetId = String(req.query.activitySheetId);
    const loans = await Loan.findAll({ where, include: loanInclude, order: [['outDate', 'DESC'], ['createdAt', 'DESC']] });
    res.json(loans.map((l) => serializeLoan(req, l, today)));
  }),
);

inventoryRouter.get(
  '/loans/:id',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const loan = await Loan.findByPk(req.params.id, { include: loanInclude });
    if (!loan) throw notFound();
    res.json(serializeLoan(req, loan, todayIso()));
  }),
);

/** Valida los ítems pedidos contra lo disponible (sin contar este mismo préstamo). */
async function checkItems(items: { itemId: string; quantity: number }[], excludeLoanId?: string, transaction?: Transaction) {
  const ids = [...new Set(items.map((i) => i.itemId))];
  if (ids.length !== items.length) throw badRequest('Revisá los datos', { items: 'Hay bienes repetidos en la lista' });
  const found = await Item.findAll({ where: { id: ids }, transaction });
  const committed = await committedByItem(ids, excludeLoanId, transaction);
  for (const it of items) {
    const item = found.find((f) => f.id === it.itemId);
    if (!item) throw badRequest('Revisá los datos', { items: 'Hay un bien que no existe' });
    const available = item.quantity - (committed.get(item.id) ?? 0);
    if (it.quantity > available) {
      const n = Math.max(0, available);
      throw badRequest('Revisá los datos', { items: `"${item.name}": pediste ${it.quantity} y hay ${n} disponible${n === 1 ? '' : 's'}` });
    }
  }
  return found;
}

async function checkLoanRefs(data: { borrowerAdultId: string | null; unitId: string | null }) {
  if (data.borrowerAdultId && !(await Adult.findByPk(data.borrowerAdultId))) throw badRequest('Revisá los datos', { borrowerAdultId: 'Adulto inexistente' });
  if (data.unitId && !(await Unit.findByPk(data.unitId))) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
}

inventoryRouter.post(
  '/loans',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    // Cualquiera que ve el inventario puede pedir un préstamo; lo autoriza Intendencia (o quien tenga "Aprobar")
    const data = parse(loanSchema, req.body);
    await checkLoanRefs(data);
    const loan = await sequelize.transaction(async (transaction) => {
      await checkItems(data.items, undefined, transaction);
      const l = await Loan.create(
        {
          borrowerAdultId: data.borrowerAdultId,
          borrowerName: data.borrowerAdultId ? null : data.borrowerName,
          purpose: data.purpose,
          unitId: data.unitId,
          activitySheetId: data.activitySheetId,
          campId: data.campId,
          outDate: data.outDate,
          dueDate: data.dueDate,
          returnedAt: null,
          status: 'pedido',
          approvedByUserId: null,
          approvedAt: null,
          deliveredAt: null,
          returnNotes: null,
          notes: data.notes,
          createdByUserId: req.user!.id,
        },
        { transaction },
      );
      for (const it of data.items) await LoanItem.create({ loanId: l.id, itemId: it.itemId, quantity: it.quantity, returnCondition: null, returnNotes: null }, { transaction });
      return l;
    });
    const full = await Loan.findByPk(loan.id, { include: loanInclude });
    res.status(201).json(serializeLoan(req, full!, todayIso()));
  }),
);

async function loadLoan(id: string) {
  const loan = await Loan.findByPk(id, { include: loanInclude });
  if (!loan) throw notFound();
  return loan;
}

inventoryRouter.put(
  '/loans/:id',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const loan = await loadLoan(req.params.id);
    const s = serializeLoan(req, loan, todayIso());
    if (!s.canEdit) throw forbidden(loan.status === 'pedido' ? 'No podés editar este préstamo' : 'Solo se edita mientras está pedido');
    const data = parse(loanSchema, req.body);
    await checkLoanRefs(data);
    await sequelize.transaction(async (transaction) => {
      await checkItems(data.items, loan.id, transaction);
      await loan.update(
        {
          borrowerAdultId: data.borrowerAdultId,
          borrowerName: data.borrowerAdultId ? null : data.borrowerName,
          purpose: data.purpose,
          unitId: data.unitId,
          activitySheetId: data.activitySheetId,
          campId: data.campId,
          outDate: data.outDate,
          dueDate: data.dueDate,
          notes: data.notes,
        },
        { transaction },
      );
      for (const li of loan.loanItems ?? []) await li.destroy({ transaction });
      for (const it of data.items) await LoanItem.create({ loanId: loan.id, itemId: it.itemId, quantity: it.quantity, returnCondition: null, returnNotes: null }, { transaction });
    });
    res.json(serializeLoan(req, await loadLoan(loan.id), todayIso()));
  }),
);

async function transition(req: Request, id: string, apply: (loan: Loan, transaction: Transaction) => Promise<void>) {
  const loan = await loadLoan(id);
  if (!canManage(req, loan)) throw forbidden('Solo Intendencia (o quien tenga permiso de aprobar en inventario) puede hacer esto');
  await sequelize.transaction((transaction) => apply(loan, transaction));
  return serializeLoan(req, await loadLoan(loan.id), todayIso());
}

const items = (loan: Loan) => (loan.loanItems ?? []).map((li) => ({ itemId: li.itemId, quantity: li.quantity }));

inventoryRouter.post(
  '/loans/:id/authorize',
  ah(async (req, res) => {
    res.json(
      await transition(req, req.params.id, async (loan, transaction) => {
        if (loan.status !== 'pedido') throw badRequest('Solo se autoriza un préstamo pedido');
        await checkItems(items(loan), loan.id, transaction);
        await loan.update({ status: 'autorizado', approvedByUserId: req.user!.id, approvedAt: new Date() }, { transaction });
      }),
    );
  }),
);

inventoryRouter.post(
  '/loans/:id/deliver',
  ah(async (req, res) => {
    res.json(
      await transition(req, req.params.id, async (loan, transaction) => {
        if (loan.status !== 'pedido' && loan.status !== 'autorizado') throw badRequest('Este préstamo no se puede entregar');
        if (loan.status === 'pedido') await checkItems(items(loan), loan.id, transaction);
        await loan.update(
          {
            status: 'entregado',
            deliveredAt: new Date(),
            ...(loan.approvedByUserId ? {} : { approvedByUserId: req.user!.id, approvedAt: new Date() }),
          },
          { transaction },
        );
      }),
    );
  }),
);

inventoryRouter.post(
  '/loans/:id/return',
  ah(async (req, res) => {
    const data = parse(loanReturnSchema, req.body);
    res.json(
      await transition(req, req.params.id, async (loan, transaction) => {
        if (loan.status !== 'entregado' && loan.status !== 'autorizado') throw badRequest('Este préstamo no está afuera');
        for (const li of loan.loanItems ?? []) {
          const r = data.items.find((x) => x.loanItemId === li.id);
          const condition = r?.returnCondition ?? (li.item?.condition as ItemCondition) ?? 'bueno';
          await li.update({ returnCondition: condition, returnNotes: r?.returnNotes ?? null }, { transaction });
          if (data.updateItemCondition && li.item && li.item.condition !== condition) {
            const item = await Item.findByPk(li.itemId, { transaction });
            if (item) await item.update({ condition }, { transaction });
          }
        }
        await loan.update({ status: 'devuelto', returnedAt: data.returnedAt, returnNotes: data.returnNotes }, { transaction });
      }),
    );
  }),
);

inventoryRouter.post(
  '/loans/:id/cancel',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const loan = await loadLoan(req.params.id);
    if (!serializeLoan(req, loan, todayIso()).canCancel) throw forbidden('No podés cancelar este préstamo');
    await loan.update({ status: 'cancelado' });
    res.json(serializeLoan(req, await loadLoan(loan.id), todayIso()));
  }),
);

// ---------------- Alertas ----------------
inventoryRouter.get(
  '/alerts',
  authorize('inventory', 'view'),
  ah(async (req, res) => {
    const today = todayIso();
    const [overdue, bad] = await Promise.all([
      Loan.findAll({
        where: { status: { [Op.in]: ACTIVE_LOAN_STATUSES }, dueDate: { [Op.lt]: today } },
        include: loanInclude,
        order: [['dueDate', 'ASC']],
      }),
      Item.findAll({ where: { condition: { [Op.in]: BAD_CONDITIONS } }, include: itemInclude, order: [['name', 'ASC']] }),
    ]);
    res.json({
      overdueLoans: overdue.map((l) => serializeLoan(req, l, today)),
      badItems: bad.map((i) => ({ id: i.id, name: i.name, condition: i.condition, quantity: i.quantity, unit: i.unit, location: i.location })),
    });
  }),
);

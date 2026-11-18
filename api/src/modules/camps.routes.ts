/**
 * Etapa 6: campamentos, acantonamientos y salidas de unidad.
 * Inscripción (con su cargo en la cuenta corriente del protagonista), legajo con semáforo, presupuesto por rubro
 * vs. real (movimientos con campId), logística (menú, compras, transporte, materiales) y catálogo de lugares de acampe.
 * Permisos por la unidad organizadora (sin unidad = del Grupo: solo permisos de todo el Grupo).
 */
import { Router, type Request } from 'express';
import { Op, QueryTypes, type Transaction as SqlTx } from 'sequelize';
import {
  BRANCH_INFO,
  BRANCHES,
  CAMP_RUBROS,
  CAMP_TYPE_LABELS,
  campBudgetLineSchema,
  campMenuSchema,
  campNights,
  campRenderSchema,
  campSchema,
  campShoppingSchema,
  campSiteSchema,
  can,
  documentStatus,
  enrollmentSchema,
  formatDate,
  enrollSchema,
  round2,
  unitsWith,
  type Branch,
  type CampType,
} from '../shared';
import { sequelize } from '../db';
import { Adult, DocumentType, Member, MemberDocument, SmallGroup, Unit, User } from '../models';
import {
  Account,
  Camp,
  CampBudgetLine,
  CampEnrollment,
  CampMenuItem,
  CampShoppingItem,
  CampSite,
  CampUnit,
  Category,
  Charge,
  GroupEvent,
  Movement,
} from '../models/treasury';
import { writeAudit } from '../lib/audit';
import { notifyReferents } from '../lib/notify';
import { currentContext } from '../lib/context';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { campProgram } from '../lib/campProgram';
import { assertCan, authorize } from '../middlewares/auth';

export const campsRouter = Router();

const adultAttrs = ['id', 'firstName', 'lastName', 'totem'];
const unitAttrs = ['id', 'code', 'name', 'branch'];

async function loadCamp(id: string) {
  const camp = await Camp.findByPk(id, { include: [{ model: CampUnit, as: 'campUnits', attributes: ['unitId'] }] });
  if (!camp) throw notFound('Campamento inexistente');
  return camp;
}
const campUnitIds = (c: Camp) => (c.campUnits ?? []).map((u) => u.unitId);

/** ¿Lo puede ver? Por la unidad organizadora o por alguna unidad participante. */
function canViewCamp(req: Request, camp: Camp) {
  return can(req.auth, 'camps', 'view', camp.ownerUnitId) || campUnitIds(camp).some((u) => can(req.auth, 'camps', 'view', u));
}
function assertCampPerm(req: Request, camp: Camp, action: 'edit' | 'delete' | 'approve') {
  if (!can(req.auth, 'camps', action, camp.ownerUnitId)) throw forbidden();
}
const campOwner = async (req: Request) => (await Camp.findByPk(req.params.id, { attributes: ['ownerUnitId'] }))?.ownerUnitId;

/** Costo neto de una inscripción. */
const netCost = (cost: number, discountPct: number) => round2(cost * (1 - discountPct / 100));

/** Crea/actualiza/anula el cargo de campamento de una inscripción. */
async function syncCharge(enr: CampEnrollment, camp: Camp, transaction: SqlTx) {
  if (!enr.memberId) return;
  const amount = netCost(enr.cost, enr.discountPct);
  const charge = enr.chargeId ? await Charge.findByPk(enr.chargeId, { transaction }) : null;
  if (charge && charge.status !== 'anulado') {
    if (amount < charge.paidAmount - 0.001) throw badRequest('El costo no puede quedar por debajo de lo que ya pagó');
    if (amount <= 0) {
      if (charge.paidAmount > 0) throw badRequest('Ya tiene pagos: no se puede dejar en $ 0');
      await charge.update({ status: 'anulado' }, { transaction });
      return;
    }
    const status = charge.paidAmount >= amount - 0.001 ? 'pagado' : charge.paidAmount > 0 ? 'parcial' : 'pendiente';
    await charge.update({ amount, status, description: `Campamento: ${camp.name}`, dueDate: camp.startDate }, { transaction });
    return;
  }
  if (amount <= 0) return;
  const created = await Charge.create(
    { memberId: enr.memberId, concept: 'campamento', campId: camp.id, period: null, description: `Campamento: ${camp.name}`, amount, paidAmount: 0, dueDate: camp.startDate, status: 'pendiente' },
    { transaction },
  );
  await enr.update({ chargeId: created.id }, { transaction });
}

// ===================================================================
// Feed para calendario y progresión (datos no sensibles)
// ===================================================================
campsRouter.get(
  '/feed',
  ah(async (req, res) => {
    const from = String(req.query.from || `${new Date().getFullYear()}-01-01`);
    const to = String(req.query.to || `${new Date().getFullYear()}-12-31`);
    const camps = await Camp.findAll({
      where: { startDate: { [Op.lte]: to }, endDate: { [Op.gte]: from } },
      include: [{ model: CampUnit, as: 'campUnits', attributes: ['unitId'] }, { model: CampSite, as: 'site', attributes: ['id', 'name'] }],
      order: [['startDate', 'ASC']],
    });
    const events = await GroupEvent.findAll({ where: { date: { [Op.between]: [from, to] } }, attributes: ['id', 'name', 'type', 'date', 'place', 'status'], order: [['date', 'ASC']] });
    res.json({
      camps: camps.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        nights: campNights(c.startDate, c.endDate),
        status: c.status,
        place: c.site?.name ?? c.place,
        ownerUnitId: c.ownerUnitId,
        unitIds: [...new Set([...(c.ownerUnitId ? [c.ownerUnitId] : []), ...campUnitIds(c)])],
      })),
      events,
    });
  }),
);

// ===================================================================
// Lugares de acampe
// ===================================================================
campsRouter.get(
  '/sites',
  authorize('camps', 'view'),
  ah(async (_req, res) => {
    const sites = await CampSite.findAll({ order: [['name', 'ASC']] });
    const stats = await sequelize.query<{ camp_site_id: string; n: number; rating: string | null; last: string | null }>(
      `SELECT camp_site_id, COUNT(*)::int AS n, AVG(site_rating) AS rating, MAX(start_date)::text AS last
       FROM camps WHERE deleted_at IS NULL AND camp_site_id IS NOT NULL GROUP BY camp_site_id`,
      { type: QueryTypes.SELECT },
    );
    res.json(
      sites.map((s) => {
        const st = stats.find((x) => x.camp_site_id === s.id);
        return { ...s.toJSON(), camps: st?.n ?? 0, rating: st?.rating ? Math.round(Number(st.rating) * 10) / 10 : null, lastUsed: st?.last ?? null };
      }),
    );
  }),
);
campsRouter.get(
  '/sites/:sid',
  authorize('camps', 'view'),
  ah(async (req, res) => {
    const site = await CampSite.findByPk(req.params.sid);
    if (!site) throw notFound();
    const camps = await Camp.findAll({
      where: { campSiteId: site.id },
      attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'status', 'siteRating', 'siteReview', 'ownerUnitId'],
      include: [{ model: Unit, as: 'ownerUnit', attributes: unitAttrs }],
      order: [['startDate', 'DESC']],
    });
    res.json({ ...site.toJSON(), history: camps });
  }),
);
campsRouter.post(
  '/sites',
  authorize('camps', 'create'),
  ah(async (req, res) => {
    res.status(201).json(await CampSite.create(parse(campSiteSchema, req.body)));
  }),
);
campsRouter.put(
  '/sites/:sid',
  authorize('camps', 'edit'),
  ah(async (req, res) => {
    const s = await CampSite.findByPk(req.params.sid);
    if (!s) throw notFound();
    await s.update(parse(campSiteSchema, req.body));
    res.json(s);
  }),
);
campsRouter.delete(
  '/sites/:sid',
  authorize('camps', 'delete'),
  ah(async (req, res) => {
    const s = await CampSite.findByPk(req.params.sid);
    if (!s) throw notFound();
    if (await Camp.count({ where: { campSiteId: s.id } })) throw badRequest('Hay campamentos en ese lugar: no se puede eliminar');
    await s.destroy();
    res.json({ ok: true });
  }),
);

// ===================================================================
// Inscripciones (rutas por id de inscripción, antes de "/:id")
// ===================================================================
async function enrollmentWithCamp(req: Request) {
  const enr = await CampEnrollment.findByPk(req.params.eid);
  if (!enr) throw notFound('Inscripción inexistente');
  const camp = await loadCamp(enr.campId);
  assertCampPerm(req, camp, 'edit');
  return { enr, camp };
}
campsRouter.put(
  '/enrollments/:eid',
  ah(async (req, res) => {
    const { enr, camp } = await enrollmentWithCamp(req);
    const data = parse(enrollmentSchema, req.body);
    await sequelize.transaction(async (transaction) => {
      await enr.update(data, { transaction });
      await syncCharge(enr, camp, transaction);
    });
    res.json({ ok: true });
  }),
);
campsRouter.delete(
  '/enrollments/:eid',
  ah(async (req, res) => {
    const { enr } = await enrollmentWithCamp(req);
    await sequelize.transaction(async (transaction) => {
      if (enr.chargeId) {
        const charge = await Charge.findByPk(enr.chargeId, { transaction });
        if (charge && charge.status !== 'anulado') {
          if (charge.paidAmount > 0) throw badRequest('Ya pagó parte del campamento: anulá primero el pago desde su cuenta (Pagos)');
          await charge.update({ status: 'anulado' }, { transaction });
        }
      }
      await enr.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// ---- Presupuesto, menú y compras (por id de ítem) ----
async function itemCamp(req: Request, Model: typeof CampBudgetLine | typeof CampMenuItem | typeof CampShoppingItem) {
  const item = await (Model as typeof CampBudgetLine).findByPk(req.params.iid);
  if (!item) throw notFound();
  const camp = await loadCamp(item.campId);
  assertCampPerm(req, camp, 'edit');
  return item;
}
for (const [path, Model, schema] of [
  ['budget', CampBudgetLine, campBudgetLineSchema],
  ['menu', CampMenuItem, campMenuSchema],
  ['shopping', CampShoppingItem, campShoppingSchema],
] as const) {
  campsRouter.put(
    `/${path}/:iid`,
    ah(async (req, res) => {
      const item = await itemCamp(req, Model);
      await item.update(parse(schema, req.body));
      res.json(item);
    }),
  );
  campsRouter.delete(
    `/${path}/:iid`,
    ah(async (req, res) => {
      const item = await itemCamp(req, Model);
      await item.destroy();
      res.json({ ok: true });
    }),
  );
}

// ===================================================================
// Campamentos
// ===================================================================
campsRouter.get(
  '/',
  authorize('camps', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || 0;
    const where: Record<string, unknown> = {};
    if (year) where.startDate = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    if (req.query.status) where.status = String(req.query.status);
    const camps = await Camp.findAll({
      where,
      include: [
        { model: CampUnit, as: 'campUnits', include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] },
        { model: Unit, as: 'ownerUnit', attributes: unitAttrs },
        { model: CampSite, as: 'site', attributes: ['id', 'name'] },
        { model: Adult, as: 'responsible', attributes: adultAttrs },
      ],
      order: [['startDate', 'DESC']],
    });
    const visible = camps.filter((c) => canViewCamp(req, c));
    const counts = visible.length
      ? await sequelize.query<{ camp_id: string; members: number; adults: number }>(
          `SELECT camp_id, COUNT(member_id)::int AS members, COUNT(adult_id)::int AS adults FROM camp_enrollments
           WHERE deleted_at IS NULL AND camp_id IN (:ids) GROUP BY camp_id`,
          { type: QueryTypes.SELECT, replacements: { ids: visible.map((c) => c.id) } },
        )
      : [];
    res.json(
      visible.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        nights: campNights(c.startDate, c.endDate),
        status: c.status,
        cost: c.cost,
        ownerUnit: c.ownerUnit,
        units: (c.campUnits ?? []).map((u) => u.unit).filter(Boolean),
        place: c.site?.name ?? c.place,
        responsible: c.responsible,
        enrolled: { members: counts.find((x) => x.camp_id === c.id)?.members ?? 0, adults: counts.find((x) => x.camp_id === c.id)?.adults ?? 0 },
      })),
    );
  }),
);

/**
 * Aviso a los referentes de Programa de las ramas del campamento. Al crearlo, todas sus ramas (sin unidades, es de
 * Grupo: todas); al editarlo, solo las ramas que se sumaron.
 */
async function notifyCampReferents(req: Request, camp: Camp, unitIds: string[], previousBranches?: string[]) {
  try {
    const units = unitIds.length ? await Unit.findAll({ where: { id: unitIds }, attributes: ['id', 'name', 'branch'] }) : [];
    const branches = [...new Set(units.map((u) => u.branch))];
    const target = previousBranches ? branches.filter((b) => !previousBranches.includes(b)) : branches.length ? branches : 'all';
    if (Array.isArray(target) && !target.length) return;
    const actor = req.user!;
    const typeLabel = CAMP_TYPE_LABELS[camp.type as CampType] ?? 'Campamento';
    const dates = camp.startDate === camp.endDate ? formatDate(camp.startDate) : `del ${formatDate(camp.startDate)} al ${formatDate(camp.endDate)}`;
    const who = units.length ? units.map((u) => u.name).join(', ') : 'todo el Grupo';
    const branchLabels = Array.isArray(target) ? target.map((b) => BRANCH_INFO[b as Branch]?.label ?? b).join(', ') : null;
    await notifyReferents({ id: actor.id, name: actor.name }, target, {
      kind: 'campamento',
      title: previousBranches ? `Se sumó ${branchLabels} a «${camp.name}» (${typeLabel.toLowerCase()})` : `Se cargó «${camp.name}» (${typeLabel.toLowerCase()})`,
      body: `${dates}${camp.place ? ` · ${camp.place}` : ''} · ${who}`,
      link: `/campamentos/${camp.id}`,
      paragraphs: [
        previousBranches
          ? `${actor.name} sumó a ${branchLabels} en «${camp.name}» (${typeLabel.toLowerCase()}).`
          : `${actor.name} cargó «${camp.name}» (${typeLabel.toLowerCase()}).`,
        `Cuándo: ${dates}${camp.place ? ` · Dónde: ${camp.place}` : ''}`,
        `Participan: ${who}.`,
      ],
      button: 'Ver el campamento',
    });
  } catch (e) {
    console.error('[avisos] campamento:', (e as Error).message);
  }
}

async function setUnits(campId: string, unitIds: string[], transaction: SqlTx) {
  const current = await CampUnit.findAll({ where: { campId }, transaction });
  for (const cu of current) if (!unitIds.includes(cu.unitId)) await cu.destroy({ transaction });
  for (const u of unitIds) if (!current.some((c) => c.unitId === u)) await CampUnit.create({ campId, unitId: u }, { transaction });
}

campsRouter.post(
  '/',
  ah(async (req, res) => {
    const data = parse(campSchema, req.body);
    assertCan(req, 'camps', 'create', data.ownerUnitId);
    const unitIds = [...new Set([...(data.ownerUnitId ? [data.ownerUnitId] : []), ...data.unitIds])];
    const camp = await sequelize.transaction(async (transaction) => {
      const { unitIds: _u, ...fields } = data;
      const c = await Camp.create({ ...fields, status: 'borrador' }, { transaction });
      await setUnits(c.id, unitIds, transaction);
      return c;
    });
    void notifyCampReferents(req, camp, unitIds);
    res.status(201).json(camp);
  }),
);

campsRouter.get(
  '/:id',
  ah(async (req, res) => {
    const camp = await Camp.findByPk(req.params.id, {
      include: [
        { model: CampUnit, as: 'campUnits', include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] },
        { model: Unit, as: 'ownerUnit', attributes: unitAttrs },
        { model: CampSite, as: 'site' },
        { model: Adult, as: 'responsible', attributes: adultAttrs },
        { model: User, as: 'approvedBy', attributes: ['id', 'name'] },
      ],
    });
    if (!camp) throw notFound();
    if (!canViewCamp(req, camp)) throw forbidden();
    const [enrollments, budgetLines, menu, shopping] = await Promise.all([
      CampEnrollment.findAll({
        where: { campId: camp.id },
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'firstName', 'lastName', 'dni', 'unitId', 'birthDate'],
            include: [
              { model: Unit, as: 'unit', attributes: unitAttrs },
              { model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name'] },
            ],
          },
          { model: Adult, as: 'adult', attributes: [...adultAttrs, 'dni'] },
          { model: Charge, as: 'charge', attributes: ['id', 'amount', 'paidAmount', 'status'] },
        ],
      }),
      CampBudgetLine.findAll({ where: { campId: camp.id }, order: [['rubro', 'ASC'], ['createdAt', 'ASC']] }),
      CampMenuItem.findAll({ where: { campId: camp.id }, order: [['day', 'ASC'], ['createdAt', 'ASC']] }),
      CampShoppingItem.findAll({ where: { campId: camp.id }, order: [['bought', 'ASC'], ['item', 'ASC']] }),
    ]);

    // Ficha médica: vigente a la fecha de inicio del campamento (solo si está presentada y cuándo vence)
    const fichaType = await DocumentType.findOne({ where: { code: 'ficha_medica' } });
    const memberIds = enrollments.map((e) => e.memberId).filter(Boolean) as string[];
    const fichas = fichaType && memberIds.length ? await MemberDocument.findAll({ where: { memberId: memberIds, documentTypeId: fichaType.id } }) : [];
    const legajo = enrollments
      .map((e) => {
        const ficha = e.memberId ? documentStatus(fichas.find((f) => f.memberId === e.memberId), fichaType?.hasExpiry ?? true, camp.startDate) : null;
        const fichaOk = ficha === 'ok' || ficha === 'expiring';
        const complete = e.memberId ? e.authorizationPresented && e.dniPresented && fichaOk : e.dniPresented;
        return {
          id: e.id,
          kind: e.memberId ? 'protagonista' : 'adulto',
          member: e.member,
          adult: e.adult,
          cost: e.cost,
          discountPct: e.discountPct,
          net: netCost(e.cost, e.discountPct),
          charge: e.charge ? { id: e.charge.id, amount: e.charge.amount, paid: e.charge.paidAmount, status: e.charge.status } : null,
          authorizationPresented: e.authorizationPresented,
          authorizationDate: e.authorizationDate,
          dniPresented: e.dniPresented,
          fichaMedica: ficha,
          complete,
          notes: e.notes,
        };
      })
      .sort((a, b) => {
        const na = a.member ? `${a.member.lastName} ${a.member.firstName}` : `~${a.adult?.lastName} ${a.adult?.firstName}`;
        const nb = b.member ? `${b.member.lastName} ${b.member.firstName}` : `~${b.adult?.lastName} ${b.adult?.firstName}`;
        return na.localeCompare(nb);
      });

    // Real: movimientos con campId (incluye los pagos de inscripción)
    const realRows = await sequelize.query<{ kind: string; rubro: string | null; total: string }>(
      `SELECT kind, camp_rubro AS rubro, SUM(amount) AS total FROM transactions WHERE deleted_at IS NULL AND camp_id = :id GROUP BY 1, 2`,
      { type: QueryTypes.SELECT, replacements: { id: camp.id } },
    );
    // Ingresos: sin rubro (pagos de inscripción y otros ingresos; sus anulaciones son egresos sin rubro).
    // Gastos: siempre con rubro (sus anulaciones son ingresos con el mismo rubro).
    const sumOf = (kind: string, rubro: string | null) =>
      realRows.filter((r) => r.kind === kind && r.rubro === rubro).reduce((s, r) => s + Number(r.total), 0);
    const realIncome = round2(sumOf('ingreso', null) - sumOf('egreso', null));
    const expenseBy = (rubro: string) => round2(sumOf('egreso', rubro) - sumOf('ingreso', rubro));
    const byRubro = CAMP_RUBROS.map((r) => ({
      rubro: r,
      planned: round2(budgetLines.filter((l) => l.rubro === r).reduce((s, l) => s + l.planned, 0)),
      actual: expenseBy(r),
    }));
    const realExpense = round2(byRubro.reduce((s, r) => s + r.actual, 0));
    const expected = round2(legajo.filter((l) => l.kind === 'protagonista').reduce((s, l) => s + l.net, 0));
    const collected = round2(legajo.reduce((s, l) => s + (l.charge?.paid ?? 0), 0));
    const movements = can(req.auth, 'accounting', 'view')
      ? await Movement.findAll({
          where: { campId: camp.id },
          include: [
            { model: Account, as: 'account', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
          ],
          order: [['date', 'ASC'], ['createdAt', 'ASC']],
        })
      : [];
    const u = camp.ownerUnitId;
    const program = await campProgram(req.auth, camp);
    res.json({
      ...camp.toJSON(),
      program,
      nights: campNights(camp.startDate, camp.endDate),
      units: (camp.campUnits ?? []).map((cu) => (cu as unknown as { unit: Unit }).unit).filter(Boolean),
      legajo,
      budgetLines,
      byRubro,
      menu,
      shopping,
      movements,
      totals: {
        planned: round2(byRubro.reduce((s, r) => s + r.planned, 0)),
        realExpense,
        realIncome,
        expectedIncome: expected,
        collected,
        resultado: round2(realIncome - realExpense),
        participants: legajo.length,
        incomplete: legajo.filter((l) => !l.complete).length,
      },
      canEdit: can(req.auth, 'camps', 'edit', u),
      canDelete: can(req.auth, 'camps', 'delete', u),
      canApprove: can(req.auth, 'camps', 'approve', u),
      canRecord: can(req.auth, 'accounting', 'create'),
    });
  }),
);

campsRouter.put(
  '/:id',
  authorize('camps', 'edit', campOwner),
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    const data = parse(campSchema, req.body);
    if (data.ownerUnitId !== camp.ownerUnitId) assertCan(req, 'camps', 'edit', data.ownerUnitId);
    if (camp.status === 'rendido') throw badRequest('El campamento ya está rendido');
    const oldCost = camp.cost;
    const oldUnitIds = [...new Set([...(camp.ownerUnitId ? [camp.ownerUnitId] : []), ...campUnitIds(camp)])];
    const newUnitIds = [...new Set([...(data.ownerUnitId ? [data.ownerUnitId] : []), ...data.unitIds])];
    await sequelize.transaction(async (transaction) => {
      const { unitIds, ...fields } = data;
      await camp.update(fields, { transaction });
      await setUnits(camp.id, [...new Set([...(data.ownerUnitId ? [data.ownerUnitId] : []), ...unitIds])], transaction);
      // Si cambió el costo, se actualiza a los inscriptos que tenían el costo anterior (y sus cargos)
      if (Math.abs(oldCost - data.cost) > 0.001) {
        const enrs = await CampEnrollment.findAll({ where: { campId: camp.id, memberId: { [Op.ne]: null } }, transaction });
        for (const e of enrs) {
          if (Math.abs(e.cost - oldCost) > 0.001) continue;
          await e.update({ cost: data.cost }, { transaction });
          await syncCharge(e, camp, transaction);
        }
      } else {
        // Nombre o fecha: se refleja en los cargos
        const enrs = await CampEnrollment.findAll({ where: { campId: camp.id, chargeId: { [Op.ne]: null } }, transaction });
        for (const e of enrs) await syncCharge(e, camp, transaction);
      }
    });
    // Si se sumó una unidad de otra rama, se avisa a los referentes de esa rama (sin unidades era de Grupo: ya sabían)
    if (newUnitIds.some((u) => !oldUnitIds.includes(u))) {
      const oldBranches = oldUnitIds.length ? (await Unit.findAll({ where: { id: oldUnitIds }, attributes: ['branch'] })).map((u) => u.branch) : [...BRANCHES];
      void notifyCampReferents(req, camp, newUnitIds, oldBranches);
    }
    res.json(camp);
  }),
);

campsRouter.delete(
  '/:id',
  authorize('camps', 'delete', campOwner),
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    if (camp.status !== 'borrador') throw badRequest('Solo se puede eliminar un campamento en borrador');
    if (await Movement.count({ where: { campId: camp.id } })) throw badRequest('Tiene movimientos en contabilidad: no se puede eliminar');
    const paid = await Charge.count({ where: { campId: camp.id, paidAmount: { [Op.gt]: 0 } } });
    if (paid) throw badRequest('Hay inscriptos con pagos: no se puede eliminar');
    await sequelize.transaction(async (transaction) => {
      await Charge.update({ status: 'anulado' }, { where: { campId: camp.id }, transaction });
      await CampEnrollment.destroy({ where: { campId: camp.id }, transaction });
      await camp.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// ---- Estados ----
campsRouter.post(
  '/:id/approve',
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    assertCampPerm(req, camp, 'approve');
    if (camp.status === 'borrador') await camp.update({ status: 'aprobado', approvedAt: new Date(), approvedByUserId: currentContext().userId });
    else if (camp.status === 'aprobado') await camp.update({ status: 'borrador', approvedAt: null, approvedByUserId: null });
    else throw badRequest('El campamento ya se realizó');
    res.json({ status: camp.status });
  }),
);
campsRouter.post(
  '/:id/done',
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    assertCampPerm(req, camp, 'edit');
    if (camp.status === 'aprobado') await camp.update({ status: 'realizado' });
    else if (camp.status === 'realizado') await camp.update({ status: 'aprobado' });
    else throw badRequest(camp.status === 'borrador' ? 'Primero tiene que estar aprobado' : 'Ya está rendido');
    res.json({ status: camp.status });
  }),
);
campsRouter.post(
  '/:id/render',
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    assertCampPerm(req, camp, 'edit');
    const data = parse(campRenderSchema, req.body);
    if (camp.status === 'rendido') {
      // Reabrir (solo quien aprueba)
      assertCampPerm(req, camp, 'approve');
      await camp.update({ status: 'realizado', renderedAt: null });
    } else {
      if (camp.status !== 'realizado') throw badRequest('Primero marcá el campamento como realizado');
      await camp.update({ ...data, status: 'rendido', renderedAt: new Date() });
    }
    res.json({ status: camp.status });
  }),
);

// ---- Inscripción ----
campsRouter.post(
  '/:id/enrollments',
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    assertCampPerm(req, camp, 'edit');
    const data = parse(enrollSchema, req.body);
    const unitIds = [...new Set([...(camp.ownerUnitId ? [camp.ownerUnitId] : []), ...campUnitIds(camp)])];
    let memberIds = data.memberIds;
    if (data.allFromUnits) {
      if (!unitIds.length) throw badRequest('El campamento no tiene unidades participantes');
      memberIds = (await Member.findAll({ where: { unitId: unitIds, status: 'activo' }, attributes: ['id'] })).map((m) => m.id);
    }
    const members = memberIds.length ? await Member.findAll({ where: { id: memberIds }, attributes: ['id', 'unitId', 'status'] }) : [];
    const adults = data.adultIds.length ? await Adult.findAll({ where: { id: data.adultIds }, attributes: ['id'] }) : [];
    const existing = await CampEnrollment.findAll({ where: { campId: camp.id }, attributes: ['memberId', 'adultId'] });
    let added = 0;
    await sequelize.transaction(async (transaction) => {
      for (const m of members) {
        if (existing.some((e) => e.memberId === m.id)) continue;
        const enr = await CampEnrollment.create({ campId: camp.id, memberId: m.id, cost: camp.cost, discountPct: 0 }, { transaction });
        await syncCharge(enr, camp, transaction);
        added++;
      }
      for (const a of adults) {
        if (existing.some((e) => e.adultId === a.id)) continue;
        await CampEnrollment.create({ campId: camp.id, adultId: a.id, cost: 0, discountPct: 0 }, { transaction });
        added++;
      }
      if (added) await writeAudit({ action: 'create', entity: 'CampEnrollment', entityId: camp.id, summary: `${added} inscriptos en ${camp.name}` }, transaction);
    });
    res.status(201).json({ added, skipped: members.length + adults.length - added });
  }),
);

// ---- Presupuesto, menú y compras ----
for (const [path, Model, schema] of [
  ['budget', CampBudgetLine, campBudgetLineSchema],
  ['menu', CampMenuItem, campMenuSchema],
  ['shopping', CampShoppingItem, campShoppingSchema],
] as const) {
  campsRouter.post(
    `/:id/${path}`,
    ah(async (req, res) => {
      const camp = await loadCamp(req.params.id);
      assertCampPerm(req, camp, 'edit');
      const item = await (Model as typeof CampBudgetLine).create({ ...(parse(schema, req.body) as object), campId: camp.id });
      res.status(201).json(item);
    }),
  );
}

/** Unidades del usuario en las que puede crear campamentos (para el formulario). */
campsRouter.get(
  '/meta/units',
  authorize('camps', 'view'),
  ah(async (req, res) => {
    const allowed = unitsWith(req.auth, 'camps', 'create');
    res.json({ groupWide: allowed === 'all', unitIds: allowed === 'all' ? [] : allowed });
  }),
);

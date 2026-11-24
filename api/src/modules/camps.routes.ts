/**
 * Etapa 6: campamentos, acantonamientos y salidas de unidad.
 * Inscripción (con su cargo en la cuenta corriente del protagonista), legajo con semáforo, presupuesto por rubro
 * vs. real (movimientos con campId), logística (menú, compras, transporte, materiales) y catálogo de lugares de acampe.
 * Permisos por la unidad organizadora (sin unidad = del Grupo: solo permisos de todo el Grupo).
 */
import { Router, type Request, type Response } from 'express';
import { accountIdsFor } from '../lib/accountAccess';
import { Op, QueryTypes, type Transaction as SqlTx } from 'sequelize';
import {
  BRANCH_INFO,
  BRANCHES,
  CAMP_RUBROS,
  CAMP_TYPE_LABELS,
  campBudgetLineSchema,
  campMenuSchema,
  campNights,
  campCloneSchema,
  campPermitSchema,
  campPermitSignSchema,
  campRenderSchema,
  campSchema,
  campShoppingSchema,
  campSiteSchema,
  can,
  documentStatus,
  enrollmentSchema,
  formatDate,
  formatMoney,
  GROUP_INFO,
  hasProgramWoodBadge,
  enrollSchema,
  round2,
  splitMeetingNotes,
  unitsWith,
  type Branch,
  type CampType,
} from '../shared';
import { sequelize } from '../db';
import { Adult, AdultCourse, Course, DocumentType, Member, MemberDocument, SmallGroup, Unit, User } from '../models';
import { SignedAuthorization } from '../models/authorizations';
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
import { buildPermit, permitPdfData, permitToStore, savedSignatureOf, type PermitSignature } from '../lib/campPermit';
import { ActivitySheet, MeetingItem, MeetingProgram } from '../models/program';
import { campPermitPdf } from '../lib/campPermitPdf';
import { campPlanPdf, type PlanDay, type PlanPdfData } from '../lib/campPlanPdf';
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
    // Autorización firmada en la app (la más reciente que no esté anulada), sin los trazos
    const signed = memberIds.length
      ? await SignedAuthorization.findAll({
          where: { campId: camp.id, kind: 'campamento', memberId: memberIds, status: { [Op.ne]: 'anulada' } },
          attributes: ['id', 'memberId', 'status', 'signedAt', 'content', 'aval'],
          order: [['signedAt', 'DESC']],
        })
      : [];
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
          signedAuthorization: (() => {
            const a = e.memberId ? signed.find((x) => x.memberId === e.memberId) : null;
            return a ? { id: a.id, status: a.status, signedAt: a.signedAt, signerName: a.content.signer.name, hasAval: !!a.aval } : null;
          })(),
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
    // Solo los movimientos de las cuentas que puede ver (todas, o las de su unidad)
    const visible = await accountIdsFor(req.auth, 'view');
    const movements = can(req.auth, 'accounting', 'view')
      ? await Movement.findAll({
          where: { campId: camp.id, ...(visible ? { accountId: visible } : {}) },
          include: [
            { model: Account, as: 'account', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
          ],
          order: [['date', 'ASC'], ['createdAt', 'ASC']],
        })
      : [];
    const u = camp.ownerUnitId;
    const program = await campProgram(req.auth, camp);
    // Jefe/a de Campo: necesita la Insignia de Madera en Programa
    const chiefCourses = camp.responsibleAdultId
      ? await AdultCourse.findAll({ where: { adultId: camp.responsibleAdultId }, include: [{ model: Course, as: 'course', attributes: ['name'] }] })
      : [];
    res.json({
      ...camp.toJSON(),
      responsibleWoodBadge: camp.responsibleAdultId ? hasProgramWoodBadge(chiefCourses.map((c) => ({ name: c.course?.name ?? '' }))) : null,
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

// ===================================================================
// Permiso de Acampe (planilla de Scouts de Argentina) y plan del campamento, en PDF
// ===================================================================
const pdfName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);
function sendPdf(res: Response, pdf: Buffer, name: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdfName(name)}.pdf"`);
  res.send(pdf);
}
async function permitFor(req: Request) {
  const camp = await loadCamp(req.params.id);
  if (!canViewCamp(req, camp)) throw forbidden();
  const p = await buildPermit(camp.id);
  if (!p) throw notFound();
  return p;
}
async function permitJson(req: Request, p: Awaited<ReturnType<typeof permitFor>>) {
  const canEdit = can(req.auth, 'camps', 'edit', p.camp.ownerUnitId);
  const isChief = !!p.auto.chief && req.user!.adultId === p.auto.chief.id;
  const s = p.signature;
  return {
    saved: p.saved,
    values: p.values,
    copiedFrom: p.copiedFrom,
    auto: p.auto,
    canEdit,
    signature: s ? { name: s.name, signedAt: s.signedAt, onDeviceOf: s.onDeviceOf, reused: s.reused, valid: s.valid, data: s.signature } : null,
    sign: {
      /** Quien tiene la sesión es el Jefe/a de Campo. */
      isChief,
      canSign: !!p.auto.chief && (isChief || canEdit),
      /** Su última firma ya registrada en la app, para aplicarla sin volver a dibujarla (solo se le muestra a su dueño). */
      saved: isChief ? await savedSignatureOf(p.auto.chief!.id) : null,
    },
  };
}
campsRouter.get(
  '/:id/permit',
  ah(async (req, res) => {
    res.json(await permitJson(req, await permitFor(req)));
  }),
);
campsRouter.put(
  '/:id/permit',
  ah(async (req, res) => {
    const camp = await loadCamp(req.params.id);
    assertCampPerm(req, camp, 'edit');
    const data = parse(campPermitSchema, req.body);
    await camp.update({ permit: permitToStore(camp, data) });
    res.json(await permitJson(req, await permitFor(req)));
  }),
);
campsRouter.get(
  '/:id/permit/pdf',
  ah(async (req, res) => {
    const p = await permitFor(req);
    const name = `Permiso de acampe - ${p.camp.name}`;
    sendPdf(res, await campPermitPdf(permitPdfData(p), name), name);
  }),
);

// ---- Firma en pantalla del Jefe/a de Campo ----
/**
 * Firma el permiso el Jefe/a de Campo: con su propio usuario (dibujando o aplicando su última firma ya registrada
 * en la app) o, si está presente, con el dedo en el dispositivo de quien puede editar el campamento.
 */
campsRouter.post(
  '/:id/permit/sign',
  ah(async (req, res) => {
    const p = await permitFor(req);
    const data = parse(campPermitSignSchema, req.body);
    const chief = p.auto.chief;
    if (!chief) throw badRequest('Primero elegí al Jefe/a de Campo (en «Editar»)');
    if (!p.saved) throw badRequest('Guardá primero los datos del permiso');
    const mine = req.user!.adultId === chief.id;
    if (!mine && !can(req.auth, 'camps', 'edit', p.camp.ownerUnitId)) throw forbidden('El permiso lo firma el Jefe/a de Campo');
    let signature = data.signature ?? null;
    if (data.useSaved) {
      // La firma guardada solo la aplica su dueño, desde su propio usuario
      if (!mine) throw forbidden('Solo el Jefe/a de Campo, con su propio usuario, puede usar su firma guardada');
      signature = (await savedSignatureOf(chief.id))?.signature ?? null;
      if (!signature) throw badRequest('Todavía no tenés una firma registrada en la app: firmá con el dedo');
    }
    if (!signature) throw badRequest('Falta la firma');
    const stored: PermitSignature = {
      adultId: chief.id,
      userId: mine ? req.user!.id : null,
      name: chief.name,
      dni: chief.dni ? chief.dni.replace(/\D/g, '') : null,
      signature,
      signedAt: new Date().toISOString(),
      onDeviceOf: mine ? null : req.user!.name,
      reused: data.useSaved,
      hash: p.hash,
    };
    // Sin los ganchos de auditoría (guardarían el trazo entero): queda un renglón con quién y cómo
    await Camp.update({ permitSignature: stored as never }, { where: { id: p.camp.id }, hooks: false });
    await writeAudit({
      action: 'update',
      entity: 'Camp',
      entityId: p.camp.id,
      summary: `Permiso de acampe de ${p.camp.name} firmado por ${chief.name}${stored.onDeviceOf ? ` (en el dispositivo de ${stored.onDeviceOf})` : stored.reused ? ' (con su firma guardada)' : ''}`,
    });
    res.json(await permitJson(req, await permitFor(req)));
  }),
);
campsRouter.delete(
  '/:id/permit/sign',
  ah(async (req, res) => {
    const p = await permitFor(req);
    if (!p.signature) throw badRequest('El permiso no está firmado');
    if (req.user!.adultId !== p.signature.adultId && !can(req.auth, 'camps', 'edit', p.camp.ownerUnitId)) throw forbidden();
    await Camp.update({ permitSignature: null }, { where: { id: p.camp.id }, hooks: false });
    await writeAudit({ action: 'update', entity: 'Camp', entityId: p.camp.id, summary: `Se quitó la firma del permiso de acampe de ${p.camp.name}` });
    res.json(await permitJson(req, await permitFor(req)));
  }),
);

// ---- Duplicar un campamento ----
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/**
 * Crea un campamento nuevo (en borrador) con los datos de otro: unidades, lugar, Jefe/a de Campo, costo, propuesta,
 * transporte y materiales; y, si se pide, el Permiso de Acampe, el presupuesto, el menú y las compras, y el
 * cronograma corrido a las fechas nuevas. No copia inscriptos, pagos, movimientos ni firmas.
 */
campsRouter.post(
  '/:id/clone',
  ah(async (req, res) => {
    const src = await loadCamp(req.params.id);
    if (!canViewCamp(req, src)) throw forbidden();
    const d = parse(campCloneSchema, req.body);
    assertCan(req, 'camps', 'create', src.ownerUnitId);
    const unitIds = [...new Set([...(src.ownerUnitId ? [src.ownerUnitId] : []), ...campUnitIds(src)])];
    const shift = Math.round((new Date(`${d.startDate}T12:00:00Z`).getTime() - new Date(`${src.startDate}T12:00:00Z`).getTime()) / 86_400_000);
    const copied = { permit: false, budget: 0, menu: 0, shopping: 0, days: 0, daysSkipped: 0 };

    // El permiso: todo lo cargado, menos las fechas (son las nuevas) y cuándo se le avisó al Director/a de Zona
    let permit: Record<string, unknown> | null = null;
    if (d.permit && src.permit) {
      const { basis: _b, departureDate: _d, arrivalDate: _a, zoneDirectorContact: _z, ...rest } = src.permit as Record<string, unknown>;
      permit = { ...rest, basis: { chiefAdultId: src.responsibleAdultId ?? null, startDate: d.startDate, endDate: d.endDate, campSiteId: src.campSiteId ?? null } };
      copied.permit = true;
    }

    const created = await sequelize.transaction(async (transaction) => {
      const c = await Camp.create(
        {
          name: d.name,
          type: src.type,
          ownerUnitId: src.ownerUnitId,
          startDate: d.startDate,
          endDate: d.endDate,
          campSiteId: src.campSiteId,
          place: src.place,
          responsibleAdultId: src.responsibleAdultId,
          cost: src.cost,
          description: src.description,
          transportCompany: src.transportCompany,
          transportContact: src.transportContact,
          transportSchedule: src.transportSchedule,
          transportNotes: src.transportNotes,
          materials: src.materials,
          status: 'borrador',
          permit,
        },
        { transaction },
      );
      await setUnits(c.id, unitIds, transaction);
      if (d.budget) {
        for (const l of await CampBudgetLine.findAll({ where: { campId: src.id }, order: [['createdAt', 'ASC']], transaction })) {
          await CampBudgetLine.create({ campId: c.id, rubro: l.rubro, concept: l.concept, planned: l.planned }, { transaction });
          copied.budget++;
        }
      }
      if (d.logistics) {
        for (const m of await CampMenuItem.findAll({ where: { campId: src.id }, order: [['createdAt', 'ASC']], transaction })) {
          // El día se corre con el campamento; si cae fuera de las fechas nuevas queda sin día
          const day = m.day ? addDays(m.day, shift) : null;
          await CampMenuItem.create({ campId: c.id, day: day && day <= d.endDate ? day : null, meal: m.meal, dish: m.dish, notes: m.notes }, { transaction });
          copied.menu++;
        }
        for (const s of await CampShoppingItem.findAll({ where: { campId: src.id }, order: [['createdAt', 'ASC']], transaction })) {
          await CampShoppingItem.create({ campId: c.id, item: s.item, quantity: s.quantity, bought: false, notes: s.notes }, { transaction });
          copied.shopping++;
        }
      }
      if (d.schedule) {
        // Cada día del cronograma pasa al mismo día del campamento nuevo, si ahí todavía no hay programa.
        // Las fichas no se enlazan (son las del campamento anterior): queda el nombre de la actividad.
        const editable = unitIds.filter((u) => can(req.auth, 'activities', 'edit', u));
        const programs = editable.length
          ? await MeetingProgram.findAll({
              where: { unitId: editable, date: { [Op.between]: [src.startDate, src.endDate] } },
              include: [{ model: MeetingItem, as: 'items', include: [{ model: ActivitySheet, as: 'sheet', attributes: ['id', 'name'] }] }],
              order: [[{ model: MeetingItem, as: 'items' }, 'sortOrder', 'ASC']],
              transaction,
            })
          : [];
        for (const p of programs) {
          const date = addDays(p.date, shift);
          if (date > d.endDate || !(p.items ?? []).length) continue;
          if (await MeetingProgram.findOne({ where: { unitId: p.unitId, date }, transaction })) {
            copied.daysSkipped++;
            continue;
          }
          const np = await MeetingProgram.create({ unitId: p.unitId, date, notes: p.notes }, { transaction });
          for (const i of p.items ?? []) {
            await MeetingItem.create(
              {
                meetingProgramId: np.id,
                sortOrder: i.sortOrder,
                time: i.time,
                activitySheetId: null,
                title: i.title || i.sheet?.name || 'Actividad',
                responsibleAdultId: i.responsibleAdultId,
                responsibleText: i.responsibleText ?? null,
                durationMin: i.durationMin,
                notes: i.notes,
                materials: i.materials ?? null,
              },
              { transaction },
            );
          }
          copied.days++;
        }
      }
      await writeAudit({ action: 'create', entity: 'Camp', entityId: c.id, summary: `${d.name}: duplicado de «${src.name}»` }, transaction);
      return c;
    });
    void notifyCampReferents(req, created, unitIds);
    res.status(201).json({ id: created.id, copied });
  }),
);

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ymd = (iso: string) => iso.slice(0, 10).split('-').map(Number) as [number, number, number];
/** «8 y 9 de agosto de 2026», «del 3 al 11 de enero de 2026», «del 30 de enero al 2 de febrero de 2026». */
function longDates(start: string, end: string) {
  const [y1, m1, d1] = ymd(start);
  const [y2, m2, d2] = ymd(end);
  if (start === end) return `${d1} de ${MONTHS[m1 - 1]} de ${y1}`;
  if (y1 !== y2) return `del ${d1} de ${MONTHS[m1 - 1]} de ${y1} al ${d2} de ${MONTHS[m2 - 1]} de ${y2}`;
  if (m1 !== m2) return `del ${d1} de ${MONTHS[m1 - 1]} al ${d2} de ${MONTHS[m2 - 1]} de ${y1}`;
  return campNights(start, end) === 1 ? `${d1} y ${d2} de ${MONTHS[m1 - 1]} de ${y1}` : `del ${d1} al ${d2} de ${MONTHS[m1 - 1]} de ${y1}`;
}
/** Texto libre de varios renglones → lista (sin las viñetas que se hayan escrito a mano). */
const asList = (s: string | null) =>
  (s ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-–—•●·*▪◦]+|\d+[.)])\s*/, '').trim())
    // Un renglón que es solo el título («Objetivos:») no es un ítem
    .filter((l) => l && !/^(objetivos|materiales)\s*:?$/i.test(l));

campsRouter.get(
  '/:id/plan/pdf',
  ah(async (req, res) => {
    const camp = await Camp.findByPk(req.params.id, {
      include: [
        { model: CampUnit, as: 'campUnits', include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] },
        { model: Unit, as: 'ownerUnit', attributes: unitAttrs },
        { model: CampSite, as: 'site' },
        { model: Adult, as: 'responsible', attributes: adultAttrs },
      ],
    });
    if (!camp) throw notFound();
    if (!canViewCamp(req, camp)) throw forbidden();
    const program = await campProgram(req.auth, camp);
    const units = [...program.units.map((u) => u.unit)].sort((a, b) => Number(b.id === camp.ownerUnitId) - Number(a.id === camp.ownerUnitId));
    const multi = units.length > 1;

    // Programa: un cuadro por día (y por unidad, si participa más de una)
    const days: PlanDay[] = [];
    const dates = [...new Set(program.days.map((d) => d.date))].sort();
    for (const date of dates) {
      for (const u of units) {
        const day = program.days.find((d) => d.date === date && d.unitId === u.id);
        if (!day || !day.items.length) continue;
        const [y, m, d] = ymd(date);
        const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
        days.push({
          heading: `Programa ${weekday.toLowerCase()} ${d}/${m}${multi ? ` · ${u.name}` : ''}`,
          bar: `${d}/${m}/${y} ${weekday}`,
          notes: day.notes,
          items: day.items.map((i) => {
            const who = i.responsible ? `${i.responsible.firstName} ${i.responsible.lastName}` : (i.responsibleText ?? '');
            // Momentos viejos: el responsable y los materiales venían escritos en las notas
            const old = splitMeetingNotes(i.notes, { who: !!who, materials: !!i.materials });
            return {
              time: (i.time ?? '').replace(/^0(\d:)/, '$1'),
              what: i.sheet ? i.sheet.name : (i.title ?? ''),
              who: who || old.who,
              materials: i.materials || old.materials,
              notes: [i.sheet && i.title && i.title !== i.sheet.name ? i.title : '', old.notes].filter(Boolean).join(' · '),
            };
          }),
        });
      }
    }

    // Nómina: adultos y protagonistas inscriptos
    let roster: PlanPdfData['roster'] = null;
    if (req.query.nomina !== '0') {
      const enrollments = await CampEnrollment.findAll({
        where: { campId: camp.id },
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'firstName', 'lastName', 'dni'],
            include: [
              { model: Unit, as: 'unit', attributes: unitAttrs },
              { model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name'] },
            ],
          },
          { model: Adult, as: 'adult', attributes: [...adultAttrs, 'dni'] },
        ],
      });
      const members = enrollments.map((e) => e.member).filter((m): m is Member => !!m);
      const adults = enrollments.map((e) => e.adult).filter((a): a is Adult => !!a);
      const branches = new Set(members.map((m) => m.unit?.branch).filter(Boolean));
      const manyUnits = new Set(members.map((m) => m.unit?.id).filter(Boolean)).size > 1;
      const groupOf = (m: Member) => [manyUnits ? m.unit?.code : null, m.smallGroup?.name].filter(Boolean).join(' · ');
      roster = {
        groupLabel: BRANCH_INFO[(branches.size === 1 ? [...branches][0] : branches.size ? '' : camp.ownerUnit?.branch) as Branch]?.smallGroup.one ?? 'Pequeño grupo',
        adults: adults
          .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
          .map((a) => ({ dni: a.dni ?? '', lastName: a.lastName, firstName: a.firstName, group: a.id === camp.responsibleAdultId ? 'Jefe/a de Campo' : 'Adulto' })),
        members: members
          .map((m) => ({ dni: m.dni ?? '', lastName: m.lastName, firstName: m.firstName, group: groupOf(m) }))
          .sort((a, b) => (a.group || '~').localeCompare(b.group || '~') || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)),
      };
    }

    const place = camp.site ? [`${camp.site.name}${camp.site.location ? ` (${camp.site.location})` : ''}`, camp.place].filter(Boolean).join(' · ') : (camp.place ?? '');
    const facts: [string, string][] = [];
    if (multi) facts.push(['Participan', units.map((u) => u.name).join(', ')]);
    if (place) facts.push(['Lugar', place]);
    if (camp.cost > 0) facts.push(['Costo', formatMoney(camp.cost).replace(/,00$/, '')]);
    if (camp.responsible) facts.push(['Jefe/a de Campo', `${camp.responsible.firstName} ${camp.responsible.lastName}`]);
    const transport = [camp.transportCompany, camp.transportSchedule].filter(Boolean).join(' · ');
    if (transport) facts.push(['Transporte', transport]);
    const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
    const pdf = await campPlanPdf({
      title: camp.name,
      dates: longDates(camp.startDate, camp.endDate),
      headerLines: [camp.ownerUnit?.name ?? 'Grupo Scout', `G.S. ${GROUP_INFO.name}`],
      objectives: asList(camp.description),
      facts,
      days,
      materials: asList(camp.materials),
      roster,
      color: camp.ownerUnit ? (BRANCH_INFO[camp.ownerUnit.branch as Branch]?.color ?? '#7A1F2B') : '#7A1F2B',
      generated: `Generado con ALCONBAR Gestión el ${formatDate(today)}`,
    });
    sendPdf(res, pdf, `${camp.name} - Plan`);
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

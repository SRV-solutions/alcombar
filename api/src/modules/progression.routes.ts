import { Router, type Request } from 'express';
import { Op, QueryTypes, type ModelStatic, type Model } from 'sequelize';
import {
  can,
  chooseCompetenciesSchema,
  COMPETENCY_STATUS_LABELS,
  type CompetencyStatus,
  cycleReviewSchema,
  formatDate,
  memberCompetencySchema,
  memberMomentsSchema,
  memberRoleSchema,
  memberSpecialtySchema,
  memberStageSchema,
  memberToolSchema,
  progressionNoteSchema,
  schemeSchema,
  SCOUT_STANDARDS,
  specialtySchema,
  stageSchema,
} from '../shared';
import { sequelize } from '../db';
import { Adult, Member, SmallGroup, Unit, User } from '../models';
import {
  BranchArea,
  Competency,
  CycleReview,
  MemberCompetency,
  MemberProgress,
  MemberRole,
  MemberSpecialty,
  MemberStage,
  ProgramCycle,
  ProgressionNote,
  ProgressionScheme,
  ProgressionStage,
  Specialty,
} from '../models/program';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { authorize } from '../middlewares/auth';
import { canCatalog } from './program.routes';

/** Etapa 4: progresión personal por rama. */
export const progressionRouter = Router();

const assertCatalog = (req: Request) => {
  if (!canCatalog(req)) throw forbidden('Los esquemas de progresión los edita Jefatura, Programa o un superadmin');
};

// ---------------- resolución de la unidad (para permisos) ----------------
const unitOfMember = async (memberId: string) => {
  const m = await Member.findByPk(memberId, { attributes: ['unitId'] });
  return m ? m.unitId : undefined;
};
const memberUnit = (req: Request) => unitOfMember(req.params.memberId);
/** Para registros hijos (etapa, competencia, rol, revisión, especialidad): la unidad de su protagonista. */
const childUnit =
  (M: ModelStatic<Model & { memberId: string }>) =>
  async (req: Request) => {
    const r = await M.findByPk(req.params.id, { attributes: ['memberId'] });
    return r ? unitOfMember(r.memberId) : undefined;
  };
const findChild = async <T extends Model>(M: ModelStatic<T>, id: string) => {
  const r = await M.findByPk(id);
  if (!r) throw notFound();
  return r;
};

async function memberWithBranch(memberId: string) {
  const m = await Member.findByPk(memberId, { include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'branch'] }] });
  if (!m) throw notFound();
  return { member: m, branch: m.unit?.branch ?? m.branch ?? null };
}

/** Esquema vigente de una rama: el activo de mayor versión. */
async function activeScheme(branch: string | null) {
  if (!branch) return null;
  return ProgressionScheme.findOne({
    where: { branch, active: true },
    include: [{ model: ProgressionStage, as: 'stages' }],
    order: [
      ['version', 'DESC'],
      [{ model: ProgressionStage, as: 'stages' }, 'sortOrder', 'ASC'],
    ],
  });
}

// =====================================================================
// Esquemas, etapas y especialidades (catálogo)
// =====================================================================
progressionRouter.get(
  '/schemes',
  ah(async (req, res) => {
    const where = req.query.branch ? { branch: String(req.query.branch) } : {};
    const schemes = await ProgressionScheme.findAll({
      where,
      include: [{ model: ProgressionStage, as: 'stages' }],
      order: [
        ['branch', 'ASC'],
        ['version', 'DESC'],
        [{ model: ProgressionStage, as: 'stages' }, 'sortOrder', 'ASC'],
      ],
    });
    res.json({ schemes, canEdit: canCatalog(req) });
  }),
);
progressionRouter.post(
  '/schemes',
  ah(async (req, res) => {
    assertCatalog(req);
    res.status(201).json(await ProgressionScheme.create(parse(schemeSchema, req.body)));
  }),
);
progressionRouter.put(
  '/schemes/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const s = await findChild(ProgressionScheme, req.params.id);
    const d = parse(schemeSchema, req.body);
    await s.update({ name: d.name, version: d.version, active: d.active });
    res.json(s);
  }),
);
progressionRouter.post(
  '/schemes/:id/stages',
  ah(async (req, res) => {
    assertCatalog(req);
    const s = await findChild(ProgressionScheme, req.params.id);
    const d = parse(stageSchema, req.body);
    const max = (await ProgressionStage.max<number, ProgressionStage>('sortOrder', { where: { schemeId: s.id } })) ?? 0;
    res.status(201).json(await ProgressionStage.create({ schemeId: s.id, name: d.name, description: d.description, sortOrder: max + 1 }));
  }),
);
progressionRouter.put(
  '/stages/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const st = await findChild(ProgressionStage, req.params.id);
    const d = parse(stageSchema, req.body);
    await st.update({ name: d.name, description: d.description });
    res.json(st);
  }),
);
progressionRouter.post(
  '/stages/:id/move',
  ah(async (req, res) => {
    assertCatalog(req);
    const st = await findChild(ProgressionStage, req.params.id);
    const up = req.body?.direction === 'up';
    const siblings = await ProgressionStage.findAll({ where: { schemeId: st.schemeId }, order: [['sortOrder', 'ASC']] });
    const i = siblings.findIndex((x) => x.id === st.id);
    const j = up ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return res.json({ ok: true });
    await sequelize.transaction(async (transaction) => {
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      for (const [k, s] of siblings.entries()) if (s.sortOrder !== k + 1) await s.update({ sortOrder: k + 1 }, { transaction });
    });
    res.json({ ok: true });
  }),
);
progressionRouter.delete(
  '/stages/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const st = await findChild(ProgressionStage, req.params.id);
    if (await MemberStage.count({ where: { stageId: st.id } })) throw badRequest('Hay protagonistas en esa etapa: no se puede borrar');
    await st.destroy();
    res.json({ ok: true });
  }),
);

progressionRouter.get(
  '/specialties',
  ah(async (req, res) => {
    const where: Record<string | symbol, unknown> = req.query.active === 'all' ? {} : { active: true };
    // Con ?branch= se ven las de esa rama y las que son para todas
    if (req.query.branch) where[Op.or] = [{ branch: String(req.query.branch) }, { branch: null }];
    res.json(await Specialty.findAll({ where, order: [['name', 'ASC']] }));
  }),
);
progressionRouter.post(
  '/specialties',
  ah(async (req, res) => {
    assertCatalog(req);
    res.status(201).json(await Specialty.create(parse(specialtySchema, req.body)));
  }),
);
progressionRouter.put(
  '/specialties/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const s = await findChild(Specialty, req.params.id);
    await s.update(parse(specialtySchema, req.body));
    res.json(s);
  }),
);
progressionRouter.delete(
  '/specialties/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const s = await findChild(Specialty, req.params.id);
    if (await MemberSpecialty.count({ where: { specialtyId: s.id } })) {
      await s.update({ active: false });
      return res.json({ ok: true, deactivated: true });
    }
    await s.destroy();
    res.json({ ok: true });
  }),
);

// =====================================================================
// Tablero de la unidad
// =====================================================================
async function unitStandards(unitId: string, branch: string, year: number) {
  // Noches: las de los campamentos realizados/rendidos en los que participó la unidad, más las de fichas de
  // campamento que no caen dentro de esos campamentos (para no contar dos veces el mismo campamento).
  const [row] = await sequelize.query<{ descubiertas: number; proyectos: number; noches: number; realizadas: number }>(
    `WITH camps_u AS (
       SELECT c.start_date, c.end_date, GREATEST(c.end_date - c.start_date, 0) AS nights
       FROM camps c
       WHERE c.deleted_at IS NULL AND c.status IN ('realizado','rendido') AND c.start_date BETWEEN :from AND :to
         AND (c.owner_unit_id = :unitId OR EXISTS (SELECT 1 FROM camp_units cu WHERE cu.camp_id = c.id AND cu.unit_id = :unitId))
     )
     SELECT COUNT(*) FILTER (WHERE s.opportunity_type = 'descubierta')::int AS descubiertas,
            COUNT(*) FILTER (WHERE s.opportunity_type = 'proyecto' AND s.scope = 'unidad')::int AS proyectos,
            (COALESCE(SUM(s.nights) FILTER (
               WHERE s.opportunity_type = 'campamento'
                 AND NOT EXISTS (SELECT 1 FROM camps_u cu WHERE s.date BETWEEN cu.start_date AND cu.end_date)
             ), 0) + (SELECT COALESCE(SUM(nights), 0) FROM camps_u))::int AS noches,
            COUNT(*)::int AS realizadas
     FROM activity_sheets s
     WHERE s.deleted_at IS NULL AND s.unit_id = :unitId AND s.status IN ('realizada','evaluada') AND s.date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { unitId, from: `${year}-01-01`, to: `${year}-12-31` } },
  );
  return { year, ...row, targets: branch === 'scouts' ? SCOUT_STANDARDS : null };
}

progressionRouter.get(
  '/board',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    if (!unitId) throw badRequest('Falta la unidad');
    if (!can(req.auth, 'progression', 'view', unitId)) throw forbidden();
    const unit = await Unit.findByPk(unitId);
    if (!unit) throw notFound();
    const year = Number(req.query.year) || new Date().getFullYear();
    const [members, areas, scheme, standards] = await Promise.all([
      Member.findAll({
        where: { unitId, status: 'activo' },
        include: [{ model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name'] }],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      }),
      BranchArea.findAll({ where: { branch: unit.branch }, order: [['sortOrder', 'ASC']] }),
      activeScheme(unit.branch),
      unitStandards(unit.id, unit.branch, year),
    ]);
    const ids = members.map((m) => m.id);
    const [stages, comps, reviews, moments] = ids.length
      ? await Promise.all([
          MemberStage.findAll({ where: { memberId: ids }, include: [{ model: ProgressionStage, as: 'stage', attributes: ['id', 'name', 'sortOrder'] }], order: [['startedAt', 'DESC NULLS LAST']] }),
          MemberCompetency.findAll({ where: { memberId: ids }, include: [{ model: Competency, as: 'competency', attributes: ['id', 'areaId'] }] }),
          CycleReview.findAll({ where: { memberId: ids }, attributes: ['memberId', 'date', 'createdAt'], order: [['date', 'DESC NULLS LAST']] }),
          MemberProgress.findAll({ where: { memberId: ids } }),
        ])
      : [[], [], [], []];
    res.json({
      unit: { id: unit.id, name: unit.name, code: unit.code, branch: unit.branch },
      areas: areas.map((a) => ({ id: a.id, name: a.name })),
      scheme,
      standards,
      canEdit: can(req.auth, 'progression', 'edit', unitId),
      members: members.map((m) => {
        const mine = stages.filter((s) => s.memberId === m.id);
        const current = mine.find((s) => !s.endedAt) ?? mine[0] ?? null;
        const mc = comps.filter((c) => c.memberId === m.id && (!current || !c.memberStageId || c.memberStageId === current.id));
        const byArea: Record<string, { chosen: number; achieved: number }> = {};
        for (const c of mc) {
          const k = c.competency?.areaId ?? 'sin_area';
          byArea[k] ??= { chosen: 0, achieved: 0 };
          byArea[k].chosen++;
          if (c.status === 'lograda') byArea[k].achieved++;
        }
        const rev = reviews.find((r) => r.memberId === m.id);
        const mo = moments.find((x) => x.memberId === m.id);
        return {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          smallGroup: m.smallGroup,
          promiseDate: m.promiseDate,
          transition: mo?.transition ?? false,
          tool: { status: mo?.toolStatus ?? null, lost: mo?.toolLost ?? false, payment: mo?.toolPayment ?? null },
          currentStage: current ? { id: current.id, stageId: current.stageId, name: current.stage?.name ?? '', startedAt: current.startedAt, insigniaAt: current.insigniaAt } : null,
          competencies: { total: mc.length, achieved: mc.filter((c) => c.status === 'lograda').length, byArea },
          lastReview: rev ? rev.date ?? rev.createdAt.toISOString().slice(0, 10) : null,
        };
      }),
    });
  }),
);

// =====================================================================
// Progresión de un protagonista
// =====================================================================
progressionRouter.get(
  '/members/:memberId',
  authorize('progression', 'view', memberUnit),
  ah(async (req, res) => {
    const { member, branch } = await memberWithBranch(req.params.memberId);
    const memberId = member.id;
    const [moments, scheme, stages, comps, roles, reviews, specialties, areas, catalog, specialtyCatalog, cycles, participation] = await Promise.all([
      MemberProgress.findOne({ where: { memberId } }),
      activeScheme(branch),
      MemberStage.findAll({
        where: { memberId },
        include: [
          {
            model: ProgressionStage,
            as: 'stage',
            attributes: ['id', 'name', 'sortOrder'],
            include: [{ model: ProgressionScheme, as: 'scheme', attributes: ['id', 'name', 'version'], paranoid: false }],
            paranoid: false,
          },
        ],
        order: [['startedAt', 'DESC NULLS LAST']],
      }),
      MemberCompetency.findAll({
        where: { memberId },
        include: [
          {
            model: Competency,
            as: 'competency',
            attributes: ['id', 'number', 'name', 'areaId', 'requiredChallenges', 'optionalChallenges'],
            include: [{ model: BranchArea, as: 'area', attributes: ['id', 'name'] }],
            paranoid: false,
          },
        ],
        order: [['createdAt', 'ASC']],
      }),
      MemberRole.findAll({ where: { memberId }, include: [{ model: ProgramCycle, as: 'cycle', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC']] }),
      CycleReview.findAll({ where: { memberId }, include: [{ model: ProgramCycle, as: 'cycle', attributes: ['id', 'name'] }], order: [['date', 'DESC NULLS LAST']] }),
      MemberSpecialty.findAll({ where: { memberId }, include: [{ model: Specialty, as: 'specialty', attributes: ['id', 'name'], paranoid: false }], order: [['achievedAt', 'DESC NULLS LAST']] }),
      branch ? BranchArea.findAll({ where: { branch }, order: [['sortOrder', 'ASC']] }) : Promise.resolve([] as BranchArea[]),
      branch
        ? Competency.findAll({ where: { branch, active: true }, order: [['number', 'ASC NULLS LAST'], ['name', 'ASC']] })
        : Promise.resolve([] as Competency[]),
      Specialty.findAll({ where: { active: true, [Op.or]: [{ branch: member.branch }, { branch: null }] }, order: [['name', 'ASC']] }),
      member.unitId ? ProgramCycle.findAll({ where: { unitId: member.unitId }, attributes: ['id', 'name', 'startDate'], order: [['startDate', 'DESC NULLS LAST']] }) : Promise.resolve([] as ProgramCycle[]),
      sequelize.query<{ id: string; date: string; name: string; type: string }>(
        `SELECT s.id, s.date::text AS date, s.name, s.opportunity_type AS type
         FROM activity_sheets s
         JOIN attendances a ON a.unit_id = s.unit_id AND a.date = s.date AND a.member_id = :memberId AND a.status IN ('presente','tarde')
         WHERE s.deleted_at IS NULL AND s.status IN ('realizada','evaluada')
         ORDER BY s.date DESC`,
        { type: QueryTypes.SELECT, replacements: { memberId } },
      ),
    ]);
    const byType: Record<string, number> = {};
    for (const p of participation) byType[p.type] = (byType[p.type] ?? 0) + 1;
    res.json({
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        promiseDate: member.promiseDate,
        status: member.status,
        unit: member.unit ?? null,
        branch,
      },
      canEdit: can(req.auth, 'progression', 'edit', member.unitId),
      moments: moments ?? {
        ambientacionSince: null,
        transition: false,
        transitionNotes: null,
        notes: null,
        toolStatus: null,
        toolLost: false,
        toolDeliveredAt: null,
        toolPayment: null,
        toolNotes: null,
      },
      scheme,
      stages,
      competencies: comps,
      roles,
      reviews,
      specialties,
      catalog: { areas: areas.map((a) => ({ id: a.id, name: a.name })), competencies: catalog, specialties: specialtyCatalog, cycles },
      participation: { total: participation.length, byType, recent: participation.slice(0, 12) },
    });
  }),
);

progressionRouter.put(
  '/members/:memberId/moments',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const d = parse(memberMomentsSchema, req.body);
    const memberId = req.params.memberId;
    const existing = await MemberProgress.findOne({ where: { memberId } });
    if (existing) await existing.update(d);
    else await MemberProgress.create({ ...d, memberId });
    res.json({ ok: true });
  }),
);

// Entrega del material de progresión (Cartas de Exploración, Rastros…): si ya lo tenía, si se entregó y cómo lo pagó
progressionRouter.put(
  '/members/:memberId/tool',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const d = parse(memberToolSchema, req.body);
    const memberId = req.params.memberId;
    const values = {
      toolStatus: d.toolStatus,
      toolLost: d.toolStatus === 'entregada' ? d.toolLost : false,
      toolDeliveredAt: d.toolStatus === 'entregada' ? d.toolDeliveredAt : null,
      toolPayment: d.toolStatus ? d.toolPayment : null,
      toolNotes: d.toolNotes,
    };
    const existing = await MemberProgress.findOne({ where: { memberId } });
    if (existing) await existing.update(values);
    else await MemberProgress.create({ memberId, ambientacionSince: null, transitionNotes: null, notes: null, ...values });
    res.json({ ok: true });
  }),
);

// ---- Etapas ----
async function checkStageBranch(stageId: string, branch: string | null) {
  const st = await ProgressionStage.findByPk(stageId, { include: [{ model: ProgressionScheme, as: 'scheme' }] });
  if (!st) throw badRequest('Revisá los datos', { stageId: 'Etapa inexistente' });
  if (branch && st.scheme?.branch !== branch) throw badRequest('Revisá los datos', { stageId: 'La etapa no es de la rama del protagonista' });
  return st;
}

progressionRouter.post(
  '/members/:memberId/stages',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const { member, branch } = await memberWithBranch(req.params.memberId);
    const d = parse(memberStageSchema, req.body);
    await checkStageBranch(d.stageId, branch);
    const started = d.startedAt ?? new Date().toISOString().slice(0, 10);
    const created = await sequelize.transaction(async (transaction) => {
      // La etapa anterior que seguía abierta termina cuando empieza la nueva
      const open = await MemberStage.findAll({ where: { memberId: member.id, endedAt: null }, transaction });
      for (const o of open) await o.update({ endedAt: started }, { transaction });
      return MemberStage.create({ memberId: member.id, stageId: d.stageId, startedAt: started, insigniaAt: d.insigniaAt, endedAt: d.endedAt, notes: d.notes }, { transaction });
    });
    res.status(201).json(created);
  }),
);
progressionRouter.put(
  '/member-stages/:id',
  authorize('progression', 'edit', childUnit(MemberStage)),
  ah(async (req, res) => {
    const ms = await findChild(MemberStage, req.params.id);
    const { branch } = await memberWithBranch(ms.memberId);
    const d = parse(memberStageSchema, req.body);
    await checkStageBranch(d.stageId, branch);
    await ms.update({ stageId: d.stageId, startedAt: d.startedAt, insigniaAt: d.insigniaAt, endedAt: d.endedAt, notes: d.notes });
    res.json(ms);
  }),
);
progressionRouter.delete(
  '/member-stages/:id',
  authorize('progression', 'edit', childUnit(MemberStage)),
  ah(async (req, res) => {
    const ms = await findChild(MemberStage, req.params.id);
    await sequelize.transaction(async (transaction) => {
      const comps = await MemberCompetency.findAll({ where: { memberStageId: ms.id }, transaction });
      for (const c of comps) await c.update({ memberStageId: null }, { transaction });
      await ms.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// ---- Competencias ----
progressionRouter.post(
  '/members/:memberId/competencies',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const { member, branch } = await memberWithBranch(req.params.memberId);
    const d = parse(chooseCompetenciesSchema, req.body);
    const comps = await Competency.findAll({ where: { id: d.competencyIds } });
    if (comps.some((c) => branch && c.branch !== branch)) throw badRequest('Hay competencias que no son de la rama del protagonista');
    if (d.memberStageId) {
      const ms = await MemberStage.findByPk(d.memberStageId);
      if (!ms || ms.memberId !== member.id) throw badRequest('Revisá los datos', { memberStageId: 'La etapa no es de este protagonista' });
    }
    const existing = await MemberCompetency.findAll({ where: { memberId: member.id, competencyId: d.competencyIds, memberStageId: d.memberStageId } });
    let added = 0;
    await sequelize.transaction(async (transaction) => {
      for (const c of comps) {
        if (existing.some((e) => e.competencyId === c.id)) continue;
        await MemberCompetency.create({ memberId: member.id, competencyId: c.id, memberStageId: d.memberStageId, status: 'elegida', achievedAt: null, notes: null }, { transaction });
        added++;
      }
    });
    res.status(201).json({ added, skipped: comps.length - added });
  }),
);
progressionRouter.put(
  '/member-competencies/:id',
  authorize('progression', 'edit', childUnit(MemberCompetency)),
  ah(async (req, res) => {
    const mc = await findChild(MemberCompetency, req.params.id);
    const d = parse(memberCompetencySchema, req.body);
    await mc.update({
      status: d.status,
      notes: d.notes,
      achievedAt: d.status === 'lograda' ? d.achievedAt ?? mc.achievedAt ?? new Date().toISOString().slice(0, 10) : null,
    });
    res.json(mc);
  }),
);
progressionRouter.delete(
  '/member-competencies/:id',
  authorize('progression', 'edit', childUnit(MemberCompetency)),
  ah(async (req, res) => {
    const mc = await findChild(MemberCompetency, req.params.id);
    await mc.destroy();
    res.json({ ok: true });
  }),
);

// ---- Roles en el pequeño grupo ----
async function checkCycle(cycleId: string | null, unitId: string | null) {
  if (!cycleId) return;
  const c = await ProgramCycle.findByPk(cycleId);
  if (!c || c.unitId !== unitId) throw badRequest('Revisá los datos', { cycleId: 'El ciclo no es de la unidad del protagonista' });
}

progressionRouter.post(
  '/members/:memberId/roles',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const { member } = await memberWithBranch(req.params.memberId);
    const d = parse(memberRoleSchema, req.body);
    await checkCycle(d.cycleId, member.unitId);
    res.status(201).json(await MemberRole.create({ ...d, memberId: member.id }));
  }),
);
progressionRouter.put(
  '/member-roles/:id',
  authorize('progression', 'edit', childUnit(MemberRole)),
  ah(async (req, res) => {
    const r = await findChild(MemberRole, req.params.id);
    const d = parse(memberRoleSchema, req.body);
    await checkCycle(d.cycleId, await unitOfMember(r.memberId) ?? null);
    await r.update(d);
    res.json(r);
  }),
);
progressionRouter.delete(
  '/member-roles/:id',
  authorize('progression', 'edit', childUnit(MemberRole)),
  ah(async (req, res) => {
    const r = await findChild(MemberRole, req.params.id);
    await r.destroy();
    res.json({ ok: true });
  }),
);

// ---- Revisión de fin de ciclo ----
progressionRouter.post(
  '/members/:memberId/reviews',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const { member } = await memberWithBranch(req.params.memberId);
    const d = parse(cycleReviewSchema, req.body);
    await checkCycle(d.cycleId, member.unitId);
    res.status(201).json(await CycleReview.create({ ...d, date: d.date ?? new Date().toISOString().slice(0, 10), memberId: member.id }));
  }),
);
progressionRouter.put(
  '/reviews/:id',
  authorize('progression', 'edit', childUnit(CycleReview)),
  ah(async (req, res) => {
    const r = await findChild(CycleReview, req.params.id);
    const d = parse(cycleReviewSchema, req.body);
    await checkCycle(d.cycleId, await unitOfMember(r.memberId) ?? null);
    await r.update(d);
    res.json(r);
  }),
);
progressionRouter.delete(
  '/reviews/:id',
  authorize('progression', 'edit', childUnit(CycleReview)),
  ah(async (req, res) => {
    const r = await findChild(CycleReview, req.params.id);
    await r.destroy();
    res.json({ ok: true });
  }),
);

// ---- Especialidades ----
progressionRouter.post(
  '/members/:memberId/specialties',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const d = parse(memberSpecialtySchema, req.body);
    if (!(await Specialty.findByPk(d.specialtyId))) throw badRequest('Revisá los datos', { specialtyId: 'Especialidad inexistente' });
    res.status(201).json(await MemberSpecialty.create({ ...d, memberId: req.params.memberId }));
  }),
);
progressionRouter.delete(
  '/member-specialties/:id',
  authorize('progression', 'edit', childUnit(MemberSpecialty)),
  ah(async (req, res) => {
    const r = await findChild(MemberSpecialty, req.params.id);
    await r.destroy();
    res.json({ ok: true });
  }),
);

// =====================================================================
// Seguimiento: notas de los adultos + historial de quién hizo cada cosa
// =====================================================================
/** Registros de la progresión cuyos cambios (de la auditoría) forman el historial de cada protagonista. */
const HISTORY_ENTITIES = ['MemberStage', 'MemberCompetency', 'MemberRole', 'CycleReview', 'MemberSpecialty', 'MemberProgress'];
type Changes = { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
type HistoryItem = {
  id: string;
  at: string;
  date: string | null;
  kind: 'nota' | 'etapa' | 'competencia' | 'rol' | 'revision' | 'especialidad' | 'momentos' | 'grupo';
  author: { userId: string | null; name: string };
  text: string;
  detail: string | null;
  noteId?: string;
  canDelete?: boolean;
};

progressionRouter.post(
  '/members/:memberId/notes',
  authorize('progression', 'edit', memberUnit),
  ah(async (req, res) => {
    const d = parse(progressionNoteSchema, req.body);
    const note = await ProgressionNote.create({ ...d, memberId: req.params.memberId, authorUserId: req.user!.id });
    res.status(201).json(note);
  }),
);

progressionRouter.delete(
  '/notes/:id',
  authorize('progression', 'edit', childUnit(ProgressionNote)),
  ah(async (req, res) => {
    const n = await findChild(ProgressionNote, req.params.id);
    if (n.authorUserId !== req.user!.id && !req.auth!.isSuperadmin) throw forbidden('Solo quien escribió la nota la puede borrar');
    await n.destroy();
    res.json({ ok: true });
  }),
);

/** Historial de seguimiento: notas de los adultos y cada cambio de la progresión, con el adulto que lo hizo. */
progressionRouter.get(
  '/members/:memberId/history',
  authorize('progression', 'view', memberUnit),
  ah(async (req, res) => {
    const memberId = req.params.memberId;
    const [logs, notes] = await Promise.all([
      sequelize.query<{ id: string; user_id: string | null; action: string; entity: string; entity_id: string; changes: Changes; created_at: Date }>(
        `WITH own AS (
           SELECT DISTINCT entity_id FROM audit_logs
           WHERE entity IN (:entities) AND (changes->'after'->>'memberId' = :memberId OR changes->'before'->>'memberId' = :memberId)
         )
         SELECT id, user_id, action, entity, entity_id, changes, created_at FROM audit_logs
         WHERE (entity IN (:entities) AND entity_id IN (SELECT entity_id FROM own))
            OR (entity = 'Member' AND entity_id = :memberId AND action = 'update' AND changes->'after'->'smallGroupId' IS NOT NULL)
         ORDER BY created_at DESC
         LIMIT 300`,
        { type: QueryTypes.SELECT, replacements: { entities: HISTORY_ENTITIES, memberId } },
      ),
      ProgressionNote.findAll({ where: { memberId }, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 300 }),
    ]);

    // A qué apunta cada registro (etapa, competencia…): sale del alta (o de la baja) en la auditoría
    const ref = new Map<string, Record<string, unknown>>();
    for (const l of [...logs].reverse()) if (l.changes?.after) ref.set(l.entity_id, { ...(ref.get(l.entity_id) ?? {}), ...l.changes.after });
    for (const l of logs) if (l.action === 'delete' && l.changes?.before) ref.set(l.entity_id, { ...l.changes.before, ...(ref.get(l.entity_id) ?? {}) });
    const idsOf = (key: string) => [...new Set([...ref.values()].map((r) => r[key]).filter((v): v is string => typeof v === 'string'))];
    const groupIds = [
      ...new Set(
        logs
          .filter((l) => l.entity === 'Member')
          .flatMap((l) => [l.changes?.before?.smallGroupId, l.changes?.after?.smallGroupId])
          .filter((v): v is string => typeof v === 'string'),
      ),
    ];
    const userIds = [...new Set([...logs.map((l) => l.user_id), ...notes.map((n) => n.authorUserId)].filter((v): v is string => !!v))];
    const [stages, comps, specs, cycles, groups, users] = await Promise.all([
      ProgressionStage.findAll({ where: { id: idsOf('stageId') }, attributes: ['id', 'name'], paranoid: false }),
      Competency.findAll({ where: { id: idsOf('competencyId') }, attributes: ['id', 'name', 'number'], paranoid: false }),
      Specialty.findAll({ where: { id: idsOf('specialtyId') }, attributes: ['id', 'name'], paranoid: false }),
      ProgramCycle.findAll({ where: { id: idsOf('cycleId') }, attributes: ['id', 'name'], paranoid: false }),
      SmallGroup.findAll({ where: { id: groupIds }, attributes: ['id', 'name'], paranoid: false }),
      User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'adultId'], paranoid: false }),
    ]);
    const adults = await Adult.findAll({
      where: { id: users.map((u) => u.adultId).filter((v): v is string => !!v) },
      attributes: ['id', 'firstName', 'lastName', 'totem'],
      paranoid: false,
    });
    const nameOf = (list: { id: string; name: string }[], id: unknown) => list.find((x) => x.id === id)?.name ?? null;
    const compName = (id: unknown) => {
      const c = comps.find((x) => x.id === id);
      return c ? `${c.number ? `${c.number}. ` : ''}${c.name}` : 'una competencia';
    };
    const authorOf = (userId: string | null) => {
      const u = users.find((x) => x.id === userId);
      if (!u) return { userId, name: 'Sistema' };
      const ad = adults.find((x) => x.id === u.adultId);
      return { userId, name: ad ? `${ad.firstName} ${ad.lastName}${ad.totem ? ` («${ad.totem}»)` : ''}` : u.name };
    };
    const day = (v: unknown) => (typeof v === 'string' && v ? formatDate(v) : null);
    const q = (s: string | null) => (s ? `«${s}»` : '');

    const items: HistoryItem[] = [];
    for (const l of logs) {
      const a = l.changes?.after ?? {};
      const b = l.changes?.before ?? {};
      const r = ref.get(l.entity_id) ?? {};
      const base = { id: l.id, at: new Date(l.created_at).toISOString(), date: null, author: authorOf(l.user_id), detail: null as string | null };
      const verb = (create: string, update: string, del: string) => (l.action === 'create' ? create : l.action === 'delete' ? del : update);
      switch (l.entity) {
        case 'MemberStage': {
          const n = q(nameOf(stages, r.stageId)) || 'una etapa';
          let text = verb(`Registró la etapa ${n}`, `Editó la etapa ${n}`, `Borró la etapa ${n}`);
          let detail = l.action === 'create' && day(a.startedAt) ? `Desde el ${day(a.startedAt)}` : null;
          if (l.action === 'update' && a.insigniaAt) text = `Registró la insignia de ${n} (${day(a.insigniaAt)})`;
          else if (l.action === 'update' && a.endedAt) text = `Cerró la etapa ${n} (${day(a.endedAt)})`;
          if (typeof a.notes === 'string' && a.notes) detail = a.notes;
          items.push({ ...base, kind: 'etapa', text, detail });
          break;
        }
        case 'MemberCompetency': {
          const n = `«${compName(r.competencyId)}»`;
          let text = verb(`Eligió la competencia ${n}`, `Editó la competencia ${n}`, `Quitó la competencia ${n}`);
          let detail: string | null = null;
          if (l.action === 'update' && typeof a.status === 'string') {
            text = `Marcó la competencia ${n} como «${COMPETENCY_STATUS_LABELS[a.status as CompetencyStatus] ?? a.status}»`;
          } else if (l.action === 'update' && 'notes' in a) {
            text = `Anotó en la competencia ${n}`;
            detail = typeof a.notes === 'string' ? a.notes : null;
          }
          items.push({ ...base, kind: 'competencia', text, detail });
          break;
        }
        case 'MemberRole': {
          const role = typeof r.role === 'string' ? `«${r.role}»` : 'un rol';
          const cycle = nameOf(cycles, r.cycleId);
          items.push({
            ...base,
            kind: 'rol',
            text: verb(`Le asignó el rol ${role}`, `Editó el rol ${role}`, `Quitó el rol ${role}`) + (cycle ? ` (${cycle})` : ''),
            detail: typeof a.notes === 'string' && a.notes ? a.notes : null,
          });
          break;
        }
        case 'CycleReview': {
          const cycle = nameOf(cycles, r.cycleId);
          items.push({
            ...base,
            kind: 'revision',
            text: verb('Hizo la revisión de fin de ciclo', 'Editó la revisión de fin de ciclo', 'Borró la revisión de fin de ciclo') + (cycle ? ` (${cycle})` : ''),
            detail: typeof a.educatorReview === 'string' && a.educatorReview ? a.educatorReview : null,
          });
          break;
        }
        case 'MemberSpecialty': {
          const n = q(nameOf(specs, r.specialtyId)) || 'una especialidad';
          items.push({ ...base, kind: 'especialidad', text: verb(`Registró la especialidad ${n}`, `Editó la especialidad ${n}`, `Quitó la especialidad ${n}`) });
          break;
        }
        case 'MemberProgress': {
          const parts: string[] = [];
          if (day(a.ambientacionSince)) parts.push(`ambientación desde el ${day(a.ambientacionSince)}`);
          if (a.transition === true) parts.push('en transición');
          if (a.transition === false && l.action === 'update') parts.push('terminó la transición');
          items.push({
            ...base,
            kind: 'momentos',
            text: 'Actualizó los momentos de la progresión',
            detail: parts.join(' · ') || (typeof a.notes === 'string' ? a.notes : null),
          });
          break;
        }
        case 'Member': {
          const from = nameOf(groups, b.smallGroupId);
          const to = nameOf(groups, a.smallGroupId);
          items.push({
            ...base,
            kind: 'grupo',
            text: to ? `Pasó a ${q(to)}${from ? ` (antes ${q(from)})` : ''}` : `Quedó sin pequeño grupo${from ? ` (antes ${q(from)})` : ''}`,
          });
          break;
        }
      }
    }
    for (const n of notes) {
      items.push({
        id: `nota-${n.id}`,
        at: n.createdAt.toISOString(),
        date: n.date,
        kind: 'nota',
        author: authorOf(n.authorUserId),
        text: n.note,
        detail: null,
        noteId: n.id,
        canDelete: n.authorUserId === req.user!.id || req.auth!.isSuperadmin,
      });
    }
    // Las notas van por su fecha (se pueden anotar después); los cambios, por cuándo se hicieron
    const key = (i: HistoryItem) => (i.date ? `${i.date}T23:59:59.999Z` : i.at);
    items.sort((x, y) => key(y).localeCompare(key(x)) || y.at.localeCompare(x.at));

    const byAuthor = new Map<string, { name: string; count: number; last: string }>();
    for (const i of items) {
      const k = i.author.userId ?? i.author.name;
      const cur = byAuthor.get(k);
      if (cur) cur.count++;
      else byAuthor.set(k, { name: i.author.name, count: 1, last: i.date ?? i.at.slice(0, 10) });
    }
    res.json({ items, authors: [...byAuthor.values()].sort((x, y) => y.count - x.count) });
  }),
);

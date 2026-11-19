import { Router, type Request } from 'express';
import { Op, QueryTypes, type Transaction, type WhereOptions } from 'sequelize';
import {
  areaSchema,
  BRANCH_INFO,
  can,
  canGroupWide,
  competencyBulkSchema,
  formatDate,
  competencySchema,
  cycleSchema,
  meetingSchema,
  parseCompetencyLines,
  sheetActionSchema,
  sheetDuplicateSchema,
  sheetEvaluationSchema,
  sheetSchema,
  SHEET_STATUS_LABELS,
  unitsWith,
  type Branch,
  type SheetStatus,
} from '../shared';
import { sequelize } from '../db';
import { Adult, Member, Unit, User } from '../models';
import {
  ActivityCompetency,
  ActivitySheet,
  BranchArea,
  Competency,
  CycleReview,
  MeetingItem,
  MeetingProgram,
  ProgramCycle,
} from '../models/program';
import { writeAudit } from '../lib/audit';
import { campsOn, sheetSchedule } from '../lib/campProgram';
import { notifyReferents } from '../lib/notify';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';

/** Etapa 3: fichas de actividad, banco, ciclos de programa y programa del sábado. */
export const programRouter = Router();

const adultAttrs = ['id', 'firstName', 'lastName', 'totem'];
const unitAttrs = ['id', 'name', 'code', 'branch'];

/** Puede editar los catálogos de rama (áreas, competencias): superadmin, o quien tiene progresión/aprobación de fichas en todo el Grupo. */
export const canCatalog = (req: Request) =>
  !!req.auth?.isSuperadmin || canGroupWide(req.auth, 'progression', 'edit') || canGroupWide(req.auth, 'activities', 'approve');
const assertCatalog = (req: Request) => {
  if (!canCatalog(req)) throw forbidden('Los catálogos de rama los edita Jefatura, Programa o un superadmin');
};

/** Unidades cuyas fichas puede ver: 'all' o lista de ids. */
const viewableUnits = (req: Request) => unitsWith(req.auth, 'activities', 'view');
const unitFilter = (req: Request, unitId?: string): WhereOptions => {
  const allowed = viewableUnits(req);
  if (unitId) {
    if (allowed !== 'all' && !allowed.includes(unitId)) throw forbidden();
    return { unitId };
  }
  return allowed === 'all' ? {} : { unitId: allowed };
};

// =====================================================================
// Catálogo de áreas y competencias por rama
// =====================================================================
programRouter.get(
  '/areas',
  ah(async (req, res) => {
    const where: WhereOptions = req.query.branch ? { branch: String(req.query.branch) } : {};
    res.json(await BranchArea.findAll({ where, order: [['branch', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']] }));
  }),
);
programRouter.post(
  '/areas',
  ah(async (req, res) => {
    assertCatalog(req);
    const d = parse(areaSchema, req.body);
    res.status(201).json(await BranchArea.create({ branch: d.branch, name: d.name, sortOrder: d.sortOrder ?? 99 }));
  }),
);
programRouter.put(
  '/areas/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const a = await BranchArea.findByPk(req.params.id);
    if (!a) throw notFound();
    const d = parse(areaSchema, req.body);
    await a.update({ name: d.name, sortOrder: d.sortOrder ?? a.sortOrder });
    res.json(a);
  }),
);
programRouter.delete(
  '/areas/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const a = await BranchArea.findByPk(req.params.id);
    if (!a) throw notFound();
    if (await Competency.count({ where: { areaId: a.id } })) throw badRequest('El área tiene competencias: movelas o borralas primero');
    await a.destroy();
    res.json({ ok: true });
  }),
);

programRouter.get(
  '/competencies',
  ah(async (req, res) => {
    const where: WhereOptions = {};
    if (req.query.branch) Object.assign(where, { branch: String(req.query.branch) });
    if (req.query.areaId) Object.assign(where, { areaId: String(req.query.areaId) });
    if (req.query.active !== 'all') Object.assign(where, { active: true });
    const list = await Competency.findAll({
      where,
      include: [{ model: BranchArea, as: 'area', attributes: ['id', 'name', 'sortOrder'] }],
      order: [
        ['number', 'ASC NULLS LAST'],
        ['name', 'ASC'],
      ],
    });
    res.json(list);
  }),
);

async function checkArea(branch: string, areaId: string | null) {
  if (!areaId) return;
  const area = await BranchArea.findByPk(areaId);
  if (!area || area.branch !== branch) throw badRequest('Revisá los datos', { areaId: 'El área no es de esa rama' });
}

programRouter.post(
  '/competencies',
  ah(async (req, res) => {
    assertCatalog(req);
    const d = parse(competencySchema, req.body);
    await checkArea(d.branch, d.areaId);
    res.status(201).json(await Competency.create(d));
  }),
);
programRouter.post(
  '/competencies/bulk',
  ah(async (req, res) => {
    assertCatalog(req);
    const d = parse(competencyBulkSchema, req.body);
    await checkArea(d.branch, d.areaId);
    const rows = parseCompetencyLines(d.text);
    if (!rows.length) throw badRequest('No encontré competencias en el texto');
    const existing = await Competency.findAll({ where: { branch: d.branch } });
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    let created = 0;
    let skipped = 0;
    await sequelize.transaction(async (transaction) => {
      for (const r of rows) {
        const dup = existing.some((c) => (r.number !== null && c.number === r.number) || norm(c.name) === norm(r.name));
        if (dup) {
          skipped++;
          continue;
        }
        const c = await Competency.create({ branch: d.branch, areaId: d.areaId, number: r.number, name: r.name, description: null }, { transaction });
        existing.push(c);
        created++;
      }
    });
    res.json({ created, skipped });
  }),
);
programRouter.put(
  '/competencies/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const c = await Competency.findByPk(req.params.id);
    if (!c) throw notFound();
    const d = parse(competencySchema, req.body);
    await checkArea(d.branch, d.areaId);
    await c.update(d);
    res.json(c);
  }),
);
programRouter.delete(
  '/competencies/:id',
  ah(async (req, res) => {
    assertCatalog(req);
    const c = await Competency.findByPk(req.params.id);
    if (!c) throw notFound();
    const used = await sequelize.query<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM activity_competencies WHERE competency_id = :id) + (SELECT COUNT(*) FROM member_competencies WHERE competency_id = :id AND deleted_at IS NULL) AS n`,
      { type: QueryTypes.SELECT, replacements: { id: c.id } },
    );
    if (Number(used[0]?.n ?? 0) > 0) {
      await c.update({ active: false }); // en uso: se desactiva para no perder el historial
      return res.json({ ok: true, deactivated: true });
    }
    await c.destroy();
    res.json({ ok: true });
  }),
);

// =====================================================================
// Fichas de actividad
// =====================================================================
const sheetUnit = async (req: Request) => (await ActivitySheet.findByPk(req.params.id, { attributes: ['unitId'] }))?.unitId;

const sheetIncludes = (full = false) => [
  { model: Unit, as: 'unit', attributes: unitAttrs },
  { model: ProgramCycle, as: 'cycle', attributes: ['id', 'name', 'startDate', 'endDate'] },
  { model: BranchArea, as: 'area', attributes: ['id', 'name'] },
  { model: Adult, as: 'responsible', attributes: adultAttrs },
  ...(full
    ? [
        { model: User, as: 'approvedBy', attributes: ['id', 'name'] },
        {
          model: Competency,
          as: 'competencies',
          attributes: ['id', 'number', 'name', 'areaId'],
          through: { attributes: [] },
          include: [{ model: BranchArea, as: 'area', attributes: ['id', 'name'] }],
        },
      ]
    : []),
];

/** Próximo código USLC-2026-001 (cuenta también las borradas para no repetir). */
async function nextCode(unit: Unit, date: string | null, transaction?: Transaction) {
  const year = (date ?? new Date().toISOString()).slice(0, 4);
  const prefix = `${unit.code}-${year}-`;
  const rows = await ActivitySheet.findAll({ where: { code: { [Op.like]: `${prefix}%` } }, attributes: ['code'], paranoid: false, transaction });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** Valida que área, ciclo y competencias correspondan a la unidad/rama. */
async function checkSheetRefs(unit: Unit, d: { areaId: string | null; cycleId: string | null; competencyIds: string[] }) {
  await checkArea(unit.branch, d.areaId);
  if (d.cycleId) {
    const c = await ProgramCycle.findByPk(d.cycleId);
    if (!c || c.unitId !== unit.id) throw badRequest('Revisá los datos', { cycleId: 'El ciclo no es de esa unidad' });
  }
  if (d.competencyIds.length) {
    const comps = await Competency.findAll({ where: { id: d.competencyIds } });
    if (comps.length !== new Set(d.competencyIds).size || comps.some((c) => c.branch !== unit.branch)) {
      throw badRequest('Revisá los datos', { competencyIds: 'Hay competencias que no son de la rama de la unidad' });
    }
  }
}

async function setCompetencies(sheetId: string, ids: string[], transaction: Transaction) {
  const current = await ActivityCompetency.findAll({ where: { activitySheetId: sheetId }, transaction });
  const wanted = new Set(ids);
  for (const ac of current) if (!wanted.has(ac.competencyId)) await ac.destroy({ transaction });
  const have = new Set(current.map((c) => c.competencyId));
  for (const id of wanted) if (!have.has(id)) await ActivityCompetency.create({ activitySheetId: sheetId, competencyId: id }, { transaction });
}

const sheetValues = (d: ReturnType<typeof sheetSchema.parse>) => ({
  name: d.name,
  ageMin: d.ageMin,
  ageMax: d.ageMax,
  areaId: d.areaId,
  participants: d.participants,
  objectives: d.objectives,
  exploration: d.exploration,
  description: d.description,
  closing: d.closing,
  otherEducators: d.otherEducators,
  materials: d.materials,
  responsibleAdultId: d.responsibleAdultId,
  date: d.date,
  place: d.place,
  durationMin: d.durationMin,
  opportunityType: d.opportunityType,
  scope: d.scope,
  cycleId: d.cycleId,
  outside: d.outside,
  safety: d.safety,
  nights: d.opportunityType === 'campamento' ? d.nights : null,
});

/**
 * Búsqueda de fichas por su contenido: cada palabra tiene que estar en algún lado de la ficha (código, nombre, lugar,
 * objetivos, competencias, marco de exploración, descripción, recupero, materiales, riesgos o demás educadores).
 * No distingue mayúsculas ni acentos.
 */
const SHEET_FOLD_FROM = 'áéíóúàèìòùâêîôûäëïöüñ';
const SHEET_FOLD_TO = 'aeiouaeiouaeiouaeioun';
function sheetSearch(q: string) {
  const words = q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  if (!words.length) return null;
  const t = '"ActivitySheet"';
  const hay = `translate(lower(concat_ws(' ', ${t}."code", ${t}."name", ${t}."place", ${t}."objectives"::text, ${t}."exploration", ${t}."description", ${t}."closing", ${t}."materials"::text, ${t}."safety", ${t}."other_educators", (SELECT string_agg(c.name, ' ') FROM activity_competencies ac JOIN competencies c ON c.id = ac.competency_id WHERE ac.activity_sheet_id = ${t}."id"))), '${SHEET_FOLD_FROM}', '${SHEET_FOLD_TO}')`;
  return sequelize.literal('(' + words.map((w) => `${hay} LIKE ${sequelize.escape('%' + w.replace(/[\\%_]/g, '\\$&') + '%')}`).join(' AND ') + ')');
}

function serializeSheet(s: ActivitySheet, req: Request) {
  return {
    ...s.toJSON(),
    canEdit: can(req.auth, 'activities', 'edit', s.unitId),
    canApprove: can(req.auth, 'activities', 'approve', s.unitId),
    canDelete: can(req.auth, 'activities', 'delete', s.unitId),
  };
}

/** Cantidad de protagonistas activos de una unidad (para proponer "participantes"). */
programRouter.get(
  '/units/:unitId/defaults',
  ah(async (req, res) => {
    const unit = await Unit.findByPk(req.params.unitId);
    if (!unit) throw notFound();
    const members = await Member.count({ where: { unitId: unit.id, status: 'activo' } });
    const info = BRANCH_INFO[unit.branch as Branch];
    res.json({ members, ageMin: info?.ages[0] ?? null, ageMax: info?.ages[1] ?? null, branch: unit.branch });
  }),
);

programRouter.get(
  '/sheets',
  authorize('activities', 'view'),
  ah(async (req, res) => {
    const where: WhereOptions = { ...unitFilter(req, req.query.unitId ? String(req.query.unitId) : undefined) };
    if (req.query.status) Object.assign(where, { status: String(req.query.status) });
    if (req.query.cycleId) Object.assign(where, { cycleId: String(req.query.cycleId) });
    if (req.query.type) Object.assign(where, { opportunityType: String(req.query.type) });
    if (req.query.year) {
      const y = Number(req.query.year);
      Object.assign(where, { date: { [Op.between]: [`${y}-01-01`, `${y}-12-31`] } });
    }
    const search = sheetSearch(String(req.query.q ?? ''));
    if (search) Object.assign(where, { [Op.and]: [search] });
    const list = await ActivitySheet.findAll({
      where,
      include: sheetIncludes(),
      order: [
        ['date', 'DESC NULLS FIRST'],
        ['createdAt', 'DESC'],
      ],
      limit: 500,
    });
    res.json(list.map((s) => serializeSheet(s, req)));
  }),
);

/** Banco de fichas: todas las unidades (sin borradores ni las que están en revisión). */
programRouter.get(
  '/sheets/bank',
  authorize('activities', 'view'),
  ah(async (req, res) => {
    const where: WhereOptions = { ...unitFilter(req), status: { [Op.in]: ['aprobada', 'realizada', 'evaluada'] } };
    const and: unknown[] = [];
    if (req.query.areaId) Object.assign(where, { areaId: String(req.query.areaId) });
    if (req.query.type) Object.assign(where, { opportunityType: String(req.query.type) });
    if (req.query.place) Object.assign(where, { place: { [Op.iLike]: `%${String(req.query.place)}%` } });
    if (req.query.competencyId) {
      and.push(sequelize.literal(`"ActivitySheet"."id" IN (SELECT activity_sheet_id FROM activity_competencies WHERE competency_id = ${sequelize.escape(String(req.query.competencyId))})`));
    }
    const search = sheetSearch(String(req.query.q ?? ''));
    if (search) and.push(search);
    if (and.length) Object.assign(where, { [Op.and]: and });
    const branch = req.query.branch ? String(req.query.branch) : null;
    const list = await ActivitySheet.findAll({
      where,
      include: [
        { model: Unit, as: 'unit', attributes: unitAttrs, ...(branch ? { where: { branch }, required: true } : {}) },
        { model: BranchArea, as: 'area', attributes: ['id', 'name'] },
        { model: Adult, as: 'responsible', attributes: adultAttrs },
        { model: Competency, as: 'competencies', attributes: ['id', 'number', 'name'], through: { attributes: [] } },
      ],
      order: [['date', 'DESC NULLS LAST']],
      limit: 300,
    });
    res.json(list.map((s) => serializeSheet(s, req)));
  }),
);

programRouter.get(
  '/sheets/:id',
  authorize('activities', 'view', sheetUnit),
  ah(async (req, res) => {
    const s = await ActivitySheet.findByPk(req.params.id, { include: sheetIncludes(true) });
    if (!s) throw notFound();
    res.json({ ...serializeSheet(s, req), schedule: await sheetSchedule(s.id) });
  }),
);

/** Aviso a los referentes de Programa de la rama: se cargó una ficha nueva. */
function notifySheetCreated(req: Request, sheet: ActivitySheet, unit: Unit, copiedFrom?: string) {
  const actor = req.user!;
  const label = BRANCH_INFO[unit.branch as Branch]?.label ?? unit.branch;
  const when = [sheet.date ? formatDate(sheet.date) : null, sheet.place].filter(Boolean).join(' · ');
  void notifyReferents({ id: actor.id, name: actor.name }, [unit.branch], {
    kind: 'ficha',
    title: `Nueva ficha en ${unit.name}: ${sheet.name}`,
    body: `${sheet.code} · cargada por ${actor.name}${when ? ` · ${when}` : ''}`,
    link: `/programa/fichas/${sheet.id}`,
    paragraphs: [
      `${actor.name} cargó la ficha ${sheet.code} «${sheet.name}» en ${unit.name} (${label})${copiedFrom ? `, copiada de ${copiedFrom}` : ''}.`,
      ...(when ? [`Cuándo y dónde: ${when}`] : []),
      'Como referente de Programa de la rama podés revisarla y acompañar a los educadores de la unidad.',
    ],
    button: 'Ver la ficha',
  });
}

programRouter.post(
  '/sheets',
  ah(async (req, res) => {
    const d = parse(sheetSchema, req.body);
    assertCan(req, 'activities', 'create', d.unitId);
    const unit = await Unit.findByPk(d.unitId);
    if (!unit) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
    await checkSheetRefs(unit, d);
    const sheet = await sequelize.transaction(async (transaction) => {
      const s = await ActivitySheet.create(
        { ...sheetValues(d), unitId: unit.id, code: await nextCode(unit, d.date, transaction), approvedByUserId: null },
        { transaction },
      );
      await setCompetencies(s.id, d.competencyIds, transaction);
      return s;
    });
    notifySheetCreated(req, sheet, unit);
    res.status(201).json(sheet);
  }),
);

programRouter.put(
  '/sheets/:id',
  authorize('activities', 'edit', sheetUnit),
  ah(async (req, res) => {
    const s = await ActivitySheet.findByPk(req.params.id);
    if (!s) throw notFound();
    const d = parse(sheetSchema, req.body);
    if (d.unitId !== s.unitId) throw badRequest('Una ficha no cambia de unidad: usá "Duplicar"');
    const unit = (await Unit.findByPk(s.unitId))!;
    await checkSheetRefs(unit, d);
    // Si estaba en revisión o aprobada, al editarla vuelve a borrador (hay que aprobarla de nuevo)
    const reverted = s.status === 'en_revision' || s.status === 'aprobada';
    await sequelize.transaction(async (transaction) => {
      await s.update(
        { ...sheetValues(d), ...(reverted ? { status: 'borrador', approvedByUserId: null, approvedAt: null } : {}) },
        { transaction },
      );
      await setCompetencies(s.id, d.competencyIds, transaction);
    });
    res.json({ ok: true, reverted });
  }),
);

const TRANSITIONS: Record<string, { from: SheetStatus[]; to: SheetStatus; perm: 'edit' | 'approve'; verb: string }> = {
  enviar: { from: ['borrador'], to: 'en_revision', perm: 'edit', verb: 'enviar a revisión' },
  aprobar: { from: ['borrador', 'en_revision'], to: 'aprobada', perm: 'approve', verb: 'aprobar' },
  devolver: { from: ['en_revision', 'aprobada'], to: 'borrador', perm: 'approve', verb: 'devolver' },
  realizada: { from: ['aprobada'], to: 'realizada', perm: 'edit', verb: 'marcar como realizada' },
};

programRouter.post(
  '/sheets/:id/status',
  ah(async (req, res) => {
    const s = await ActivitySheet.findByPk(req.params.id);
    if (!s) throw notFound();
    const d = parse(sheetActionSchema, req.body);
    const t = TRANSITIONS[d.action];
    assertCan(req, 'activities', t.perm, s.unitId);
    if (!t.from.includes(s.status as SheetStatus)) {
      throw badRequest(`No se puede ${t.verb} una ficha en estado "${SHEET_STATUS_LABELS[s.status as SheetStatus] ?? s.status}"`);
    }
    await s.update({
      status: t.to,
      ...(d.action === 'aprobar' ? { approvedByUserId: req.user!.id, approvedAt: new Date(), reviewNotes: d.comment } : {}),
      ...(d.action === 'devolver' ? { approvedByUserId: null, approvedAt: null, reviewNotes: d.comment } : {}),
    });
    res.json({ ok: true, status: s.status });
  }),
);

programRouter.put(
  '/sheets/:id/evaluation',
  authorize('activities', 'edit', sheetUnit),
  ah(async (req, res) => {
    const s = await ActivitySheet.findByPk(req.params.id);
    if (!s) throw notFound();
    if (s.status !== 'realizada' && s.status !== 'evaluada') throw badRequest('Primero marcá la ficha como realizada');
    const d = parse(sheetEvaluationSchema, req.body);
    await s.update({ evalWorked: d.worked, evalChange: d.change, evalAttendance: d.attendance, evaluatedAt: new Date(), status: 'evaluada' });
    res.json({ ok: true });
  }),
);

programRouter.post(
  '/sheets/:id/duplicate',
  authorize('activities', 'view', sheetUnit),
  ah(async (req, res) => {
    const src = await ActivitySheet.findByPk(req.params.id, {
      include: [{ model: Competency, as: 'competencies', attributes: ['id'], through: { attributes: [] } }, { model: BranchArea, as: 'area' }],
    });
    if (!src) throw notFound();
    const { unitId } = parse(sheetDuplicateSchema, req.body);
    assertCan(req, 'activities', 'create', unitId);
    const target = await Unit.findByPk(unitId);
    if (!target) throw badRequest('Unidad inexistente');
    const srcUnit = (await Unit.findByPk(src.unitId))!;
    const sameBranch = srcUnit.branch === target.branch;
    // Área: la de igual nombre en la rama destino. Competencias: solo si es la misma rama.
    let areaId: string | null = sameBranch ? src.areaId : null;
    if (!sameBranch && src.area) {
      const a = await BranchArea.findOne({ where: { branch: target.branch, name: src.area.name } });
      areaId = a?.id ?? null;
    }
    const info = BRANCH_INFO[target.branch as Branch];
    const copy = await sequelize.transaction(async (transaction) => {
      const c = await ActivitySheet.create(
        {
          code: await nextCode(target, null, transaction),
          unitId: target.id,
          cycleId: null,
          name: src.name,
          ageMin: sameBranch ? src.ageMin : info?.ages[0] ?? null,
          ageMax: sameBranch ? src.ageMax : info?.ages[1] ?? null,
          areaId,
          participants: await Member.count({ where: { unitId: target.id, status: 'activo' }, transaction }),
          objectives: src.objectives,
          exploration: src.exploration,
          description: src.description,
          closing: src.closing,
          otherEducators: src.otherEducators,
          materials: src.materials,
          responsibleAdultId: null,
          date: null,
          place: src.place,
          durationMin: src.durationMin,
          opportunityType: src.opportunityType,
          scope: src.scope,
          outside: src.outside,
          safety: src.safety,
          nights: src.nights,
          status: 'borrador',
          approvedByUserId: null,
          sourceSheetId: src.id,
        },
        { transaction },
      );
      if (sameBranch) await setCompetencies(c.id, (src.competencies ?? []).map((x) => x.id), transaction);
      return c;
    });
    notifySheetCreated(req, copy, target, src.code);
    res.status(201).json({ id: copy.id, code: copy.code, competenciesKept: sameBranch });
  }),
);

programRouter.delete(
  '/sheets/:id',
  authorize('activities', 'delete', sheetUnit),
  ah(async (req, res) => {
    const s = await ActivitySheet.findByPk(req.params.id);
    if (!s) throw notFound();
    await sequelize.transaction(async (transaction) => {
      await MeetingItem.update({ activitySheetId: null }, { where: { activitySheetId: s.id }, transaction });
      await s.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// =====================================================================
// Ciclos de programa
// =====================================================================
const cycleUnit = async (req: Request) => (await ProgramCycle.findByPk(req.params.id, { attributes: ['unitId'] }))?.unitId;

programRouter.get(
  '/cycles',
  authorize('activities', 'view'),
  ah(async (req, res) => {
    const where: WhereOptions = { ...unitFilter(req, req.query.unitId ? String(req.query.unitId) : undefined) };
    const cycles = await ProgramCycle.findAll({
      where,
      include: [{ model: Unit, as: 'unit', attributes: unitAttrs }],
      order: [['startDate', 'DESC NULLS LAST']],
    });
    const counts = cycles.length
      ? await sequelize.query<{ cycle_id: string; n: number; done: number }>(
          `SELECT cycle_id, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE status IN ('realizada','evaluada'))::int AS done
           FROM activity_sheets WHERE deleted_at IS NULL AND cycle_id IN (:ids) GROUP BY cycle_id`,
          { type: QueryTypes.SELECT, replacements: { ids: cycles.map((c) => c.id) } },
        )
      : [];
    res.json(
      cycles.map((c) => ({
        ...c.toJSON(),
        sheetCount: counts.find((x) => x.cycle_id === c.id)?.n ?? 0,
        doneCount: counts.find((x) => x.cycle_id === c.id)?.done ?? 0,
        canEdit: can(req.auth, 'activities', 'edit', c.unitId),
      })),
    );
  }),
);

programRouter.get(
  '/cycles/:id',
  authorize('activities', 'view', cycleUnit),
  ah(async (req, res) => {
    const c = await ProgramCycle.findByPk(req.params.id, { include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] });
    if (!c) throw notFound();
    const [sheets, reviews] = await Promise.all([
      ActivitySheet.findAll({ where: { cycleId: c.id }, include: sheetIncludes(), order: [['date', 'ASC NULLS LAST']] }),
      can(req.auth, 'progression', 'view', c.unitId)
        ? CycleReview.findAll({
            where: { cycleId: c.id },
            include: [{ model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName'] }],
            order: [['date', 'DESC NULLS LAST']],
          })
        : Promise.resolve([] as CycleReview[]),
    ]);
    res.json({
      ...c.toJSON(),
      canEdit: can(req.auth, 'activities', 'edit', c.unitId),
      canDelete: can(req.auth, 'activities', 'delete', c.unitId),
      canCreateSheets: can(req.auth, 'activities', 'create', c.unitId),
      sheets: sheets.map((s) => serializeSheet(s, req)),
      reviews,
    });
  }),
);

programRouter.post(
  '/cycles',
  ah(async (req, res) => {
    const d = parse(cycleSchema, req.body);
    assertCan(req, 'activities', 'create', d.unitId);
    if (!(await Unit.findByPk(d.unitId))) throw badRequest('Unidad inexistente');
    res.status(201).json(await ProgramCycle.create(d));
  }),
);

programRouter.put(
  '/cycles/:id',
  authorize('activities', 'edit', cycleUnit),
  ah(async (req, res) => {
    const c = await ProgramCycle.findByPk(req.params.id);
    if (!c) throw notFound();
    const d = parse(cycleSchema, req.body);
    if (d.unitId !== c.unitId) throw badRequest('Un ciclo no cambia de unidad');
    await c.update(d);
    res.json(c);
  }),
);

programRouter.delete(
  '/cycles/:id',
  authorize('activities', 'delete', cycleUnit),
  ah(async (req, res) => {
    const c = await ProgramCycle.findByPk(req.params.id);
    if (!c) throw notFound();
    await sequelize.transaction(async (transaction) => {
      const sheets = await ActivitySheet.findAll({ where: { cycleId: c.id }, transaction });
      for (const s of sheets) await s.update({ cycleId: null }, { transaction });
      await c.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// =====================================================================
// Programa del sábado
// =====================================================================
programRouter.get(
  '/meetings',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    const date = String(req.query.date ?? '');
    if (!unitId || !date) throw badRequest('Faltan la unidad y la fecha');
    assertCan(req, 'activities', 'view', unitId);
    const program = await MeetingProgram.findOne({
      where: { unitId, date },
      include: [
        {
          model: MeetingItem,
          as: 'items',
          include: [
            { model: ActivitySheet, as: 'sheet', attributes: ['id', 'code', 'name', 'durationMin', 'place', 'status'] },
            { model: Adult, as: 'responsible', attributes: adultAttrs },
          ],
        },
      ],
      order: [[{ model: MeetingItem, as: 'items' }, 'sortOrder', 'ASC']],
    });
    res.json({ program, canEdit: can(req.auth, 'activities', 'edit', unitId), camps: await campsOn(unitId, date) });
  }),
);

programRouter.get(
  '/meetings/dates',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    if (!unitId) throw badRequest('Falta la unidad');
    assertCan(req, 'activities', 'view', unitId);
    const rows = await MeetingProgram.findAll({ where: { unitId }, attributes: ['id', 'date'], order: [['date', 'DESC']], limit: 60 });
    res.json(rows.map((r) => r.date));
  }),
);

programRouter.put(
  '/meetings',
  ah(async (req, res) => {
    const d = parse(meetingSchema, req.body);
    assertCan(req, 'activities', 'edit', d.unitId);
    const sheetIds = d.items.map((i) => i.activitySheetId).filter((x): x is string => !!x);
    if (sheetIds.length) {
      const n = await ActivitySheet.count({ where: { id: sheetIds, unitId: d.unitId } });
      if (n !== new Set(sheetIds).size) throw badRequest('Hay fichas que no son de esta unidad');
    }
    const program = await sequelize.transaction(async (transaction) => {
      let p = await MeetingProgram.findOne({ where: { unitId: d.unitId, date: d.date }, transaction });
      if (p) await p.update({ notes: d.notes }, { transaction });
      else p = await MeetingProgram.create({ unitId: d.unitId, date: d.date, notes: d.notes }, { transaction });
      await MeetingItem.destroy({ where: { meetingProgramId: p.id }, transaction });
      for (const [i, it] of d.items.entries()) {
        await MeetingItem.create(
          {
            meetingProgramId: p.id,
            sortOrder: i,
            time: it.time,
            activitySheetId: it.activitySheetId,
            title: it.title,
            responsibleAdultId: it.responsibleAdultId,
            // Si se eligió una persona, el texto libre no se guarda
            responsibleText: it.responsibleAdultId ? null : it.responsibleText,
            durationMin: it.durationMin,
            notes: it.notes,
          },
          { transaction },
        );
      }
      await writeAudit({ action: 'update', entity: 'MeetingProgram', entityId: p.id, summary: `Programa del ${d.date}: ${d.items.length} momentos` }, transaction);
      return p;
    });
    res.json({ ok: true, id: program.id });
  }),
);

programRouter.delete(
  '/meetings',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    const date = String(req.query.date ?? '');
    assertCan(req, 'activities', 'edit', unitId);
    const p = await MeetingProgram.findOne({ where: { unitId, date } });
    if (!p) throw notFound();
    await sequelize.transaction(async (transaction) => {
      await MeetingItem.destroy({ where: { meetingProgramId: p.id }, transaction });
      await p.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

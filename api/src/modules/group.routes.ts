import { Router, type Request } from 'express';
import { QueryTypes } from 'sequelize';
import {
  BRANCH_INFO,
  courseSchema,
  documentTypeSchema,
  GROUP_CONTEXT,
  smallGroupSchema,
  supportTeamSchema,
  unitSchema,
  type Branch,
} from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, AdultCourse, AdultDocument, Course, DocumentType, Member, MemberDocument, SmallGroup, SupportTeam, Unit } from '../models';
import { ah, badRequest, conflict, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';

export const groupRouter = Router();

const currentYear = () => new Date().getFullYear();
const branchOrder = (b: string) => BRANCH_INFO[b as Branch]?.order ?? 99;

// ---------------- Unidades ----------------
groupRouter.get(
  '/units',
  ah(async (_req, res) => {
    // Lista básica de unidades: la usan todos los formularios, cualquier usuario autenticado la puede ver.
    const units = await Unit.findAll({ include: [{ model: SmallGroup, as: 'smallGroups' }] });
    const counts = await sequelize.query<{ unit_id: string; members: number }>(
      `SELECT unit_id, COUNT(*)::int AS members FROM members WHERE deleted_at IS NULL AND status = 'activo' GROUP BY unit_id`,
      { type: QueryTypes.SELECT },
    );
    const adults = await sequelize.query<{ unit_id: string; adults: number }>(
      `SELECT a.unit_id, COUNT(DISTINCT a.adult_id)::int AS adults FROM adult_assignments a
       JOIN adults ad ON ad.id = a.adult_id AND ad.deleted_at IS NULL AND ad.status <> 'baja'
       WHERE a.deleted_at IS NULL AND a.year = :year AND a.unit_id IS NOT NULL GROUP BY a.unit_id`,
      { type: QueryTypes.SELECT, replacements: { year: currentYear() } },
    );
    const out = units
      .map((u) => ({
        ...u.toJSON(),
        smallGroups: [...(u.smallGroups ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        memberCount: counts.find((c) => c.unit_id === u.id)?.members ?? 0,
        adultCount: adults.find((c) => c.unit_id === u.id)?.adults ?? 0,
      }))
      .sort((a, b) => branchOrder(a.branch) - branchOrder(b.branch) || a.name.localeCompare(b.name));
    res.json(out);
  }),
);

groupRouter.post(
  '/units',
  authorize('group', 'create'),
  ah(async (req, res) => {
    const data = parse(unitSchema, req.body);
    if (await Unit.findOne({ where: { code: data.code } })) throw conflict('Ya existe una unidad con ese código');
    res.status(201).json(await Unit.create(data));
  }),
);

groupRouter.put(
  '/units/:id',
  authorize('group', 'edit'),
  ah(async (req, res) => {
    const data = parse(unitSchema, req.body);
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) throw notFound();
    const dup = await Unit.findOne({ where: { code: data.code } });
    if (dup && dup.id !== unit.id) throw conflict('Ya existe una unidad con ese código');
    await unit.update(data);
    res.json(unit);
  }),
);

groupRouter.delete(
  '/units/:id',
  authorize('group', 'delete'),
  ah(async (req, res) => {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) throw notFound();
    if (await Member.count({ where: { unitId: unit.id } })) throw badRequest('La unidad tiene protagonistas. Desactivala en lugar de eliminarla.');
    await unit.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Pequeños grupos ----------------
const sgUnit = async (req: Request) => (await SmallGroup.findByPk(req.params.id))?.unitId;

groupRouter.post(
  '/small-groups',
  ah(async (req, res) => {
    const data = parse(smallGroupSchema, req.body);
    assertCan(req, 'small_groups', 'create', data.unitId);
    res.status(201).json(await SmallGroup.create(data));
  }),
);

groupRouter.put(
  '/small-groups/:id',
  authorize('small_groups', 'edit', sgUnit),
  ah(async (req, res) => {
    const data = parse(smallGroupSchema, req.body);
    const sg = await SmallGroup.findByPk(req.params.id);
    if (!sg) throw notFound();
    if (data.unitId !== sg.unitId) throw badRequest('Un pequeño grupo no puede cambiar de unidad');
    await sg.update({ name: data.name, kind: data.kind, active: data.active });
    res.json(sg);
  }),
);

groupRouter.delete(
  '/small-groups/:id',
  authorize('small_groups', 'delete', sgUnit),
  ah(async (req, res) => {
    const sg = await SmallGroup.findByPk(req.params.id);
    if (!sg) throw notFound();
    await sequelize.transaction(async (transaction) => {
      const members = await Member.findAll({ where: { smallGroupId: sg.id }, transaction });
      for (const m of members) await m.update({ smallGroupId: null }, { transaction });
      await sg.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

// ---------------- Equipos de apoyo ----------------
groupRouter.get(
  '/support-teams',
  authorize('group', 'view'),
  ah(async (_req, res) => {
    const teams = await SupportTeam.findAll({
      include: [{ model: Adult, as: 'leader', attributes: ['id', 'firstName', 'lastName', 'totem'] }],
      order: [['name', 'ASC']],
    });
    const members = await AdultAssignment.findAll({
      where: { year: currentYear() },
      include: [{ model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName', 'totem', 'status'], required: true }],
    });
    res.json(
      teams.map((t) => ({
        ...t.toJSON(),
        members: members
          .filter((m) => m.supportTeamId === t.id && m.adult?.status !== 'baja')
          .map((m) => ({ id: m.adult!.id, firstName: m.adult!.firstName, lastName: m.adult!.lastName, totem: m.adult!.totem, position: m.position })),
      })),
    );
  }),
);

groupRouter.post(
  '/support-teams',
  authorize('group', 'create'),
  ah(async (req, res) => {
    const d = parse(supportTeamSchema, req.body);
    res.status(201).json(await SupportTeam.create({ ...d, receivesRegistryAlerts: d.receivesRegistryAlerts ?? false }));
  }),
);

groupRouter.put(
  '/support-teams/:id',
  authorize('group', 'edit'),
  ah(async (req, res) => {
    const team = await SupportTeam.findByPk(req.params.id);
    if (!team) throw notFound();
    const { receivesRegistryAlerts, ...d } = parse(supportTeamSchema, req.body);
    await team.update({ ...d, ...(receivesRegistryAlerts !== undefined ? { receivesRegistryAlerts } : {}) });
    res.json(team);
  }),
);

groupRouter.delete(
  '/support-teams/:id',
  authorize('group', 'delete'),
  ah(async (req, res) => {
    const team = await SupportTeam.findByPk(req.params.id);
    if (!team) throw notFound();
    await team.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Organigrama (solo datos no sensibles) ----------------
// Misma estructura que el organigrama del Grupo en el Drive: Jefatura → Comité Ejecutivo → Ramas menores / mayores
// → Familia scout y apoyo a adultos. Todo sale de los cargos del año; no se escribe a mano.
const KIDS_PER_ADULT = 6; // protagonistas por adulto, para calcular cuántos adultos le faltan a una unidad
const MENORES: Branch[] = ['castores', 'lobatos', 'scouts']; // las Unidades Scouts figuran en ramas menores
const MAYORES: Branch[] = ['caminantes', 'rovers'];
const AREA_ORDER = [
  'programa y asesores personales',
  'espiritualidad',
  'secretaria',
  'administracion y finanzas',
  'infraestructura',
  'sistemas',
  'comunicaciones',
];
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
const isJefeGrupo = (p: string) => /jef[ea]\/?a? de grupo/i.test(p);
const isSubjefeUnidad = (p: string) => /^sub[\s-]*jef/i.test(p) && !/de grupo/i.test(p);
const isJefeUnidad = (p: string) => /^jef[ea]/i.test(p) && !/de grupo/i.test(p);
const isAsesor = (p: string) => /asesor\/?a? personal/i.test(p);
const isPadre = (p: string) => /padre.*representante|representante.*padre/i.test(p);
const isAcompanante = (p: string) => /acompa[nñ]/i.test(p);

interface OrgPerson {
  id: string;
  name: string;
  totem: string | null;
  position: string;
}

groupRouter.get(
  '/organigrama',
  authorize('group', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || currentYear();
    const [units, teams, assignments, kidsRows] = await Promise.all([
      Unit.findAll({ where: { active: true } }),
      SupportTeam.findAll({ include: [{ model: Adult, as: 'leader', attributes: ['id', 'firstName', 'lastName', 'totem', 'status'] }] }),
      AdultAssignment.findAll({
        where: { year },
        include: [{ model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName', 'totem', 'status'], required: true }],
      }),
      sequelize.query<{ unit_id: string; n: number }>(
        `SELECT unit_id, COUNT(*)::int AS n FROM members WHERE deleted_at IS NULL AND status = 'activo' AND unit_id IS NOT NULL GROUP BY unit_id`,
        { type: QueryTypes.SELECT },
      ),
    ]);

    const fullName = (a: { firstName: string; lastName: string }) => `${a.lastName}, ${a.firstName}`;
    const person = (a: AdultAssignment): OrgPerson => ({ id: a.adult!.id, name: fullName(a.adult!), totem: a.adult!.totem, position: a.position });
    const byName = (x: OrgPerson, y: OrgPerson) => x.name.localeCompare(y.name, 'es');
    /** Una persona por adulto y cargo (por si quedó cargado dos veces). */
    const uniq = (list: OrgPerson[]) => [...new Map(list.map((p) => [`${p.id}|${p.position}`, p])).values()].sort(byName);
    const active = assignments.filter((a) => a.adult?.status !== 'baja');
    const groupLevel = active.filter((a) => !a.unitId && !a.supportTeamId && !a.branch);

    // ---- Jefatura ----
    const jefeGrupo = uniq(groupLevel.filter((a) => isJefeGrupo(a.position) && !/sub/i.test(a.position)).map(person));
    const subjefeGrupo = uniq(groupLevel.filter((a) => isJefeGrupo(a.position) && /sub/i.test(a.position)).map(person));

    // ---- Comité Ejecutivo y áreas ----
    const comiteTeam = teams.find((t) => norm(t.name) === 'comite ejecutivo') ?? null;
    const leaderOf = (t: SupportTeam): OrgPerson | null =>
      t.leader && t.leader.status !== 'baja' ? { id: t.leader.id, name: fullName(t.leader), totem: t.leader.totem, position: 'Responsable' } : null;
    const directorFromAssignment = active.find((a) => /director ejecutivo/i.test(a.position));
    const director: OrgPerson | null = (comiteTeam && leaderOf(comiteTeam)) ?? (directorFromAssignment ? person(directorFromAssignment) : null);
    const areaRank = (name: string) => {
      const i = AREA_ORDER.indexOf(norm(name));
      return i === -1 ? AREA_ORDER.length : i;
    };
    const areas = teams
      .filter((t) => t !== comiteTeam)
      .sort((a, b) => areaRank(a.name) - areaRank(b.name) || a.name.localeCompare(b.name, 'es'))
      .map((t) => ({
        id: t.id,
        name: t.name,
        leader: leaderOf(t),
        members: uniq(active.filter((a) => a.supportTeamId === t.id).map(person)),
      }));
    // Todos los del equipo de apoyo menos el Director, con su cargo entre paréntesis (como en el Drive)
    const supportOthers = uniq(
      active.filter((a) => a.supportTeamId && !(director && a.adult!.id === director.id && a.supportTeamId === comiteTeam?.id)).map(person),
    );
    const asesores = uniq(active.filter((a) => isAsesor(a.position)).map(person));

    // ---- Unidades ----
    const kidsByUnit = new Map(kidsRows.map((r) => [r.unit_id, r.n]));
    const unitCard = (u: Unit) => {
      const own = active.filter((a) => a.unitId === u.id);
      const jefes = uniq(own.filter((a) => isJefeUnidad(a.position) && !isSubjefeUnidad(a.position)).map(person));
      const subjefes = uniq(own.filter((a) => isSubjefeUnidad(a.position)).map(person));
      const ayudantes = uniq(own.filter((a) => !isJefeUnidad(a.position) && !isSubjefeUnidad(a.position)).map(person)).map((p) => ({
        ...p,
        // "(Colaboradora)", "(Asesor/a …)": se aclara cuando no es Ayudante
        note: /^ayudante/i.test(p.position) ? null : p.position,
      }));
      const adults = new Set(own.map((a) => a.adult!.id)).size;
      const kids = kidsByUnit.get(u.id) ?? 0;
      const minAdults = u.minAdults ?? Math.ceil(kids / KIDS_PER_ADULT);
      const status: 'ok' | 'faltan' | 'sin_chicos' = kids === 0 ? 'sin_chicos' : adults >= minAdults ? 'ok' : 'faltan';
      return {
        id: u.id,
        name: u.name,
        code: u.code,
        branch: u.branch,
        jefes,
        subjefes,
        ayudantes,
        adults,
        kids,
        minAdults,
        missing: Math.max(0, minAdults - adults),
        status,
      };
    };
    const sortedUnits = [...units].sort((a, b) => branchOrder(a.branch) - branchOrder(b.branch) || a.name.localeCompare(b.name, 'es'));

    // ---- Familia scout y apoyo a adultos ----
    const padres = uniq(active.filter((a) => isPadre(a.position)).map(person));
    const acompanantes = uniq(active.filter((a) => isAcompanante(a.position)).map(person));
    const sinUnidad = uniq(active.filter((a) => !a.unitId && !a.supportTeamId && a.branch).map(person)).map((p) => {
      const a = active.find((x) => x.adult!.id === p.id && x.position === p.position)!;
      return { ...p, branch: a.branch!, branchLabel: BRANCH_INFO[a.branch as Branch]?.label ?? a.branch! };
    });
    // Cargos de Grupo que no entran en ningún bloque anterior
    const otros = uniq(
      groupLevel
        .filter((a) => !isJefeGrupo(a.position) && !isAsesor(a.position) && !isPadre(a.position) && !isAcompanante(a.position))
        .filter((a) => !/director ejecutivo/i.test(a.position))
        .map(person),
    );

    res.json({
      year,
      context: GROUP_CONTEXT,
      jefatura: { jefe: jefeGrupo, subjefe: subjefeGrupo },
      comite: { teamId: comiteTeam?.id ?? null, director, areas, others: supportOthers },
      asesores,
      ramasMenores: { supervisor: subjefeGrupo[0] ?? null, units: sortedUnits.filter((u) => MENORES.includes(u.branch as Branch)).map(unitCard) },
      ramasMayores: { supervisor: jefeGrupo[0] ?? null, units: sortedUnits.filter((u) => MAYORES.includes(u.branch as Branch)).map(unitCard) },
      familia: { padres, acompanantes, sinUnidad },
      otros,
    });
  }),
);

// ---------------- Catálogos ----------------
groupRouter.get(
  '/document-types',
  ah(async (_req, res) => {
    res.json(await DocumentType.findAll({ order: [['appliesTo', 'DESC'], ['sortOrder', 'ASC'], ['name', 'ASC']] }));
  }),
);
groupRouter.post(
  '/document-types',
  authorize('group', 'edit'),
  ah(async (req, res) => {
    res.status(201).json(await DocumentType.create({ ...parse(documentTypeSchema, req.body), code: null }));
  }),
);
groupRouter.put(
  '/document-types/:id',
  authorize('group', 'edit'),
  ah(async (req, res) => {
    const dt = await DocumentType.findByPk(req.params.id);
    if (!dt) throw notFound();
    await dt.update(parse(documentTypeSchema, req.body));
    res.json(dt);
  }),
);

/**
 * Eliminar un documento del catálogo: solo si nadie lo tiene cargado (si no, se perdería ese registro del legajo)
 * y si no es uno de los del legajo de Scouts de Argentina que usa la app (esos se desactivan).
 */
groupRouter.delete(
  '/document-types/:id',
  authorize('group', 'edit'),
  ah(async (req, res) => {
    const dt = await DocumentType.findByPk(req.params.id);
    if (!dt) throw notFound();
    if (dt.code) throw badRequest('Es uno de los documentos del legajo que usa la app (autorizaciones, campamentos): no se elimina. Si no lo usan, desactivalo con «Editar».');
    const used = (await MemberDocument.count({ where: { documentTypeId: dt.id } })) + (await AdultDocument.count({ where: { documentTypeId: dt.id } }));
    if (used) {
      throw badRequest(
        `Ya está cargado en ${used} ${used === 1 ? 'legajo' : 'legajos'}: no se puede eliminar sin perder ese registro. Desactivalo con «Editar» y deja de pedirse.`,
      );
    }
    await dt.destroy();
    res.json({ ok: true });
  }),
);

groupRouter.get(
  '/courses',
  ah(async (_req, res) => {
    res.json(await Course.findAll({ order: [['kind', 'ASC'], ['name', 'ASC']] }));
  }),
);
groupRouter.post(
  '/courses',
  authorize('training', 'create'),
  ah(async (req, res) => {
    res.status(201).json(await Course.create(parse(courseSchema, req.body)));
  }),
);
groupRouter.put(
  '/courses/:id',
  authorize('training', 'edit'),
  ah(async (req, res) => {
    const c = await Course.findByPk(req.params.id);
    if (!c) throw notFound();
    await c.update(parse(courseSchema, req.body));
    res.json(c);
  }),
);
/** Eliminar un curso: solo si ningún adulto lo tiene registrado en su formación (si no, se desactiva). */
groupRouter.delete(
  '/courses/:id',
  authorize('training', 'delete'),
  ah(async (req, res) => {
    const c = await Course.findByPk(req.params.id);
    if (!c) throw notFound();
    const used = await AdultCourse.count({ where: { courseId: c.id } });
    if (used) {
      throw badRequest(
        `Está en la formación de ${used} ${used === 1 ? 'adulto' : 'adultos'}: no se puede eliminar sin perder ese registro. Desactivalo con «Editar» y deja de ofrecerse.`,
      );
    }
    await c.destroy();
    res.json({ ok: true });
  }),
);

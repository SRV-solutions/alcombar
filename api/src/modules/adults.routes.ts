import { Router } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { adultAssignmentSchema, adultCourseSchema, adultSchema, ADULT_STATUS_LABELS, documentStatus, formatDate, isTeamLeaderPosition, memberDocumentSchema, todayIso, type AdultStatus } from '../shared';
import { Adult, AdultAssignment, AdultCourse, AdultDocument, Course, DocumentType, Role, SupportTeam, Unit, User, UserRole } from '../models';
import { writeAudit } from '../lib/audit';
import { personSearchWhere } from '../lib/personSearch';
import { adultRegistered, recordRegistryChanges, registryTransition } from '../lib/registry';
import { sendCsv, toCsv } from '../lib/csv';
import { ah, badRequest, notFound, parse } from '../lib/errors';
import { authorize } from '../middlewares/auth';

export const adultsRouter = Router();

/**
 * Cuando un cargo de unidad ("Jefe/a de …", "Subjefe/a", "Ayudante de …", "Colaborador/a") queda con su unidad,
 * el usuario de ese adulto recibe el rol que corresponde en esa unidad (si no lo tenía). Así cualquier adulto de
 * la unidad puede mover a los chicos de pequeño grupo y llevar su progresión, solo en su unidad.
 */
export function unitRoleForPosition(position: string): 'jefe_unidad' | 'educador' | null {
  if (/de grupo/i.test(position)) return null;
  if (/^jef[ea]/i.test(position)) return 'jefe_unidad';
  if (/^(sub\s*-?\s*jef[ea]|ayudante|colaborador)/i.test(position)) return 'educador';
  return null;
}
const currentYear = () => new Date().getFullYear();
const UNIT_ROLE_KEYS = ['jefe_unidad', 'educador'] as const;

/**
 * Los roles de unidad siguen a los cargos del año: en cada unidad tocada, el usuario del adulto queda con el rol
 * que piden sus cargos ahí (Jefe → jefe de unidad; subjefe, ayudante o colaborador → educador) y pierde el que
 * ya no corresponde. Solo se mira el año en curso (o los siguientes): editar cargos viejos no cambia permisos.
 */
async function syncUnitRoles(adultId: string, unitIds: (string | null | undefined)[]) {
  const ids = [...new Set(unitIds.filter((x): x is string => !!x))];
  if (!ids.length) return;
  const user = await User.findOne({ where: { adultId } });
  if (!user) return;
  const roles = await Role.findAll({ where: { key: [...UNIT_ROLE_KEYS] } });
  const cargos = await AdultAssignment.findAll({ where: { adultId, unitId: ids, year: { [Op.gte]: currentYear() } } });
  for (const unitId of ids) {
    const want = new Set(cargos.filter((c) => c.unitId === unitId).map((c) => unitRoleForPosition(c.position)));
    for (const role of roles) {
      const has = await UserRole.findOne({ where: { userId: user.id, roleId: role.id, unitId } });
      if (want.has(role.key as (typeof UNIT_ROLE_KEYS)[number]) && !has) await UserRole.create({ userId: user.id, roleId: role.id, unitId });
      else if (!want.has(role.key as (typeof UNIT_ROLE_KEYS)[number]) && has) await has.destroy();
    }
  }
}

/** "Encargado/a de equipo" del año en curso = responsable del equipo. Si deja de serlo, el equipo queda sin responsable. */
async function syncTeamLeader(adultId: string, before: { supportTeamId: string | null; position: string; year: number } | null, after: { supportTeamId: string | null; position: string; year: number } | null) {
  const leads = (x: typeof before) => !!x && !!x.supportTeamId && x.year === currentYear() && isTeamLeaderPosition(x.position);
  if (leads(before) && (!leads(after) || after!.supportTeamId !== before!.supportTeamId)) {
    await SupportTeam.update({ leaderAdultId: null }, { where: { id: before!.supportTeamId!, leaderAdultId: adultId } });
  }
  if (leads(after)) {
    const team = await SupportTeam.findByPk(after!.supportTeamId!);
    if (team && team.leaderAdultId !== adultId) {
      const previous = team.leaderAdultId;
      await team.update({ leaderAdultId: adultId });
      // El encargado/a anterior sigue en el equipo, como integrante
      if (previous) {
        const old = await AdultAssignment.findAll({ where: { adultId: previous, supportTeamId: team.id, year: currentYear() } });
        for (const a of old) if (isTeamLeaderPosition(a.position)) await a.update({ position: 'Integrante de equipo' });
      }
    }
  }
}

/** Unidad o equipo, no los dos; la rama solo vale sin unidad. */
function cargoData(data: ReturnType<typeof adultAssignmentSchema.parse>, current?: AdultAssignment) {
  if (data.unitId && data.supportTeamId) throw badRequest('Revisá los datos', { supportTeamId: 'Elegí una unidad o un equipo, no los dos' });
  const { branch, ...rest } = data;
  const nextBranch = data.unitId ? null : branch === undefined ? (current?.branch ?? null) : branch || null;
  return { ...rest, branch: nextBranch };
}

const assignmentInclude = [
  { model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'branch'] },
  { model: SupportTeam, as: 'supportTeam', attributes: ['id', 'name'] },
];

adultsRouter.get(
  '/',
  authorize('adults', 'view'),
  ah(async (req, res) => {
    const where: WhereOptions = {};
    const q = String(req.query.q ?? '').trim();
    const search = q ? personSearchWhere(q, ['Adult.first_name', 'Adult.last_name', 'Adult.totem', 'Adult.dni'], 'Adult.dni') : null;
    if (search) Object.assign(where, { [Op.and]: [search] });
    if (req.query.status) Object.assign(where, { status: String(req.query.status) });
    const year = Number(req.query.year) || currentYear();
    const adults = await Adult.findAll({
      where,
      include: [
        { model: AdultAssignment, as: 'assignments', required: false, where: { year }, include: assignmentInclude },
        { model: AdultCourse, as: 'courses', required: false, include: [{ model: Course, as: 'course', attributes: ['id', 'name', 'kind', 'totalModules'] }] },
        { model: User, as: 'user', attributes: ['id', 'active'], required: false },
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const unitId = String(req.query.unitId ?? '');
    const list = unitId ? adults.filter((a) => (a.assignments ?? []).some((x) => x.unitId === unitId)) : adults;
    // Resumen de documentación (cuántos documentos obligatorios tiene al día)
    const [types, docs] = await Promise.all([
      DocumentType.findAll({ where: { active: true, appliesTo: 'adult' } }),
      list.length ? AdultDocument.findAll({ where: { adultId: list.map((a) => a.id) } }) : Promise.resolve([] as AdultDocument[]),
    ]);
    const today = todayIso();
    res.json(
      list.map((a) => {
        const s = { ok: 0, expiring: 0, expired: 0, missing: 0, total: types.length };
        for (const t of types) s[documentStatus(docs.find((d) => d.adultId === a.id && d.documentTypeId === t.id), t.hasExpiry, today, t.required)]++;
        return { ...a.toJSON(), docs: s };
      }),
    );
  }),
);

adultsRouter.get(
  '/export',
  authorize('adults', 'export'),
  ah(async (_req, res) => {
    const year = currentYear();
    const adults = await Adult.findAll({
      include: [
        { model: AdultAssignment, as: 'assignments', required: false, where: { year }, include: assignmentInclude },
        { model: AdultCourse, as: 'courses', required: false, include: [{ model: Course, as: 'course' }] },
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const csv = toCsv(
      ['apellido', 'nombre', 'totem', 'dni', 'fecha_nacimiento', 'email', 'telefono', 'direccion', 'fecha_ingreso', 'estado', `cargos_${year}`, 'formacion'],
      adults.map((a) => [
        a.lastName,
        a.firstName,
        a.totem,
        a.dni,
        formatDate(a.birthDate),
        a.email,
        a.phone,
        a.address,
        formatDate(a.joinedAt),
        ADULT_STATUS_LABELS[a.status as AdultStatus] ?? a.status,
        (a.assignments ?? []).map((x) => `${x.position}${x.unit ? ` (${x.unit.code})` : x.supportTeam ? ` (${x.supportTeam.name})` : ''}`).join(' | '),
        (a.courses ?? [])
          .map((c) => `${c.course?.name ?? ''}${c.modulesDone != null && c.course?.totalModules ? ` ${c.modulesDone}/${c.course.totalModules}` : ''}${c.completedAt ? ` ${formatDate(c.completedAt)}` : ''}`)
          .join(' | '),
      ]),
    );
    await writeAudit({ action: 'export', entity: 'Adult', summary: `Exportación de ${adults.length} adultos` });
    sendCsv(res, `adultos-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }),
);

adultsRouter.get(
  '/:id',
  authorize('adults', 'view'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id, {
      include: [
        { model: AdultAssignment, as: 'assignments', include: assignmentInclude },
        { model: AdultCourse, as: 'courses', include: [{ model: Course, as: 'course' }] },
        { model: Adult, as: 'advisor', attributes: ['id', 'firstName', 'lastName', 'totem'] },
        { model: User, as: 'user', attributes: ['id', 'email', 'active'] },
      ],
      order: [
        [{ model: AdultAssignment, as: 'assignments' }, 'year', 'DESC'],
        [{ model: AdultCourse, as: 'courses' }, 'completedAt', 'DESC'],
      ],
    });
    if (!adult) throw notFound();
    const advisees = await Adult.findAll({ where: { advisorAdultId: adult.id }, attributes: ['id', 'firstName', 'lastName', 'totem'] });
    const [types, docs] = await Promise.all([
      DocumentType.findAll({ where: { appliesTo: 'adult' }, order: [['sortOrder', 'ASC']] }),
      AdultDocument.findAll({ where: { adultId: adult.id } }),
    ]);
    const documents = types
      .filter((t) => t.active || docs.some((d) => d.documentTypeId === t.id))
      .map((t) => {
        const d = docs.find((x) => x.documentTypeId === t.id);
        return {
          documentTypeId: t.id,
          name: t.name,
          hasExpiry: t.hasExpiry,
          required: t.required,
          presented: d?.presented ?? false,
          notApplicable: (!d?.presented && d?.notApplicable) ?? false,
          presentedAt: d?.presentedAt ?? null,
          expiresAt: d?.expiresAt ?? null,
          notes: d?.notes ?? null,
          status: documentStatus(d, t.hasExpiry, todayIso(), t.required),
        };
      });
    res.json({ ...adult.toJSON(), advisees, documents });
  }),
);

adultsRouter.post(
  '/',
  authorize('adults', 'create'),
  ah(async (req, res) => {
    const data = parse(adultSchema, req.body);
    const adult = await Adult.create(data);
    if (adultRegistered(adult.status)) await recordRegistryChanges(req, [{ kind: 'alta', adult }]);
    res.status(201).json(adult);
  }),
);

adultsRouter.put(
  '/:id',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = parse(adultSchema, req.body);
    if (data.advisorAdultId === adult.id) throw badRequest('Revisá los datos', { advisorAdultId: 'No puede ser su propio asesor' });
    const wasRegistered = adultRegistered(adult.status);
    await adult.update(data);
    const kind = registryTransition(wasRegistered, adultRegistered(adult.status));
    if (kind) await recordRegistryChanges(req, [{ kind, adult }]);
    res.json(adult);
  }),
);

adultsRouter.delete(
  '/:id',
  authorize('adults', 'delete'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    if (await User.count({ where: { adultId: adult.id } })) throw badRequest('El adulto tiene un usuario vinculado. Dalo de baja en lugar de eliminarlo.');
    await adult.destroy();
    if (adultRegistered(adult.status)) {
      await recordRegistryChanges(req, [
        { kind: 'baja', adult, detail: 'Se eliminó de ALCOMBAR. Si era un registro duplicado o cargado por error, marcalo como "No corresponde".' },
      ]);
    }
    res.json({ ok: true });
  }),
);

// ---- Cargos por año ----
adultsRouter.post(
  '/:id/assignments',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = cargoData(parse(adultAssignmentSchema, req.body));
    const created = await AdultAssignment.create({ ...data, adultId: adult.id });
    if (created.year >= currentYear()) await syncUnitRoles(adult.id, [created.unitId]);
    await syncTeamLeader(adult.id, null, created);
    res.status(201).json(created);
  }),
);
adultsRouter.put(
  '/assignments/:aid',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const a = await AdultAssignment.findByPk(req.params.aid);
    if (!a) throw notFound();
    const before = { unitId: a.unitId, supportTeamId: a.supportTeamId, position: a.position, year: a.year };
    // Con unidad elegida, la rama "por asignar" ya no hace falta
    await a.update(cargoData(parse(adultAssignmentSchema, req.body), a));
    if (Math.max(before.year, a.year) >= currentYear()) await syncUnitRoles(a.adultId, [before.unitId, a.unitId]);
    await syncTeamLeader(a.adultId, before, a);
    res.json(a);
  }),
);
adultsRouter.delete(
  '/assignments/:aid',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const a = await AdultAssignment.findByPk(req.params.aid);
    if (!a) throw notFound();
    await a.destroy();
    if (a.year >= currentYear()) await syncUnitRoles(a.adultId, [a.unitId]);
    await syncTeamLeader(a.adultId, a, null);
    res.json({ ok: true });
  }),
);

// ---- Documentación del adulto ----
adultsRouter.put(
  '/:id/documents',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = parse(memberDocumentSchema, req.body);
    const type = await DocumentType.findByPk(data.documentTypeId);
    if (!type || type.appliesTo !== 'adult') throw badRequest('Tipo de documento inexistente');
    const values = {
      presented: data.presented,
      notApplicable: !data.presented && data.notApplicable,
      presentedAt: data.presented ? data.presentedAt ?? todayIso() : null,
      expiresAt: data.presented && type.hasExpiry ? data.expiresAt : null,
      notes: data.notes,
    };
    const doc = await AdultDocument.findOne({ where: { adultId: adult.id, documentTypeId: type.id } });
    if (doc) await doc.update(values);
    else await AdultDocument.create({ adultId: adult.id, documentTypeId: type.id, ...values });
    res.json({ ok: true });
  }),
);

// ---- Formación ----
adultsRouter.post(
  '/:id/courses',
  authorize('training', 'create'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = parse(adultCourseSchema, req.body);
    res.status(201).json(await AdultCourse.create({ ...data, adultId: adult.id }));
  }),
);
adultsRouter.put(
  '/courses/:cid',
  authorize('training', 'edit'),
  ah(async (req, res) => {
    const c = await AdultCourse.findByPk(req.params.cid);
    if (!c) throw notFound();
    await c.update(parse(adultCourseSchema, req.body));
    res.json(c);
  }),
);
adultsRouter.delete(
  '/courses/:cid',
  authorize('training', 'delete'),
  ah(async (req, res) => {
    const c = await AdultCourse.findByPk(req.params.cid);
    if (!c) throw notFound();
    await c.destroy();
    res.json({ ok: true });
  }),
);

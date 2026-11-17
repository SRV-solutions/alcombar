import { Router } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { adultAssignmentSchema, adultCourseSchema, adultSchema, ADULT_STATUS_LABELS, formatDate, type AdultStatus } from '../shared';
import { Adult, AdultAssignment, AdultCourse, Course, Role, SupportTeam, Unit, User, UserRole } from '../models';
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
async function grantUnitRole(adultId: string, position: string, unitId: string | null) {
  if (!unitId) return;
  const key = unitRoleForPosition(position);
  if (!key) return;
  const [user, role] = await Promise.all([User.findOne({ where: { adultId } }), Role.findOne({ where: { key } })]);
  if (!user || !role) return;
  await UserRole.findOrCreate({ where: { userId: user.id, roleId: role.id, unitId }, defaults: { userId: user.id, roleId: role.id, unitId } });
}
const currentYear = () => new Date().getFullYear();

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
    res.json(list);
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
    res.json({ ...adult.toJSON(), advisees });
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
    const data = parse(adultAssignmentSchema, req.body);
    const created = await AdultAssignment.create({ ...data, adultId: adult.id });
    await grantUnitRole(adult.id, created.position, created.unitId);
    res.status(201).json(created);
  }),
);
adultsRouter.put(
  '/assignments/:aid',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const a = await AdultAssignment.findByPk(req.params.aid);
    if (!a) throw notFound();
    const data = parse(adultAssignmentSchema, req.body);
    const hadUnit = a.unitId;
    // Con unidad elegida, la rama "por asignar" ya no hace falta
    await a.update({ ...data, ...(data.unitId ? { branch: null } : {}) });
    if (a.unitId && a.unitId !== hadUnit) await grantUnitRole(a.adultId, a.position, a.unitId);
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

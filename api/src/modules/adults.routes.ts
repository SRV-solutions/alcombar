import { Router, type Request } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import {
  adultAssignmentSchema,
  adultCourseSchema,
  adultExperienceSchema,
  adultHabilitationSchema,
  adultSchema,
  ADULT_STATUS_LABELS,
  documentStatus,
  formatDate,
  isTeamLeaderPosition,
  memberDocumentSchema,
  todayIso,
  type AdultStatus,
  can,
} from '../shared';
import { Adult, AdultAssignment, AdultCourse, AdultDocument, AdultExperience, AdultHabilitation, Course, DocumentType, Member, PasswordToken, Role, SupportTeam, Unit, User, UserRole } from '../models';
import { writeAudit } from '../lib/audit';
import { personSearchWhere } from '../lib/personSearch';
import { adultRegistered, recordRegistryChanges, registryTransition } from '../lib/registry';
import { sendCsv, toCsv } from '../lib/csv';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { revokeAllSessions } from '../lib/session';
import { sequelize } from '../db';
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

/**
 * Acceso a la app de cada adulto (para quien administra usuarios): si tiene cuenta, si ya eligió contraseña,
 * cuándo entró por última vez y con qué roles. La contraseña nunca sale de acá.
 */
async function accessByAdult(adultIds: string[], withRoles = false) {
  const users = adultIds.length
    ? await User.findAll({
        where: { adultId: adultIds },
        attributes: ['id', 'adultId', 'email', 'active', 'lastLoginAt', 'passwordHash'],
        include: withRoles
          ? [{ model: UserRole, as: 'userRoles', include: [{ model: Role, as: 'role', attributes: ['name'] }, { model: Unit, as: 'unit', attributes: ['code'] }] }]
          : [],
      })
    : [];
  return new Map(
    users.map((u) => [
      u.adultId as string,
      {
        userId: u.id,
        email: u.email,
        state: !u.active ? ('desactivado' as const) : !u.passwordHash ? ('sin_clave' as const) : ('activo' as const),
        lastLoginAt: u.lastLoginAt,
        ...(withRoles ? { roles: (u.userRoles ?? []).map((ur) => `${ur.role?.name ?? ''}${ur.unit ? ` (${ur.unit.code})` : ''}`) } : {}),
      },
    ]),
  );
}

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
    // Quien administra usuarios ve, además, cómo está el acceso de cada uno
    const access = can(req.auth, 'users', 'view') ? await accessByAdult(list.map((a) => a.id)) : null;
    res.json(
      list.map((a) => {
        const s = { ok: 0, expiring: 0, expired: 0, missing: 0, total: types.length };
        for (const t of types) s[documentStatus(docs.find((d) => d.adultId === a.id && d.documentTypeId === t.id), t.hasExpiry, today, t.required)]++;
        return { ...a.toJSON(), docs: s, ...(access ? { access: access.get(a.id) ?? null } : {}) };
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
        { model: AdultExperience, as: 'experiences' },
        { model: AdultHabilitation, as: 'habilitations' },
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
    // Si fue protagonista del Grupo (hizo la partida), el enlace a esa ficha con su historia
    const memberRecord = await Member.findOne({
      where: { adultId: adult.id },
      attributes: ['id', 'joinedAt', 'promiseDate', 'departedAt'],
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'code', 'name', 'branch'] }],
    });
    const access = can(req.auth, 'users', 'view') ? ((await accessByAdult([adult.id], true)).get(adult.id) ?? null) : undefined;
    res.json({ ...adult.toJSON(), advisees, documents, memberRecord, ...(access !== undefined ? { access } : {}) });
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
    // Si con este cambio pasa a Baja, su cuenta deja de poder entrar (se desactiva, no se borra)
    const accounts = adult.status !== 'baja' && data.status === 'baja' ? await activeAccounts(req, adult, 'dar de baja') : [];
    await adult.update(data);
    const accountsDeactivated = await deactivateAccounts(accounts);
    const kind = registryTransition(wasRegistered, adultRegistered(adult.status));
    if (kind) await recordRegistryChanges(req, [{ kind, adult }]);
    res.json({ ...adult.toJSON(), accountsDeactivated });
  }),
);

/**
 * Dar de baja sin borrar: la ficha queda con todo su historial (cargos, formación, documentación) y estado «Baja»,
 * sale de los adultos en actividad y, si tenía cuenta, deja de poder entrar a la app.
 */
adultsRouter.post(
  '/:id/baja',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    if (adult.status === 'baja') throw badRequest('Ya está dado de baja');
    const wasRegistered = adultRegistered(adult.status);
    const accounts = await activeAccounts(req, adult, 'dar de baja');
    await adult.update({ status: 'baja' });
    const accountsDeactivated = await deactivateAccounts(accounts);
    const kind = registryTransition(wasRegistered, adultRegistered(adult.status));
    if (kind) await recordRegistryChanges(req, [{ kind, adult }]);
    res.json({ ok: true, accountsDeactivated });
  }),
);

/** Volver de una baja. La cuenta no se reactiva sola: se vuelve a habilitar desde «Acceso a la app». */
adultsRouter.post(
  '/:id/reincorporar',
  authorize('adults', 'edit'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    if (adult.status !== 'baja') throw badRequest('No está dado de baja');
    const wasRegistered = adultRegistered(adult.status);
    await adult.update({ status: 'alta' });
    const kind = registryTransition(wasRegistered, adultRegistered(adult.status));
    if (kind) await recordRegistryChanges(req, [{ kind, adult }]);
    const accountInactive = (await User.count({ where: { adultId: adult.id, active: false } })) > 0;
    res.json({ ok: true, accountInactive });
  }),
);

type AccountWithRoles = User & { userRoles?: (UserRole & { role?: Role })[] };

/** Nadie se saca a sí mismo, ni a un superadmin sin serlo, ni al último superadmin. */
async function assertAccountsCanGo(req: Request, accounts: AccountWithRoles[], verb: 'eliminar' | 'dar de baja') {
  const sa = await Role.findOne({ where: { key: 'superadmin' } });
  for (const u of accounts) {
    if (u.id === req.user!.id) throw badRequest(verb === 'eliminar' ? 'Es tu propia ficha: no podés eliminar tu cuenta.' : 'Es tu propia ficha: no podés darte de baja a vos mismo.');
    if (!u.userRoles?.some((ur) => ur.role?.key === 'superadmin')) continue;
    if (!req.auth!.isSuperadmin) throw forbidden(`Solo un superadmin puede ${verb} a otro superadmin`);
    const others = sa
      ? await UserRole.count({
          where: { roleId: sa.id, userId: { [Op.ne]: u.id } },
          include: [{ model: User, as: 'user', where: { active: true }, required: true }],
          distinct: true,
          col: 'user_id',
        })
      : 0;
    if (u.active && !others) throw badRequest(`No se puede ${verb} al último superadmin`);
  }
}

/** Las cuentas activas del adulto, ya controlado que se le pueden sacar. */
async function activeAccounts(req: Request, adult: Adult, verb: 'eliminar' | 'dar de baja') {
  const accounts = (await User.findAll({ where: { adultId: adult.id, active: true }, include: [{ model: UserRole, as: 'userRoles', include: [{ model: Role, as: 'role' }] }] })) as AccountWithRoles[];
  await assertAccountsCanGo(req, accounts, verb);
  return accounts;
}

/** Desactiva las cuentas y cierra sus sesiones. Devuelve cuántas. */
async function deactivateAccounts(accounts: User[]) {
  for (const u of accounts) {
    await u.update({ active: false });
    await revokeAllSessions(u.id);
  }
  return accounts.length;
}

adultsRouter.delete(
  '/:id',
  authorize('adults', 'delete'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    // Si tiene cuenta para entrar a la app, se elimina junto con la ficha: hay que pedirlo a propósito (?withAccount=1)
    // y tener permiso para eliminar usuarios. No se puede eliminar la cuenta propia ni la del último superadmin.
    const accounts = await User.findAll({ where: { adultId: adult.id }, include: [{ model: UserRole, as: 'userRoles', include: [{ model: Role, as: 'role' }] }] });
    if (accounts.length) {
      if (req.query.withAccount !== '1') throw badRequest('Tiene una cuenta para entrar a la app: para eliminarlo hay que eliminar también su cuenta.');
      if (!can(req.auth, 'users', 'delete')) {
        throw forbidden('Tiene una cuenta para entrar a la app: lo puede eliminar quien administra los accesos. Mientras tanto, dalo de baja.');
      }
      await assertAccountsCanGo(req, accounts, 'eliminar');
    }
    await sequelize.transaction(async (transaction) => {
      for (const u of accounts) {
        for (const ur of u.userRoles ?? []) await ur.destroy({ transaction });
        await PasswordToken.update({ usedAt: new Date() }, { where: { userId: u.id, usedAt: null }, transaction });
        await writeAudit({ action: 'delete', entity: 'User', entityId: u.id, summary: `Cuenta eliminada junto con la ficha de ${adult.firstName} ${adult.lastName}` }, transaction);
        // El mail queda libre para otra cuenta
        await u.update({ active: false, email: null, pendingEmail: null }, { transaction });
        await u.destroy({ transaction });
      }
      await adult.destroy({ transaction });
    });
    for (const u of accounts) await revokeAllSessions(u.id);
    if (adultRegistered(adult.status)) {
      await recordRegistryChanges(req, [
        { kind: 'baja', adult, detail: 'Se eliminó de ALCONBAR. Si era un registro duplicado o cargado por error, marcalo como "No corresponde".' },
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

// ---- Experiencias de formación (el historial, una por una, con el enlace a su certificado) ----
adultsRouter.post(
  '/:id/experiences',
  authorize('training', 'create'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = parse(adultExperienceSchema, req.body);
    res.status(201).json(await AdultExperience.create({ ...data, adultId: adult.id }));
  }),
);
adultsRouter.put(
  '/experiences/:eid',
  authorize('training', 'edit'),
  ah(async (req, res) => {
    const e = await AdultExperience.findByPk(req.params.eid);
    if (!e) throw notFound();
    await e.update(parse(adultExperienceSchema, req.body));
    res.json(e);
  }),
);
adultsRouter.delete(
  '/experiences/:eid',
  authorize('training', 'delete'),
  ah(async (req, res) => {
    const e = await AdultExperience.findByPk(req.params.eid);
    if (!e) throw notFound();
    await e.destroy();
    res.json({ ok: true });
  }),
);
// ---- Habilitaciones por etapa ----
adultsRouter.post(
  '/:id/habilitations',
  authorize('training', 'create'),
  ah(async (req, res) => {
    const adult = await Adult.findByPk(req.params.id);
    if (!adult) throw notFound();
    const data = parse(adultHabilitationSchema, req.body);
    res.status(201).json(await AdultHabilitation.create({ ...data, adultId: adult.id }));
  }),
);
adultsRouter.put(
  '/habilitations/:hid',
  authorize('training', 'edit'),
  ah(async (req, res) => {
    const h = await AdultHabilitation.findByPk(req.params.hid);
    if (!h) throw notFound();
    await h.update(parse(adultHabilitationSchema, req.body));
    res.json(h);
  }),
);
adultsRouter.delete(
  '/habilitations/:hid',
  authorize('training', 'delete'),
  ah(async (req, res) => {
    const h = await AdultHabilitation.findByPk(req.params.hid);
    if (!h) throw notFound();
    await h.destroy();
    res.json({ ok: true });
  }),
);

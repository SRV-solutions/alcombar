import { Router } from 'express';
import { MODULES, roleSchema, type ModuleKey } from '../shared';
import { sequelize } from '../db';
import { Permission, Role, RolePermission, UserRole } from '../models';
import { ah, badRequest, conflict, notFound, parse } from '../lib/errors';
import { authorize } from '../middlewares/auth';

export const rolesRouter = Router();

async function serialize(roles: Role[]) {
  const [counts] = (await sequelize.query('SELECT role_id, COUNT(DISTINCT user_id)::int AS count FROM user_roles GROUP BY role_id')) as [
    { role_id: string; count: number }[],
    unknown,
  ];
  return roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    scope: r.scope,
    isSystem: r.isSystem,
    userCount: counts.find((c) => c.role_id === r.id)?.count ?? 0,
    permissions: (r.rolePermissions ?? [])
      .filter((rp) => rp.permission)
      .map((rp) => ({ module: rp.permission!.module, action: rp.permission!.action, unitLimited: rp.unitLimited })),
  }));
}

const withPerms = { include: [{ model: RolePermission, as: 'rolePermissions', include: [{ model: Permission, as: 'permission' }] }] };

rolesRouter.get(
  '/',
  ah(async (_req, res) => {
    // Cualquier usuario autenticado puede ver la lista de roles (se usa en formularios); los permisos detallados requieren roles:view.
    const roles = await Role.findAll({ ...withPerms, order: [['createdAt', 'ASC']] });
    res.json(await serialize(roles));
  }),
);

async function savePermissions(role: Role, perms: { module: string; action: string; unitLimited: boolean }[]) {
  await sequelize.transaction(async (transaction) => {
    const all = await Permission.findAll({ transaction });
    const valid = perms.filter((p) => {
      const mod = MODULES[p.module as ModuleKey];
      return mod && (mod.actions as readonly string[]).includes(p.action);
    });
    const current = await RolePermission.findAll({ where: { roleId: role.id }, transaction });
    const wanted = new Map(
      valid.map((p) => {
        const perm = all.find((x) => x.module === p.module && x.action === p.action);
        return [perm!.id, role.scope === 'unit' && p.unitLimited && MODULES[p.module as ModuleKey].unitScoped] as const;
      }),
    );
    for (const rp of current) {
      if (!wanted.has(rp.permissionId)) await rp.destroy({ transaction });
      else if (rp.unitLimited !== wanted.get(rp.permissionId)) {
        rp.unitLimited = wanted.get(rp.permissionId)!;
        await rp.save({ transaction });
      }
    }
    for (const [permissionId, unitLimited] of wanted) {
      if (!current.some((rp) => rp.permissionId === permissionId)) {
        await RolePermission.create({ roleId: role.id, permissionId, unitLimited }, { transaction });
      }
    }
  });
}

rolesRouter.post(
  '/',
  authorize('roles', 'create'),
  ah(async (req, res) => {
    const data = parse(roleSchema, req.body);
    if (await Role.findOne({ where: { name: data.name } })) throw conflict('Ya existe un rol con ese nombre');
    const role = await Role.create({ key: null, name: data.name, description: data.description, scope: data.scope });
    await savePermissions(role, data.permissions);
    res.status(201).json((await serialize([(await Role.findByPk(role.id, withPerms))!]))[0]);
  }),
);

rolesRouter.put(
  '/:id',
  authorize('roles', 'edit'),
  ah(async (req, res) => {
    const data = parse(roleSchema, req.body);
    const role = await Role.findByPk(req.params.id);
    if (!role) throw notFound();
    if (role.isSystem) throw badRequest('Los permisos del rol Superadmin están fijos y no se pueden modificar');
    if (role.scope !== data.scope && (await UserRole.count({ where: { roleId: role.id } })) > 0) {
      throw badRequest('No se puede cambiar el alcance de un rol que ya está asignado a usuarios');
    }
    role.name = data.name;
    role.description = data.description;
    role.scope = data.scope;
    await role.save();
    await savePermissions(role, data.permissions);
    res.json((await serialize([(await Role.findByPk(role.id, withPerms))!]))[0]);
  }),
);

rolesRouter.delete(
  '/:id',
  authorize('roles', 'delete'),
  ah(async (req, res) => {
    const role = await Role.findByPk(req.params.id);
    if (!role) throw notFound();
    if (role.isSystem) throw badRequest('El rol Superadmin no se puede eliminar');
    if ((await UserRole.count({ where: { roleId: role.id } })) > 0) throw badRequest('El rol está asignado a usuarios. Quitalo primero.');
    await role.destroy();
    res.json({ ok: true });
  }),
);

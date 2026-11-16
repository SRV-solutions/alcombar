import type { Grant, PermissionSubject } from '../shared';
import { Permission, Role, RolePermission, UserRole } from '../models';

/** Arma los permisos efectivos de un usuario a partir de sus roles y alcances. */
export async function loadSubject(userId: string): Promise<PermissionSubject & { roles: { name: string; unitId: string | null }[] }> {
  const userRoles = await UserRole.findAll({
    where: { userId },
    include: [
      {
        model: Role,
        as: 'role',
        required: true,
        include: [{ model: RolePermission, as: 'rolePermissions', include: [{ model: Permission, as: 'permission' }] }],
      },
    ],
  });

  let isSuperadmin = false;
  const grants = new Map<string, Grant>();
  const roles: { name: string; unitId: string | null }[] = [];

  for (const ur of userRoles) {
    const role = ur.role!;
    roles.push({ name: role.name, unitId: ur.unitId ?? null });
    if (role.key === 'superadmin') isSuperadmin = true;
    for (const rp of role.rolePermissions ?? []) {
      if (!rp.permission) continue;
      let unitId: string | null = null;
      if (role.scope === 'unit' && rp.unitLimited) {
        if (!ur.unitId) continue; // rol de unidad sin unidad asignada: el permiso limitado no aplica
        unitId = ur.unitId;
      }
      const g = { module: rp.permission.module, action: rp.permission.action, unitId };
      grants.set(`${g.module}:${g.action}:${g.unitId ?? '*'}`, g);
    }
  }
  return { isSuperadmin, grants: [...grants.values()], roles };
}

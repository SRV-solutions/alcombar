import { Op } from 'sequelize';
import { BRANCH_INFO, type Branch, type Grant, type ModuleKey, type PermissionSubject, type Action } from '../shared';
import { AdultAssignment, Permission, Role, RolePermission, SupportTeam, Unit, User, UserRole } from '../models';

/**
 * Lo que puede ver un referente de rama en las unidades de su rama, sin rol aparte: sale de su cargo del año en
 * el equipo de Programa. Así no hay nada que sincronizar: si cambia el referente, se suma una unidad a la rama
 * o empieza otro año, los permisos se acomodan solos. Es solo lectura.
 */
export const REFERENT_GRANTS: [ModuleKey, Action][] = [
  ['activities', 'view'],
  ['camps', 'view'],
  ['progression', 'view'],
  ['calendar', 'view'],
];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Ramas de las que el adulto es referente este año (cargo con rama en el equipo de Programa). */
export async function referentBranchesOf(adultId: string | null | undefined): Promise<Branch[]> {
  if (!adultId) return [];
  const rows = await AdultAssignment.findAll({
    where: { adultId, year: new Date().getFullYear(), branch: { [Op.ne]: null }, supportTeamId: { [Op.ne]: null } },
    attributes: ['branch'],
    include: [{ model: SupportTeam, as: 'supportTeam', attributes: ['name'], required: true }],
  });
  return [...new Set(rows.filter((r) => fold(r.supportTeam?.name ?? '').startsWith('programa')).map((r) => r.branch as Branch))];
}

/** Arma los permisos efectivos de un usuario a partir de sus roles y alcances (y de ser referente de rama). */
export async function loadSubject(
  userId: string,
  adultId?: string | null,
): Promise<PermissionSubject & { roles: { name: string; unitId: string | null }[] }> {
  const [userRoles, branches] = await Promise.all([
    UserRole.findAll({
      where: { userId },
      include: [
        {
          model: Role,
          as: 'role',
          required: true,
          include: [{ model: RolePermission, as: 'rolePermissions', include: [{ model: Permission, as: 'permission' }] }],
        },
      ],
    }),
    (adultId === undefined ? User.findByPk(userId, { attributes: ['adultId'] }).then((u) => u?.adultId ?? null) : Promise.resolve(adultId)).then(referentBranchesOf),
  ]);

  let isSuperadmin = false;
  const grants = new Map<string, Grant>();
  const roles: { name: string; unitId: string | null }[] = [];
  const add = (g: Grant) => grants.set(`${g.module}:${g.action}:${g.unitId ?? '*'}`, g);

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
      add({ module: rp.permission.module, action: rp.permission.action, unitId });
    }
  }

  if (branches.length) {
    const units = await Unit.findAll({ where: { branch: branches, active: true }, attributes: ['id'] });
    for (const u of units) for (const [module, action] of REFERENT_GRANTS) add({ module, action, unitId: u.id });
    for (const b of branches) roles.push({ name: `Referente de ${BRANCH_INFO[b]?.label ?? b}`, unitId: null });
  }
  return { isSuperadmin, grants: [...grants.values()], roles };
}

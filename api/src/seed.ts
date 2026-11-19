// Datos iniciales. Corre en cada `npm run dev` y solo agrega lo que falta:
// - el catálogo de permisos (así los módulos nuevos aparecen solos),
// - los roles iniciales que no existan,
// - unidades, tipos de documento y cursos SOLO si la tabla está vacía (después se editan desde la app),
// - el primer superadmin SOLO si no hay ningún usuario.
import { ACTIONS, DEFAULT_COURSES, DEFAULT_DOCUMENT_TYPES, DEFAULT_UNITS, KIDS_PER_ADULT, MODULES, parsePermissionCode, ROLE_SEEDS, type Branch, type ModuleKey } from './shared';
import { config } from './config';
import { sequelize } from './db';
import { Course, DocumentType, Permission, Role, RolePermission, Unit, User, UserRole } from './models';
import { hashPassword, randomToken } from './lib/security';

const created: string[] = [];

async function main() {
  await sequelize.authenticate();

  for (const key of Object.keys(MODULES) as ModuleKey[]) {
    for (const action of MODULES[key].actions) {
      if (!ACTIONS.includes(action)) continue;
      const [, isNew] = await Permission.findOrCreate({ where: { module: key, action } });
      if (isNew) created.push(`permiso ${key}:${action}`);
    }
  }
  const perms = await Permission.findAll();

  for (const seed of ROLE_SEEDS) {
    if (await Role.findOne({ where: { key: seed.key }, paranoid: false })) continue;
    const role = await Role.create({ key: seed.key, name: seed.name, description: seed.description, scope: seed.scope, isSystem: seed.key === 'superadmin' });
    for (const code of seed.permissions) {
      const { module, action, unitLimited } = parsePermissionCode(code);
      const perm = perms.find((p) => p.module === module && p.action === action);
      if (!perm) throw new Error(`Permiso inexistente en el seed: ${code}`);
      await RolePermission.create({ roleId: role.id, permissionId: perm.id, unitLimited });
    }
    created.push(`rol ${seed.name}`);
  }

  if ((await Unit.count({ paranoid: false })) === 0) {
    for (const u of DEFAULT_UNITS) await Unit.create({ code: u.code, name: u.name, branch: u.branch, kidsPerAdult: KIDS_PER_ADULT[u.branch as Branch] ?? null });
    created.push(`${DEFAULT_UNITS.length} unidades`);
  }
  if ((await DocumentType.count({ paranoid: false })) === 0) {
    for (const d of DEFAULT_DOCUMENT_TYPES) await DocumentType.create({ ...d });
    created.push(`${DEFAULT_DOCUMENT_TYPES.length} tipos de documento`);
  }
  if ((await Course.count({ paranoid: false })) === 0) {
    for (const c of DEFAULT_COURSES) await Course.create({ name: c.name, kind: c.kind, totalModules: c.totalModules });
    created.push(`${DEFAULT_COURSES.length} cursos`);
  }

  if ((await User.count({ paranoid: false })) === 0) {
    const email = (process.env.SUPERADMIN_EMAIL || 'admin@alcombar.local').toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD || randomToken(9);
    const user = await User.create({
      email,
      name: process.env.SUPERADMIN_NAME || 'Superadmin',
      passwordHash: await hashPassword(password),
      adultId: null,
      lastLoginAt: null,
      lockedUntil: null,
    });
    const sa = await Role.findOne({ where: { key: 'superadmin' } });
    await UserRole.create({ userId: user.id, roleId: sa!.id, unitId: null });
    console.log(`\n✓ Superadmin creado: ${email}`);
    console.log(process.env.SUPERADMIN_PASSWORD ? '  Contraseña: la de SUPERADMIN_PASSWORD en api/.env' : `  Contraseña: ${password}`);
    console.log('  (cambiala desde "Mi cuenta" después de entrar)\n');
  }

  console.log(created.length ? `✓ Datos iniciales agregados: ${created.join(', ')}` : '✓ Datos iniciales al día');
  if (created.length && !config.isProd) console.log(`  Abrí ${config.appUrl}`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});

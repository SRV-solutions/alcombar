/**
 * Da el rol Superadmin a un usuario (sin quitarle los roles que ya tiene).
 *
 *   npm run superadmin -- persona@mail.com           → lo hace superadmin
 *   npm run superadmin -- persona@mail.com --link    → además imprime un enlace para definir la contraseña
 *
 * Si no existe el usuario pero hay un adulto con ese email, lo crea vinculado a ese adulto.
 */
import { sequelize } from '../db';
import { Adult, AuditLog, Role, User, UserRole } from '../models';
import { createPasswordLink } from '../lib/passwordTokens';

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  const wantLink = process.argv.includes('--link');
  if (!email || !email.includes('@')) throw new Error('Uso: npm run superadmin -- persona@mail.com [--link]');

  const role = await Role.findOne({ where: { key: 'superadmin' } });
  if (!role) throw new Error('No existe el rol Superadmin: corré primero npm run dev o npm run seed');

  let user = await User.findOne({ where: { email } });
  if (!user) {
    const adult = await Adult.findOne({ where: { email } });
    if (!adult) throw new Error(`No hay ningún usuario ni adulto con el email ${email}`);
    user = await User.create({
      email,
      name: `${adult.firstName} ${adult.lastName}`,
      passwordHash: null,
      adultId: adult.id,
      lastLoginAt: null,
      lockedUntil: null,
    });
    console.log(`✓ Usuario creado para ${user.name}`);
  }
  if (!user.active) await user.update({ active: true });

  const [, created] = await UserRole.findOrCreate({
    where: { userId: user.id, roleId: role.id, unitId: null },
    defaults: { userId: user.id, roleId: role.id, unitId: null },
  });
  if (created) {
    await AuditLog.create({
      userId: null,
      ip: null,
      action: 'update',
      entity: 'UserRole',
      entityId: user.id,
      summary: `${user.email} ahora es Superadmin (script)`,
      changes: null,
    });
  }
  console.log(created ? `✓ ${user.name} <${user.email}> ahora es Superadmin` : `✓ ${user.email} ya era Superadmin`);

  if (!user.passwordHash) {
    if (wantLink) {
      const url = await createPasswordLink(user, 'invite');
      console.log(`\n  Todavía no tiene contraseña. Enlace para definirla (vence en 72 h, un solo uso):\n  ${url}\n`);
    } else {
      console.log('  Todavía no tiene contraseña: generá el enlace desde Usuarios → "Generar enlace", o corré este comando con --link.');
    }
  }
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('✗', err.message ?? err);
  await sequelize.close();
  process.exit(1);
});

'use strict';

/**
 * Acceso de rovers a la app:
 *  - users.member_id: la cuenta puede ser de un protagonista (un rover mayor de edad), no solo de un adulto.
 *  - users.email pasa a ser opcional: el rover entra con su DNI y carga el mail después.
 *  - users.must_change_password: la contraseña que le genera su educador es provisoria; la cambia al entrar.
 *  - users.pending_email / email_verified_at: el mail queda pendiente hasta que confirma el código que le llega.
 *  - password_tokens.attempts: intentos fallidos sobre un código de verificación.
 *  - Rol «Rover» (alcance unidad) con lectura de lo no sensible: organigrama y calendario del Grupo.
 *    No abre «Actas y documentos»: las actas del Consejo no son para la Comunidad.
 * Idempotente.
 */
const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const q = (sql, replacements) => s.query(sql, replacements ? { replacements } : undefined);
    await q('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
    await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL');
    await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false');
    await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(200)');
    await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
    await q('CREATE UNIQUE INDEX IF NOT EXISTS users_member_unique ON users (member_id) WHERE deleted_at IS NULL AND member_id IS NOT NULL');
    await q('ALTER TABLE password_tokens ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0');

    // Rol Rover
    const [[existing]] = await q("SELECT id FROM roles WHERE key = 'rover' AND deleted_at IS NULL");
    const roleId = existing ? existing.id : randomUUID();
    if (!existing) {
      await q(
        `INSERT INTO roles (id, key, name, description, scope, is_system, created_at, updated_at)
         VALUES (:id, 'rover', 'Rover', :description, 'unit', false, now(), now())`,
        { id: roleId, description: 'Rover de la Comunidad: su Plan Personal, sus proyectos y mingas, y lo no sensible del Grupo (organigrama y calendario).' },
      );
    }
    for (const [module, action] of [
      ['group', 'view'],
      ['calendar', 'view'],
    ]) {
      const [[perm]] = await q('SELECT id FROM permissions WHERE module = :module AND action = :action', { module, action });
      if (!perm) continue;
      const [[has]] = await q('SELECT 1 AS x FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId', { roleId, permId: perm.id });
      if (!has) {
        await q('INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at) VALUES (:id, :roleId, :permId, false, now(), now())', {
          id: randomUUID(),
          roleId,
          permId: perm.id,
        });
      }
    }
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE key = 'rover')");
    await q("DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE key = 'rover')");
    await q("DELETE FROM roles WHERE key = 'rover'");
    await q('ALTER TABLE password_tokens DROP COLUMN IF EXISTS attempts');
    await q('DROP INDEX IF EXISTS users_member_unique');
    for (const c of ['email_verified_at', 'pending_email', 'must_change_password', 'member_id']) await q(`ALTER TABLE users DROP COLUMN IF EXISTS ${c}`);
  },
};

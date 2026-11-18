'use strict';

/**
 * Secretaría cobra: registra pagos de los protagonistas y emite recibos (permiso "fees:create").
 * Generar las cuotas del año para todo el Grupo sigue siendo de Tesorería (pide también "fees:edit").
 * Si el rol ya tenía el permiso, no se toca.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at)
       SELECT gen_random_uuid(), r.id, p.id, false, now(), now()
       FROM roles r, permissions p
       WHERE r.key = 'secretaria' AND r.deleted_at IS NULL AND p.module = 'fees' AND p.action = 'create'
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE role_id IN (SELECT id FROM roles WHERE key = 'secretaria')
         AND permission_id IN (SELECT id FROM permissions WHERE module = 'fees' AND action = 'create')`,
    );
  },
};

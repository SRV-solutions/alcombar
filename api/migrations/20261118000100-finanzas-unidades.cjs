'use strict';

/**
 * Plata del Grupo y de cada unidad.
 *  - accounts.unit_id: la cuenta es de una unidad (su caja) o, vacío, del Grupo.
 *  - Secretaría cobra cuotas, afiliaciones y campamentos y registra lo que entra y sale del Grupo
 *    (fees:edit y accounting:view/create/edit/export para todo el Grupo).
 *  - Rol nuevo "Finanzas de la unidad" (alcance unidad): lleva las cuentas de su unidad.
 * Idempotente: si algo ya está, no se toca.
 */
const SECRETARIA = [
  ['fees', 'edit'],
  ['accounting', 'view'],
  ['accounting', 'create'],
  ['accounting', 'edit'],
  ['accounting', 'export'],
];
const SECRETARIA_DESC =
  'Cobra cuotas, afiliaciones y campamentos (genera los cargos, registra los pagos y emite recibos) y registra lo que entra y sale del Grupo, incluida la plata que se pasa a las unidades. También altas y bajas, documentación y legajos.';

const FINANZAS = {
  key: 'finanzas_unidad',
  name: 'Finanzas de la unidad',
  description:
    'Lleva la plata de su unidad: las cuentas de la unidad, lo que le pasa el Grupo, lo que entra por eventos y los gastos. Ve lo que deben los protagonistas de su unidad.',
  // [módulo, acción, limitado a la unidad]
  permissions: [
    ['group', 'view', false],
    ['accounting', 'view', true],
    ['accounting', 'create', true],
    ['accounting', 'edit', true],
    ['accounting', 'export', true],
    ['fees', 'view', true],
    ['events', 'view', false],
    ['camps', 'view', true],
    ['calendar', 'view', false],
    ['documents', 'view', false],
  ],
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });

      await q('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON UPDATE CASCADE ON DELETE SET NULL');
      await q('CREATE INDEX IF NOT EXISTS accounts_unit_id ON accounts (unit_id)');

      for (const [module, action] of SECRETARIA) {
        await q(
          `INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at)
           SELECT gen_random_uuid(), r.id, p.id, false, now(), now()
           FROM roles r, permissions p
           WHERE r.key = 'secretaria' AND r.deleted_at IS NULL AND p.module = :module AND p.action = :action
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          { module, action },
        );
      }
      await q(`UPDATE roles SET description = :d, updated_at = now() WHERE key = 'secretaria' AND deleted_at IS NULL`, { d: SECRETARIA_DESC });

      await q(
        `INSERT INTO roles (id, key, name, description, scope, is_system, created_at, updated_at)
         SELECT gen_random_uuid(), :key, :name, :description, 'unit', false, now(), now()
         WHERE NOT EXISTS (SELECT 1 FROM roles WHERE key = :key)`,
        { key: FINANZAS.key, name: FINANZAS.name, description: FINANZAS.description },
      );
      for (const [module, action, unitLimited] of FINANZAS.permissions) {
        await q(
          `INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at)
           SELECT gen_random_uuid(), r.id, p.id, :unitLimited, now(), now()
           FROM roles r, permissions p
           WHERE r.key = :key AND r.deleted_at IS NULL AND p.module = :module AND p.action = :action
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          { key: FINANZAS.key, module, action, unitLimited },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      const role = `(SELECT id FROM roles WHERE key = '${FINANZAS.key}')`;
      await q(`DELETE FROM user_roles WHERE role_id IN ${role}`);
      await q(`DELETE FROM role_permissions WHERE role_id IN ${role}`);
      await q(`DELETE FROM roles WHERE key = '${FINANZAS.key}'`);
      for (const [module, action] of SECRETARIA) {
        await q(
          `DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE key = 'secretaria')
             AND permission_id IN (SELECT id FROM permissions WHERE module = :module AND action = :action)`,
          { module, action },
        );
      }
      await q('ALTER TABLE accounts DROP COLUMN IF EXISTS unit_id');
    });
  },
};

'use strict';

/**
 * Asistencia de los educadores (adultos con cargo) a las actividades del Grupo, que toma la Jefatura de Grupo.
 *  - adult_attendances: un registro por adulto y fecha.
 *  - Permiso nuevo adult_attendance (ver / tomar), para la Jefatura de Grupo.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      await q(`CREATE TABLE IF NOT EXISTS adult_attendances (
        id UUID PRIMARY KEY,
        adult_id UUID NOT NULL REFERENCES adults(id) ON UPDATE CASCADE ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        notes VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`);
      await q('CREATE UNIQUE INDEX IF NOT EXISTS adult_attendances_adult_date ON adult_attendances (adult_id, date)');
      await q('CREATE INDEX IF NOT EXISTS adult_attendances_date ON adult_attendances (date)');
      for (const action of ['view', 'edit']) {
        await q(
          `INSERT INTO permissions (id, module, action, created_at, updated_at)
           VALUES (gen_random_uuid(), 'adult_attendance', :action, now(), now())
           ON CONFLICT (module, action) DO NOTHING`,
          { action },
        );
        await q(
          `INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at)
           SELECT gen_random_uuid(), r.id, p.id, false, now(), now()
           FROM roles r, permissions p
           WHERE r.key = 'jefatura' AND r.deleted_at IS NULL AND p.module = 'adult_attendance' AND p.action = :action
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          { action },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q(`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'adult_attendance')`);
      await q(`DELETE FROM permissions WHERE module = 'adult_attendance'`);
      await q('DROP TABLE IF EXISTS adult_attendances');
    });
  },
};

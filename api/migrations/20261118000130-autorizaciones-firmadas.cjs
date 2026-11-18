'use strict';

/**
 * Autorizaciones firmadas en pantalla sobre las planillas de Scouts de Argentina (versión 07-21).
 *  - signed_authorizations: el contenido congelado, el trazo de cada firma, testigos, aval y constancia.
 *  - Permiso member_documents:approve = dar el aval (Jefe/a de Unidad en su unidad y Jefatura de Grupo), como
 *    pide la planilla; también permite anular una autorización.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      await q(`CREATE TABLE IF NOT EXISTS signed_authorizations (
        id UUID PRIMARY KEY,
        kind VARCHAR(20) NOT NULL,
        member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        camp_id UUID REFERENCES camps(id) ON UPDATE CASCADE ON DELETE SET NULL,
        year INTEGER NOT NULL,
        template_version VARCHAR(10) NOT NULL,
        content JSONB NOT NULL,
        signature JSONB NOT NULL,
        custody_signature JSONB,
        witnesses JSONB NOT NULL DEFAULT '[]'::jsonb,
        aval JSONB,
        attended_by JSONB NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'firmada',
        hash VARCHAR(64) NOT NULL,
        signed_at TIMESTAMPTZ NOT NULL,
        user_agent VARCHAR(300),
        ip VARCHAR(60),
        voided_at TIMESTAMPTZ,
        voided_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        void_reason VARCHAR(300),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        deleted_at TIMESTAMPTZ
      )`);
      await q('CREATE INDEX IF NOT EXISTS signed_authorizations_member ON signed_authorizations (member_id)');
      await q('CREATE INDEX IF NOT EXISTS signed_authorizations_camp ON signed_authorizations (camp_id)');

      await q(
        `INSERT INTO permissions (id, module, action, created_at, updated_at)
         VALUES (gen_random_uuid(), 'member_documents', 'approve', now(), now())
         ON CONFLICT (module, action) DO NOTHING`,
      );
      for (const [roleKey, unitLimited] of [
        ['jefe_unidad', true],
        ['jefatura', false],
      ]) {
        await q(
          `INSERT INTO role_permissions (id, role_id, permission_id, unit_limited, created_at, updated_at)
           SELECT gen_random_uuid(), r.id, p.id, :unitLimited, now(), now()
           FROM roles r, permissions p
           WHERE r.key = :roleKey AND r.deleted_at IS NULL AND p.module = 'member_documents' AND p.action = 'approve'
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          { roleKey, unitLimited },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q(`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'member_documents' AND action = 'approve')`);
      await q(`DELETE FROM permissions WHERE module = 'member_documents' AND action = 'approve'`);
      await q('DROP TABLE IF EXISTS signed_authorizations');
    });
  },
};

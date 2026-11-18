'use strict';

/**
 * Autorizaciones de retiro (planillas propias del Grupo): retirarse solo/a y retiro por otros adultos.
 * Las dos son opcionales (no cuentan como faltantes) y valen por el año.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      await q(`UPDATE document_types SET has_expiry = true, updated_at = now() WHERE code = 'aut_retiro' AND deleted_at IS NULL`);
      await q(
        `INSERT INTO document_types (id, code, name, has_expiry, required, applies_to, active, sort_order, created_at, updated_at)
         SELECT gen_random_uuid(), 'aut_retiro_terceros', 'Autorización de retiro por otros adultos', true, false, 'member', true, 11, now(), now()
         WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE code = 'aut_retiro_terceros')`,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM document_types WHERE code = 'aut_retiro_terceros' AND NOT EXISTS (SELECT 1 FROM member_documents md WHERE md.document_type_id = document_types.id)`,
    );
  },
};

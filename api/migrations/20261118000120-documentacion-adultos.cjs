'use strict';

/**
 * Documentación de adultos (legajo del adulto), con el mismo semáforo que la de protagonistas.
 *  - document_types.applies_to: 'member' (protagonistas) o 'adult' (adultos).
 *  - adult_documents: qué presentó cada adulto y cuándo vence.
 *  - Tipos iniciales para adultos (se editan desde Catálogos).
 * Idempotente.
 */
const ADULT_TYPES = [
  // [code, nombre, vence, obligatorio, orden]
  ['ad_ficha_medica', 'Ficha médica / declaración jurada de salud', true, true, 1],
  ['ad_dni', 'DNI (fotocopia)', false, true, 2],
  ['ad_obra_social', 'Credencial de obra social (fotocopia)', false, true, 3],
  ['ad_antecedentes', 'Certificado de antecedentes penales', true, true, 4],
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      await q(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS applies_to VARCHAR(10) NOT NULL DEFAULT 'member'`);
      await q(`CREATE TABLE IF NOT EXISTS adult_documents (
        id UUID PRIMARY KEY,
        adult_id UUID NOT NULL REFERENCES adults(id) ON UPDATE CASCADE ON DELETE CASCADE,
        document_type_id UUID NOT NULL REFERENCES document_types(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        presented BOOLEAN NOT NULL DEFAULT false,
        not_applicable BOOLEAN NOT NULL DEFAULT false,
        presented_at DATE,
        expires_at DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        deleted_at TIMESTAMPTZ
      )`);
      await q('CREATE UNIQUE INDEX IF NOT EXISTS adult_documents_adult_type ON adult_documents (adult_id, document_type_id) WHERE deleted_at IS NULL');
      for (const [code, name, hasExpiry, required, sortOrder] of ADULT_TYPES) {
        await q(
          `INSERT INTO document_types (id, code, name, has_expiry, required, applies_to, active, sort_order, created_at, updated_at)
           SELECT gen_random_uuid(), :code, :name, :hasExpiry, :required, 'adult', true, :sortOrder, now(), now()
           WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE code = :code)`,
          { code, name, hasExpiry, required, sortOrder },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q('DROP TABLE IF EXISTS adult_documents');
      await q(`DELETE FROM document_types WHERE applies_to = 'adult'`);
      await q('ALTER TABLE document_types DROP COLUMN IF EXISTS applies_to');
    });
  },
};

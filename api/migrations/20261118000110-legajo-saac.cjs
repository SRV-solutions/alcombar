'use strict';

/**
 * Legajo personal según las planillas de Scouts de Argentina (versión 07-21).
 *  - document_types.required: los opcionales (p. ej. "retirarse solo/a") no cuentan como faltantes.
 *  - member_documents.not_applicable: "No corresponde" para ese protagonista (p. ej. no tiene obra social).
 *  - Tipos de documento del legajo: se agregan los que faltan; los que ya estaban solo se renombran si
 *    conservan el nombre original (lo editado desde Catálogos no se pisa).
 * Idempotente.
 */
const TYPES = [
  // [code, nombre, vence, obligatorio, orden]
  ['aut_ingreso', 'Autorización de ingreso', false, true, 1],
  ['ficha_medica', 'Declaración jurada de salud (ficha médica)', true, true, 2],
  ['aut_salidas', 'Autorización anual de salidas cercanas', true, true, 3],
  ['aut_imagen', 'Autorización de uso de imagen', true, true, 4],
  ['vacunas', 'Carnet de vacunación (fotocopia)', false, true, 5],
  ['obra_social', 'Credencial de obra social (fotocopia)', false, true, 6],
  ['dni_protagonista', 'DNI del protagonista (fotocopia)', false, true, 7],
  ['dni_responsables', 'DNI de madre, padre o tutor (fotocopia)', false, true, 8],
  ['partida_nacimiento', 'Partida de nacimiento (fotocopia)', false, true, 9],
  ['aut_retiro', 'Autorización para retirarse solo/a', false, false, 10],
];
// Nombres originales que se pueden reemplazar
const OLD_NAMES = {
  ficha_medica: 'Ficha médica',
  aut_salidas: 'Autorización anual de salidas',
  aut_retiro: 'Autorización de retiro',
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });
      await q('ALTER TABLE document_types ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT true');
      await q('ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS not_applicable BOOLEAN NOT NULL DEFAULT false');

      for (const [code, name, hasExpiry, required, sortOrder] of TYPES) {
        await q(
          `INSERT INTO document_types (id, code, name, has_expiry, required, active, sort_order, created_at, updated_at)
           SELECT gen_random_uuid(), :code, :name, :hasExpiry, :required, true, :sortOrder, now(), now()
           WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE code = :code)`,
          { code, name, hasExpiry, required, sortOrder },
        );
        // Los que ya estaban: orden, obligatoriedad y, si conservan el nombre original, el nombre nuevo
        await q(
          `UPDATE document_types SET sort_order = :sortOrder, required = :required, updated_at = now(),
                  name = CASE WHEN name = :old THEN :name ELSE name END
           WHERE code = :code AND deleted_at IS NULL`,
          { code, name, required, sortOrder, old: OLD_NAMES[code] ?? name },
        );
      }
      // La autorización de uso de imagen se firma cada año
      await q(`UPDATE document_types SET has_expiry = true, updated_at = now() WHERE code = 'aut_imagen' AND deleted_at IS NULL`);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q('ALTER TABLE member_documents DROP COLUMN IF EXISTS not_applicable');
      await q('ALTER TABLE document_types DROP COLUMN IF EXISTS required');
    });
  },
};

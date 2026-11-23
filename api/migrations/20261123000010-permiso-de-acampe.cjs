'use strict';

/**
 * - camps.permit: los datos del Permiso de Acampe de Scouts de Argentina que no salen del resto del campamento
 *   (empresa de transporte, referencias del lugar, vehículo de apoyo, horarios, Director/a de Zona…).
 * - meeting_items.materials: materiales de cada momento del programa del día (salen en el plan del campamento).
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE camps ADD COLUMN IF NOT EXISTS permit JSONB');
    await q('ALTER TABLE meeting_items ADD COLUMN IF NOT EXISTS materials VARCHAR(300)');
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE meeting_items DROP COLUMN IF EXISTS materials');
    await q('ALTER TABLE camps DROP COLUMN IF EXISTS permit');
  },
};

'use strict';

/**
 * Programa del sábado: el responsable de un momento puede ser alguien que no es un adulto cargado (el párroco, la
 * Jefatura de Grupo, «todos», un rover en servicio, dos personas…). Se guarda como texto en responsible_text.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE meeting_items ADD COLUMN IF NOT EXISTS responsible_text VARCHAR(120)');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE meeting_items DROP COLUMN IF EXISTS responsible_text');
  },
};

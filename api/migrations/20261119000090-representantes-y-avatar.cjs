'use strict';

/**
 * - Representantes juveniles en el Consejo de Grupo: los eligen sus pares (2 por Comunidad Rover, 1 por Comunidad
 *   Caminante) y los marca el equipo de educadores de la unidad.
 * - Foto de perfil de los adultos con tótem: el animal de su tótem (un dibujo de la app, no una imagen subida).
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS youth_rep BOOLEAN NOT NULL DEFAULT FALSE');
    await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS youth_rep_since DATE');
    await q('CREATE INDEX IF NOT EXISTS members_youth_rep ON members (unit_id) WHERE youth_rep');
    await q('ALTER TABLE adults ADD COLUMN IF NOT EXISTS avatar VARCHAR(30)');
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE adults DROP COLUMN IF EXISTS avatar');
    await q('DROP INDEX IF EXISTS members_youth_rep');
    await q('ALTER TABLE members DROP COLUMN IF EXISTS youth_rep_since');
    await q('ALTER TABLE members DROP COLUMN IF EXISTS youth_rep');
  },
};

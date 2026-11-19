'use strict';

/**
 * Unidades: en vez de un «mínimo de adultos» fijo se guarda cuántos protagonistas puede haber por adulto, y el mínimo
 * se calcula con los protagonistas activos. Arranca con el número de cada rama: 6 en Castores, Lobatos y Scouts,
 * 8 en Caminantes y Rovers. La columna min_adults queda sin uso (nunca se cargó). Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE units ADD COLUMN IF NOT EXISTS kids_per_adult INTEGER');
    await queryInterface.sequelize.query(
      "UPDATE units SET kids_per_adult = CASE WHEN branch IN ('caminantes','rovers') THEN 8 ELSE 6 END WHERE kids_per_adult IS NULL",
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE units DROP COLUMN IF EXISTS kids_per_adult');
  },
};

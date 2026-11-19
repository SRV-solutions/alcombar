'use strict';

/**
 * Desafíos de las competencias:
 *  - competencies.specialty_challenges: tercera categoría del catálogo (requeridos, opcionales y de especialidad).
 *  - member_competencies.challenges: los desafíos asignados a cada protagonista en esa competencia, elegidos de la
 *    lista del catálogo o escritos a mano (propios): [{ text, kind, done, doneAt }].
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("ALTER TABLE competencies ADD COLUMN IF NOT EXISTS specialty_challenges JSONB NOT NULL DEFAULT '[]'::jsonb");
    await queryInterface.sequelize.query("ALTER TABLE member_competencies ADD COLUMN IF NOT EXISTS challenges JSONB NOT NULL DEFAULT '[]'::jsonb");
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE member_competencies DROP COLUMN IF EXISTS challenges');
    await queryInterface.sequelize.query('ALTER TABLE competencies DROP COLUMN IF EXISTS specialty_challenges');
  },
};

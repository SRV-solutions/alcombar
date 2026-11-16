'use strict';

/** Formación por niveles con módulos: "Nivel 2 (de 9)" → el curso tiene 9 módulos y el adulto completó N. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('courses', 'total_modules', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn('adult_courses', 'modules_done', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('adult_courses', 'modules_done', { transaction });
      await queryInterface.removeColumn('courses', 'total_modules', { transaction });
    });
  },
};

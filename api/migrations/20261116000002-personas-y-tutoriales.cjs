'use strict';

/**
 * - Protagonistas "por asignar": la unidad puede quedar vacía (se sabe la rama pero no la unidad).
 * - Rama en el protagonista y en el cargo del adulto (para los que todavía no tienen unidad).
 * - external_id: identificador de Mi Rincón (SAAC), para reimportar sin duplicar.
 * - Avance de los tutoriales de cada usuario.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, UUID, JSONB } = Sequelize;
    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await queryInterface.changeColumn('members', 'unit_id', { type: UUID, allowNull: true }, t);
      await queryInterface.addColumn('members', 'branch', { type: STRING(20), allowNull: true }, t);
      await queryInterface.sequelize.query(
        'UPDATE members m SET branch = u.branch FROM units u WHERE u.id = m.unit_id AND m.branch IS NULL',
        t,
      );
      await queryInterface.addColumn('members', 'external_id', { type: STRING(60), allowNull: true }, t);
      await queryInterface.addIndex('members', ['external_id'], t);
      await queryInterface.addColumn('adults', 'external_id', { type: STRING(60), allowNull: true }, t);
      await queryInterface.addIndex('adults', ['external_id'], t);
      await queryInterface.addColumn('adult_assignments', 'branch', { type: STRING(20), allowNull: true }, t);
      await queryInterface.addColumn(
        'users',
        'tutorials',
        { type: JSONB, allowNull: false, defaultValue: Sequelize.literal(`'{"done":[],"skipped":[]}'::jsonb`) },
        t,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await queryInterface.removeColumn('users', 'tutorials', t);
      await queryInterface.removeColumn('adult_assignments', 'branch', t);
      await queryInterface.removeColumn('adults', 'external_id', t);
      await queryInterface.removeColumn('members', 'external_id', t);
      await queryInterface.removeColumn('members', 'branch', t);
      await queryInterface.sequelize.query('DELETE FROM members WHERE unit_id IS NULL', t);
      await queryInterface.changeColumn('members', 'unit_id', { type: Sequelize.UUID, allowNull: false }, t);
    });
  },
};

'use strict';

/**
 * Notas de seguimiento de la progresión personal: cualquier adulto de la unidad anota cómo viene cada protagonista.
 * Junto con los cambios de la progresión (que ya registra la auditoría) arman el historial de seguimiento.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, TEXT, DATE, DATEONLY } = Sequelize;
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'progression_notes',
        {
          id: { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
          member_id: { type: UUID, allowNull: false, references: { model: 'members', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
          author_user_id: { type: UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          date: { type: DATEONLY, allowNull: false },
          note: { type: TEXT, allowNull: false },
          created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
          updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
          deleted_at: { type: DATE },
        },
        { transaction },
      );
      await queryInterface.addIndex('progression_notes', ['member_id', 'date'], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('progression_notes');
  },
};

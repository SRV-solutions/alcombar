'use strict';

/** Reportes de problemas de la plataforma ("Reportar un problema"), por ahora solo texto. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, DATE, JSONB } = Sequelize;
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'support_reports',
        {
          id: { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
          user_id: { type: UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          category: { type: STRING(20), allowNull: false },
          description: { type: TEXT, allowNull: false },
          page_url: { type: STRING(300) },
          app_version: { type: STRING(40) },
          user_agent: { type: STRING(300) },
          client_errors: { type: JSONB },
          status: { type: STRING(20), allowNull: false, defaultValue: 'ABIERTO' },
          response: { type: TEXT },
          responded_by: { type: UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          resolved_at: { type: DATE },
          created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
          updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
          deleted_at: { type: DATE },
        },
        { transaction },
      );
      await queryInterface.addIndex('support_reports', ['status'], { transaction });
      await queryInterface.addIndex('support_reports', ['user_id'], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('support_reports');
  },
};

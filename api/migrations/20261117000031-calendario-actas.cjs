'use strict';

/** Etapa 8: calendario del Grupo y de cada unidad, actas del Consejo de Grupo y repositorio de documentos. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY } = Sequelize;
    const id = { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') };
    const soft = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      deleted_at: { type: DATE, allowNull: true },
    };
    const fk = (table) => ({ type: UUID, allowNull: true, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });

    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await queryInterface.createTable(
        'calendar_events',
        {
          id,
          title: { type: STRING(160), allowNull: false },
          type: { type: STRING(20), allowNull: false, defaultValue: 'otro' },
          unit_id: fk('units'),
          start_date: { type: DATEONLY, allowNull: false },
          end_date: { type: DATEONLY, allowNull: false },
          all_day: { type: BOOLEAN, allowNull: false, defaultValue: true },
          start_time: { type: STRING(5) },
          end_time: { type: STRING(5) },
          place: { type: STRING(200) },
          description: { type: TEXT },
          created_by_user_id: fk('users'),
          ...soft,
        },
        t,
      );
      await queryInterface.addIndex('calendar_events', ['start_date', 'end_date'], t);
      await queryInterface.addIndex('calendar_events', ['unit_id'], t);

      await queryInterface.createTable(
        'council_minutes',
        {
          id,
          number: { type: INTEGER, allowNull: false },
          year: { type: INTEGER, allowNull: false },
          date: { type: DATEONLY, allowNull: false },
          kind: { type: STRING(20), allowNull: false, defaultValue: 'ordinaria' },
          title: { type: STRING(200), allowNull: false },
          attendees: { type: TEXT },
          agenda: { type: TEXT },
          content: { type: TEXT },
          drive_url: { type: STRING(500) },
          status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
          approved_at: { type: DATE },
          created_by_user_id: fk('users'),
          ...soft,
        },
        t,
      );
      await queryInterface.addIndex('council_minutes', ['year', 'number'], t);

      await queryInterface.createTable(
        'document_links',
        {
          id,
          title: { type: STRING(200), allowNull: false },
          category: { type: STRING(30), allowNull: false, defaultValue: 'otros' },
          url: { type: STRING(500), allowNull: false },
          description: { type: TEXT },
          unit_id: fk('units'),
          created_by_user_id: fk('users'),
          ...soft,
        },
        t,
      );
      await queryInterface.addIndex('document_links', ['category'], t);
    });
  },

  async down(queryInterface) {
    for (const table of ['document_links', 'council_minutes', 'calendar_events']) await queryInterface.dropTable(table);
  },
};

'use strict';

/**
 * - saturdays: el calendario anual de sábados, con las mismas filas que la planilla del Grupo (efemérides, formación,
 *   servicio/misa, reuniones, actividades y otros). Las unidades de servicio de cada sábado siguen siendo eventos
 *   "servicio" del calendario. Lo edita la Jefatura de Grupo.
 * - council_minutes.agenda_sent_*: cuándo y quién mandó el temario del Consejo como aviso.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, DATE, DATEONLY, BOOLEAN } = Sequelize;
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('saturdays')) {
        await queryInterface.createTable(
          'saturdays',
          {
            id: { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
            date: { type: DATEONLY, allowNull: false, unique: true },
            no_activity: { type: BOOLEAN, allowNull: false, defaultValue: false },
            // Las filas de la planilla del calendario anual del Grupo
            ephemeris: { type: TEXT }, // Efemérides
            training: { type: TEXT }, // Formación
            service_note: { type: STRING(200) }, // Servicio/Misa además de las unidades: "Familia Scout", "Misa a cargo de la ACA"…
            meetings: { type: TEXT }, // Reuniones (Consejo de Grupo…)
            activities: { type: TEXT }, // Actividades
            others: { type: TEXT }, // Otros (feriados, campamentos…)
            updated_by_user_id: { type: UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
            created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
            updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
          },
          { transaction },
        );
      }
      const cols = await queryInterface.describeTable('council_minutes', { transaction });
      if (!cols.agenda_sent_at) {
        await queryInterface.addColumn('council_minutes', 'agenda_sent_at', { type: DATE }, { transaction });
        await queryInterface.addColumn(
          'council_minutes',
          'agenda_sent_by_user_id',
          { type: UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          { transaction },
        );
        await queryInterface.addColumn('council_minutes', 'agenda_message', { type: TEXT }, { transaction });
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('council_minutes', 'agenda_message');
    await queryInterface.removeColumn('council_minutes', 'agenda_sent_by_user_id');
    await queryInterface.removeColumn('council_minutes', 'agenda_sent_at');
    await queryInterface.dropTable('saturdays');
  },
};

'use strict';

/**
 * Avisos de la plataforma:
 * - notifications: la campanita de cada usuario (también se mandan por mail).
 * - registry_tasks: altas y bajas que hay que cargar en Cruz del Sur (la plataforma oficial de SAAC).
 *   Las genera ALCOMBAR cuando alguien da de alta o de baja a un protagonista o adulto, y las resuelve el equipo
 *   que recibe esos avisos (por defecto, Administración y Finanzas).
 * - support_teams.receives_registry_alerts: qué equipos reciben esos avisos.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, DATE, BOOLEAN } = Sequelize;
    const uuidPk = { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') };
    const fk = (model, onDelete = 'SET NULL', allowNull = true) => ({ type: UUID, allowNull, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete });
    const stamps = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    };
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes('notifications')) {
        await queryInterface.createTable(
          'notifications',
          {
            id: uuidPk,
            user_id: fk('users', 'CASCADE', false),
            kind: { type: STRING(30), allowNull: false },
            title: { type: STRING(200), allowNull: false },
            body: { type: TEXT },
            link: { type: STRING(300) },
            read_at: { type: DATE },
            ...stamps,
          },
          { transaction },
        );
        await queryInterface.addIndex('notifications', ['user_id', 'read_at', 'created_at'], { transaction });
      }

      if (!tables.includes('registry_tasks')) {
        await queryInterface.createTable(
          'registry_tasks',
          {
            id: uuidPk,
            kind: { type: STRING(10), allowNull: false }, // alta | baja
            person_type: { type: STRING(10), allowNull: false }, // member | adult
            member_id: fk('members'),
            adult_id: fk('adults'),
            person_name: { type: STRING(200), allowNull: false },
            unit_id: fk('units'),
            detail: { type: STRING(300) },
            status: { type: STRING(15), allowNull: false, defaultValue: 'pendiente' }, // pendiente | hecha | anulada
            created_by_user_id: fk('users'),
            resolved_at: { type: DATE },
            resolved_by_user_id: fk('users'),
            resolution_note: { type: STRING(300) },
            ...stamps,
          },
          { transaction },
        );
        await queryInterface.addIndex('registry_tasks', ['status', 'created_at'], { transaction });
        await queryInterface.addIndex('registry_tasks', ['member_id'], { transaction });
        await queryInterface.addIndex('registry_tasks', ['adult_id'], { transaction });
      }

      const cols = await queryInterface.describeTable('support_teams', { transaction });
      if (!cols.receives_registry_alerts) {
        await queryInterface.addColumn('support_teams', 'receives_registry_alerts', { type: BOOLEAN, allowNull: false, defaultValue: false }, { transaction });
        // El equipo de administración recibe los avisos de altas y bajas (se puede cambiar desde Equipos de apoyo)
        await queryInterface.sequelize.query(
          `UPDATE support_teams SET receives_registry_alerts = true
           WHERE deleted_at IS NULL AND translate(lower(name), 'áéíóú', 'aeiou') LIKE 'administracion%'`,
          { transaction },
        );
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('support_teams', 'receives_registry_alerts');
    await queryInterface.dropTable('registry_tasks');
    await queryInterface.dropTable('notifications');
  },
};

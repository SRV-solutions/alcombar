'use strict';

/** Etapa 7: inventario (categorías, ubicaciones, bienes) y préstamos. */
const CATEGORIES = [
  'Carpas y lonas',
  'Cocina',
  'Herramientas',
  'Material de programa',
  'Banderas y símbolos',
  'Iluminación',
  'Primeros auxilios (botiquín)',
  'Mobiliario',
  'Otros',
];
const LOCATIONS = [
  ['Sede', 'Sede del Grupo'],
  ['Depósito', 'Depósito de materiales'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, DECIMAL } = Sequelize;
    const id = { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    };
    const soft = { ...ts, deleted_at: { type: DATE, allowNull: true } };
    const fk = (table, opts = {}) => ({
      type: UUID,
      allowNull: opts.allowNull ?? true,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: opts.onDelete ?? (opts.allowNull === false ? 'CASCADE' : 'SET NULL'),
    });

    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await queryInterface.createTable(
        'item_categories',
        {
          id,
          name: { type: STRING(80), allowNull: false },
          sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
          active: { type: BOOLEAN, allowNull: false, defaultValue: true },
          ...soft,
        },
        t,
      );
      await queryInterface.createTable(
        'item_locations',
        {
          id,
          name: { type: STRING(80), allowNull: false },
          description: { type: STRING(300) },
          active: { type: BOOLEAN, allowNull: false, defaultValue: true },
          ...soft,
        },
        t,
      );
      await queryInterface.createTable(
        'items',
        {
          id,
          name: { type: STRING(160), allowNull: false },
          category_id: fk('item_categories', { allowNull: false, onDelete: 'RESTRICT' }),
          quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
          condition: { type: STRING(20), allowNull: false, defaultValue: 'bueno' },
          location_id: fk('item_locations'),
          unit_id: fk('units'),
          photo_url: { type: STRING(500) },
          purchase_date: { type: DATEONLY },
          purchase_value: { type: DECIMAL(12, 2) },
          notes: { type: TEXT },
          ...soft,
        },
        t,
      );
      await queryInterface.addIndex('items', ['category_id'], t);
      await queryInterface.addIndex('items', ['unit_id'], t);

      await queryInterface.createTable(
        'loans',
        {
          id,
          borrower_adult_id: fk('adults'),
          borrower_name: { type: STRING(160) },
          purpose: { type: STRING(300), allowNull: false },
          unit_id: fk('units'),
          // Sin clave foránea: las tablas de fichas y campamentos son de otras etapas
          activity_sheet_id: { type: UUID },
          camp_id: { type: UUID },
          out_date: { type: DATEONLY, allowNull: false },
          due_date: { type: DATEONLY, allowNull: false },
          returned_at: { type: DATEONLY },
          status: { type: STRING(20), allowNull: false, defaultValue: 'pedido' },
          approved_by_user_id: fk('users'),
          approved_at: { type: DATE },
          delivered_at: { type: DATE },
          return_notes: { type: TEXT },
          notes: { type: TEXT },
          created_by_user_id: fk('users'),
          ...soft,
        },
        t,
      );
      await queryInterface.addIndex('loans', ['status'], t);
      await queryInterface.addIndex('loans', ['due_date'], t);
      await queryInterface.addIndex('loans', ['camp_id'], t);
      await queryInterface.addIndex('loans', ['activity_sheet_id'], t);

      await queryInterface.createTable(
        'loan_items',
        {
          id,
          loan_id: fk('loans', { allowNull: false }),
          item_id: fk('items', { allowNull: false, onDelete: 'RESTRICT' }),
          quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
          return_condition: { type: STRING(20) },
          return_notes: { type: STRING(300) },
          ...ts,
        },
        t,
      );
      await queryInterface.addIndex('loan_items', ['loan_id'], t);
      await queryInterface.addIndex('loan_items', ['item_id'], t);

      // Catálogos iniciales (editables desde la app)
      for (const [i, name] of CATEGORIES.entries()) {
        await queryInterface.sequelize.query(
          `INSERT INTO item_categories (name, sort_order) SELECT :name, :order
           WHERE NOT EXISTS (SELECT 1 FROM item_categories WHERE name = :name AND deleted_at IS NULL)`,
          { transaction, replacements: { name, order: i + 1 } },
        );
      }
      for (const [name, description] of LOCATIONS) {
        await queryInterface.sequelize.query(
          `INSERT INTO item_locations (name, description) SELECT :name, :description
           WHERE NOT EXISTS (SELECT 1 FROM item_locations WHERE name = :name AND deleted_at IS NULL)`,
          { transaction, replacements: { name, description } },
        );
      }
    });
  },

  async down(queryInterface) {
    for (const table of ['loan_items', 'loans', 'items', 'item_locations', 'item_categories']) {
      await queryInterface.dropTable(table);
    }
  },
};

'use strict';

/**
 * Etapa 3: catálogo de áreas y competencias por rama, ciclos de programa, fichas de actividad,
 * competencias de cada ficha y programa del sábado.
 */
const BRANCHES = ['castores', 'lobatos', 'scouts', 'caminantes', 'rovers'];
const AREAS = ['Salud y bienestar', 'Ambiente', 'Paz y desarrollo', 'Habilidades para la vida'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, JSONB } = Sequelize;
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
    const jsonArray = { type: JSONB, allowNull: false, defaultValue: Sequelize.literal(`'[]'::jsonb`) };

    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      const create = (name, cols) => queryInterface.createTable(name, cols, t);
      const index = (table, fields, opts = {}) => queryInterface.addIndex(table, fields, { ...opts, transaction });

      await create('branch_areas', {
        id,
        branch: { type: STRING(20), allowNull: false },
        name: { type: STRING(80), allowNull: false },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        ...soft,
      });
      await index('branch_areas', ['branch']);

      await create('competencies', {
        id,
        branch: { type: STRING(20), allowNull: false },
        area_id: fk('branch_areas', { allowNull: true }),
        number: { type: INTEGER },
        name: { type: STRING(200), allowNull: false },
        description: { type: TEXT },
        required_challenges: jsonArray,
        optional_challenges: jsonArray,
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });
      await index('competencies', ['branch', 'area_id']);

      await create('program_cycles', {
        id,
        unit_id: fk('units', { allowNull: false }),
        name: { type: STRING(120), allowNull: false },
        start_date: { type: DATEONLY },
        end_date: { type: DATEONLY },
        phase: { type: STRING(20), allowNull: false, defaultValue: 'revisar' },
        diagnosis: { type: TEXT },
        purposes: { type: TEXT },
        evaluation: { type: TEXT },
        ...soft,
      });
      await index('program_cycles', ['unit_id', 'start_date']);

      await create('activity_sheets', {
        id,
        code: { type: STRING(30), allowNull: false },
        unit_id: fk('units', { allowNull: false }),
        cycle_id: fk('program_cycles'),
        name: { type: STRING(160), allowNull: false },
        age_min: { type: INTEGER },
        age_max: { type: INTEGER },
        area_id: fk('branch_areas'),
        participants: { type: INTEGER },
        objectives: jsonArray,
        exploration: { type: TEXT },
        description: { type: TEXT },
        closing: { type: TEXT },
        other_educators: { type: TEXT },
        materials: jsonArray,
        responsible_adult_id: fk('adults'),
        date: { type: DATEONLY },
        place: { type: STRING(200) },
        duration_min: { type: INTEGER },
        opportunity_type: { type: STRING(20), allowNull: false, defaultValue: 'variable' },
        scope: { type: STRING(20), allowNull: false, defaultValue: 'unidad' },
        outside: { type: BOOLEAN, allowNull: false, defaultValue: false },
        safety: { type: TEXT },
        nights: { type: INTEGER },
        status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
        review_notes: { type: TEXT },
        approved_by_user_id: fk('users'),
        approved_at: { type: DATE },
        eval_worked: { type: TEXT },
        eval_change: { type: TEXT },
        eval_attendance: { type: INTEGER },
        evaluated_at: { type: DATE },
        source_sheet_id: { type: UUID },
        ...soft,
      });
      await index('activity_sheets', ['code'], { unique: true, where: { deleted_at: null }, name: 'activity_sheets_code_unique' });
      await index('activity_sheets', ['unit_id', 'date']);
      await index('activity_sheets', ['cycle_id']);
      await index('activity_sheets', ['status']);

      await create('activity_competencies', {
        id,
        activity_sheet_id: fk('activity_sheets', { allowNull: false }),
        competency_id: fk('competencies', { allowNull: false }),
        ...ts,
      });
      await index('activity_competencies', ['activity_sheet_id', 'competency_id'], { unique: true });

      await create('meeting_programs', {
        id,
        unit_id: fk('units', { allowNull: false }),
        date: { type: DATEONLY, allowNull: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('meeting_programs', ['unit_id', 'date'], { unique: true, where: { deleted_at: null }, name: 'meeting_programs_unit_date_unique' });

      await create('meeting_items', {
        id,
        meeting_program_id: fk('meeting_programs', { allowNull: false }),
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        time: { type: STRING(5) },
        activity_sheet_id: fk('activity_sheets'),
        title: { type: STRING(200) },
        responsible_adult_id: fk('adults'),
        duration_min: { type: INTEGER },
        notes: { type: STRING(500) },
        ...ts,
      });
      await index('meeting_items', ['meeting_program_id', 'sort_order']);

      // Áreas de desarrollo de SAAC para todas las ramas (editables desde la app)
      for (const branch of BRANCHES) {
        for (const [i, name] of AREAS.entries()) {
          await queryInterface.sequelize.query(
            `INSERT INTO branch_areas (branch, name, sort_order)
             SELECT :branch, :name, :sort WHERE NOT EXISTS (SELECT 1 FROM branch_areas WHERE branch = :branch AND name = :name)`,
            { transaction, replacements: { branch, name, sort: i + 1 } },
          );
        }
      }
    });
  },

  async down(queryInterface) {
    for (const table of ['meeting_items', 'meeting_programs', 'activity_competencies', 'activity_sheets', 'program_cycles', 'competencies', 'branch_areas']) {
      await queryInterface.dropTable(table);
    }
  },
};

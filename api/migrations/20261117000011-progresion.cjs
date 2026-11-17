'use strict';

/**
 * Etapa 4: progresión personal. Esquemas por rama (con versión) y sus etapas, etapas de cada protagonista,
 * competencias elegidas, momentos (ambientación, tiempo de pase), roles en el pequeño grupo,
 * revisiones de fin de ciclo y especialidades.
 */
const SCHEMES = [
  { branch: 'castores', name: 'A definir', stages: [] },
  { branch: 'lobatos', name: 'Rumbo Sur', stages: ['Pata Tierna', 'Lobo Saltador', 'Lobo Rastreador', 'Lobo Cazador'] },
  { branch: 'scouts', name: 'Rumbo Sur', stages: ['Pistas', 'Senda', 'Rumbo', 'Travesía'] },
  { branch: 'caminantes', name: 'A definir', stages: [] },
  { branch: 'rovers', name: 'A definir', stages: [] },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY } = Sequelize;
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
      const create = (name, cols) => queryInterface.createTable(name, cols, t);
      const index = (table, fields, opts = {}) => queryInterface.addIndex(table, fields, { ...opts, transaction });

      await create('progression_schemes', {
        id,
        branch: { type: STRING(20), allowNull: false },
        name: { type: STRING(80), allowNull: false },
        version: { type: INTEGER, allowNull: false, defaultValue: 1 },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });
      await index('progression_schemes', ['branch']);

      await create('progression_stages', {
        id,
        scheme_id: fk('progression_schemes', { allowNull: false }),
        name: { type: STRING(80), allowNull: false },
        description: { type: TEXT },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        ...soft,
      });
      await index('progression_stages', ['scheme_id', 'sort_order']);

      await create('member_stages', {
        id,
        member_id: fk('members', { allowNull: false }),
        stage_id: fk('progression_stages', { allowNull: false, onDelete: 'RESTRICT' }),
        started_at: { type: DATEONLY },
        insignia_at: { type: DATEONLY },
        ended_at: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_stages', ['member_id']);

      await create('member_competencies', {
        id,
        member_id: fk('members', { allowNull: false }),
        competency_id: fk('competencies', { allowNull: false, onDelete: 'RESTRICT' }),
        member_stage_id: fk('member_stages'),
        status: { type: STRING(20), allowNull: false, defaultValue: 'elegida' },
        achieved_at: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_competencies', ['member_id']);

      await create('member_progress', {
        id,
        member_id: fk('members', { allowNull: false }),
        ambientacion_since: { type: DATEONLY },
        transition: { type: BOOLEAN, allowNull: false, defaultValue: false },
        transition_notes: { type: TEXT },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_progress', ['member_id'], { unique: true, where: { deleted_at: null }, name: 'member_progress_member_unique' });

      await create('member_roles', {
        id,
        member_id: fk('members', { allowNull: false }),
        cycle_id: fk('program_cycles'),
        role: { type: STRING(80), allowNull: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_roles', ['member_id']);

      await create('cycle_reviews', {
        id,
        member_id: fk('members', { allowNull: false }),
        cycle_id: fk('program_cycles'),
        date: { type: DATEONLY },
        self_review: { type: TEXT },
        peers_review: { type: TEXT },
        educator_review: { type: TEXT },
        ...soft,
      });
      await index('cycle_reviews', ['member_id']);
      await index('cycle_reviews', ['cycle_id']);

      await create('specialties', {
        id,
        name: { type: STRING(120), allowNull: false },
        description: { type: TEXT },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });

      await create('member_specialties', {
        id,
        member_id: fk('members', { allowNull: false }),
        specialty_id: fk('specialties', { allowNull: false, onDelete: 'RESTRICT' }),
        achieved_at: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_specialties', ['member_id']);

      // Esquemas iniciales (editables desde la app). Castores, Caminantes y Rovers: a definir.
      for (const s of SCHEMES) {
        const [rows] = await queryInterface.sequelize.query('SELECT id FROM progression_schemes WHERE branch = :branch AND deleted_at IS NULL LIMIT 1', {
          transaction,
          replacements: { branch: s.branch },
        });
        if (rows.length) continue;
        const [[scheme]] = await queryInterface.sequelize.query(
          'INSERT INTO progression_schemes (branch, name, version) VALUES (:branch, :name, 1) RETURNING id',
          { transaction, replacements: { branch: s.branch, name: s.name } },
        );
        for (const [i, name] of s.stages.entries()) {
          await queryInterface.sequelize.query('INSERT INTO progression_stages (scheme_id, name, sort_order) VALUES (:schemeId, :name, :sort)', {
            transaction,
            replacements: { schemeId: scheme.id, name, sort: i + 1 },
          });
        }
      }
    });
  },

  async down(queryInterface) {
    for (const table of [
      'member_specialties',
      'specialties',
      'cycle_reviews',
      'member_roles',
      'member_progress',
      'member_competencies',
      'member_stages',
      'progression_stages',
      'progression_schemes',
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};

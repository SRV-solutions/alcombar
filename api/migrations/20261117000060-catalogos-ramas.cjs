'use strict';

/**
 * Catálogos de progresión de cada rama según las guías de Scouts de Argentina (Plataforma Rumbo Sur, 2026):
 * áreas (senderos / rutas), esquema y etapas, competencias de rama y especialidades.
 * Los títulos de las competencias son los de la guía cuando son cortos; si no, una etiqueta breve. Las
 * descripciones son resúmenes propios (el texto completo está en la guía de cada rama).
 *
 * También: las especialidades pasan a tener rama y área, y las áreas una descripción.
 * Es idempotente: no duplica lo que ya exista ni pisa competencias o especialidades cargadas a mano.
 * Castores queda "Próximamente" (todavía no hay propuesta publicada).
 */
const data = require('./data/catalogos-ramas.json');

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, UUID, TEXT } = Sequelize;
    const q = queryInterface.sequelize;
    const SELECT = Sequelize.QueryTypes.SELECT;

    await q.transaction(async (transaction) => {
      // ---- Esquema ----
      const cols = async (table) => Object.keys(await queryInterface.describeTable(table));
      if (!(await cols('specialties')).includes('branch')) {
        await queryInterface.addColumn('specialties', 'branch', { type: STRING(20) }, { transaction });
        await queryInterface.addColumn(
          'specialties',
          'area_id',
          { type: UUID, references: { model: 'branch_areas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          { transaction },
        );
        await queryInterface.addIndex('specialties', ['branch'], { transaction });
      }
      if (!(await cols('branch_areas')).includes('description')) {
        await queryInterface.addColumn('branch_areas', 'description', { type: TEXT }, { transaction });
      }

      const all = (sql, replacements) => q.query(sql, { replacements, type: SELECT, transaction });
      const one = async (sql, replacements) => (await all(sql, replacements))[0];
      const exec = (sql, replacements) => q.query(sql, { replacements, transaction });

      for (const b of data.branches) {
        // ---- Áreas ----
        const areaIds = {};
        if (b.areas && b.areas.length) {
          const current = await all('SELECT id, name FROM branch_areas WHERE branch = :branch AND deleted_at IS NULL', { branch: b.branch });
          if (b.replaceAreas) {
            // Se dan de baja las áreas que no son de esta rama, solo si nada las usa
            const wanted = new Set(b.areas.map((a) => norm(a.name)));
            for (const a of current) {
              if (wanted.has(norm(a.name))) continue;
              const used = await one(
                `SELECT (SELECT COUNT(*) FROM competencies WHERE area_id = :id) + (SELECT COUNT(*) FROM activity_sheets WHERE area_id = :id) AS n`,
                { id: a.id },
              );
              if (Number(used.n) === 0) await exec('UPDATE branch_areas SET deleted_at = now() WHERE id = :id', { id: a.id });
            }
          }
          let order = 0;
          for (const a of b.areas) {
            order += 1;
            const found = current.find((c) => norm(c.name) === norm(a.name));
            if (found) {
              await exec('UPDATE branch_areas SET description = :description, sort_order = :order, updated_at = now() WHERE id = :id', {
                id: found.id,
                description: a.description ?? null,
                order,
              });
              areaIds[norm(a.name)] = found.id;
            } else {
              const r = await one(
                `INSERT INTO branch_areas (id, branch, name, description, sort_order, created_at, updated_at)
                 VALUES (gen_random_uuid(), :branch, :name, :description, :order, now(), now()) RETURNING id`,
                { branch: b.branch, name: a.name, description: a.description ?? null, order },
              );
              areaIds[norm(a.name)] = r.id;
            }
          }
        }

        // ---- Esquema y etapas ----
        if (b.scheme) {
          let scheme = await one(
            'SELECT id FROM progression_schemes WHERE branch = :branch AND active AND deleted_at IS NULL ORDER BY version DESC LIMIT 1',
            { branch: b.branch },
          );
          if (!scheme) {
            scheme = await one(
              `INSERT INTO progression_schemes (id, branch, name, version, active, created_at, updated_at)
               VALUES (gen_random_uuid(), :branch, :name, 1, true, now(), now()) RETURNING id`,
              { branch: b.branch, name: b.scheme.name },
            );
          } else {
            await exec('UPDATE progression_schemes SET name = :name, updated_at = now() WHERE id = :id', { id: scheme.id, name: b.scheme.name });
          }
          const stages = await all('SELECT id FROM progression_stages WHERE scheme_id = :id AND deleted_at IS NULL ORDER BY sort_order, created_at', {
            id: scheme.id,
          });
          for (const [i, st] of (b.scheme.stages || []).entries()) {
            if (stages[i]) {
              await exec('UPDATE progression_stages SET name = :name, description = :description, sort_order = :order, updated_at = now() WHERE id = :id', {
                id: stages[i].id,
                name: st.name,
                description: st.description ?? null,
                order: i + 1,
              });
            } else {
              await exec(
                `INSERT INTO progression_stages (id, scheme_id, name, description, sort_order, created_at, updated_at)
                 VALUES (gen_random_uuid(), :schemeId, :name, :description, :order, now(), now())`,
                { schemeId: scheme.id, name: st.name, description: st.description ?? null, order: i + 1 },
              );
            }
          }
        }

        // ---- Competencias (por número dentro de la rama) ----
        for (const c of b.competencies || []) {
          const exists = await one('SELECT id FROM competencies WHERE branch = :branch AND number = :number AND deleted_at IS NULL', {
            branch: b.branch,
            number: c.number,
          });
          if (exists) continue;
          await exec(
            `INSERT INTO competencies (id, branch, area_id, number, name, description, required_challenges, optional_challenges, active, created_at, updated_at)
             VALUES (gen_random_uuid(), :branch, :areaId, :number, :name, :description, '[]', '[]', true, now(), now())`,
            { branch: b.branch, areaId: areaIds[norm(c.area)] ?? null, number: c.number, name: c.name, description: c.description ?? null },
          );
        }

        // ---- Especialidades (por nombre dentro de la rama) ----
        for (const s of b.specialties || []) {
          const exists = await one(
            'SELECT id FROM specialties WHERE lower(name) = lower(:name) AND (branch = :branch OR branch IS NULL) AND deleted_at IS NULL',
            { name: s.name, branch: b.branch },
          );
          if (exists) continue;
          await exec(
            `INSERT INTO specialties (id, name, description, branch, area_id, active, created_at, updated_at)
             VALUES (gen_random_uuid(), :name, :description, :branch, :areaId, true, now(), now())`,
            { name: s.name, description: s.description ?? null, branch: b.branch, areaId: areaIds[norm(s.area)] ?? null },
          );
        }
      }
    });
  },

  async down(queryInterface) {
    // Los datos cargados quedan (pueden estar en uso); solo se quitan las columnas nuevas
    await queryInterface.removeColumn('specialties', 'area_id');
    await queryInterface.removeColumn('specialties', 'branch');
    await queryInterface.removeColumn('branch_areas', 'description');
  },
};

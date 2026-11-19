'use strict';

/**
 * Comunidad Rover, ajustada a las herramientas de la Rama publicadas en Rumbo Sur:
 *  - la Minga con su plantilla de organización (propósito, participantes, actividades, recursos, difusión y cierre),
 *    y la posibilidad de ser parte de un proyecto;
 *  - la Asamblea con su objetivo, su orden del día y quién la preside;
 *  - los «altos en el camino»: la evaluación periódica del Plan Personal.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    const add = (table, column, type) => q(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);

    await add('rover_projects', 'support_team', 'TEXT');
    await add('rover_projects', 'expected_result', 'TEXT');
    await add('rover_projects', 'rovers_estimate', 'INTEGER');
    await add('rover_projects', 'allies', 'TEXT');
    await add('rover_projects', 'roles', 'TEXT');
    await add('rover_projects', 'activities', "JSONB NOT NULL DEFAULT '[]'");
    await add('rover_projects', 'tools', 'TEXT');
    await add('rover_projects', 'outreach', 'TEXT');
    await add('rover_projects', 'media', 'TEXT');
    await add('rover_projects', 'slogan', 'TEXT');
    await add('rover_projects', 'learnings', 'TEXT');
    await add('rover_projects', 'impact', 'TEXT');
    await add('rover_projects', 'next_steps', 'TEXT');
    await add('rover_projects', 'record_link', 'TEXT');
    await add('rover_projects', 'parent_project_id', 'UUID REFERENCES rover_projects(id) ON UPDATE CASCADE ON DELETE SET NULL');
    await q('CREATE INDEX IF NOT EXISTS rover_projects_parent ON rover_projects (parent_project_id) WHERE parent_project_id IS NOT NULL');

    await add('rover_assemblies', 'purpose', 'VARCHAR(14)');
    await add('rover_assemblies', 'agenda', 'TEXT');
    await add('rover_assemblies', 'chair_member_id', 'UUID REFERENCES members(id) ON UPDATE CASCADE ON DELETE SET NULL');

    await q(`CREATE TABLE IF NOT EXISTS rover_plan_reviews (
      id UUID PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
      review_date DATE NOT NULL,
      answers JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE INDEX IF NOT EXISTS rover_plan_reviews_member ON rover_plan_reviews (member_id, review_date)');
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('DROP TABLE IF EXISTS rover_plan_reviews');
    for (const c of ['purpose', 'agenda', 'chair_member_id']) await q(`ALTER TABLE rover_assemblies DROP COLUMN IF EXISTS ${c}`);
    for (const c of ['support_team', 'expected_result', 'rovers_estimate', 'allies', 'roles', 'activities', 'tools', 'outreach', 'media', 'slogan', 'learnings', 'impact', 'next_steps', 'record_link', 'parent_project_id']) {
      await q(`ALTER TABLE rover_projects DROP COLUMN IF EXISTS ${c}`);
    }
  },
};

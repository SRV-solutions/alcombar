'use strict';

/**
 * Módulo de la Comunidad Rover:
 *  - Plan Personal: visión a futuro y metas (con acciones, recursos y plazo), como lo define la Guía de la Rama.
 *  - Proyectos y mingas, con sus participantes y colaboradores.
 *  - Asamblea de Comunidad: postulaciones, presentes y votos.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`CREATE TABLE IF NOT EXISTS rover_plans (
      id UUID PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
      vision TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE UNIQUE INDEX IF NOT EXISTS rover_plans_member ON rover_plans (member_id)');

    await q(`CREATE TABLE IF NOT EXISTS rover_goals (
      id UUID PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      area_id UUID REFERENCES branch_areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
      competency_id UUID REFERENCES competencies(id) ON UPDATE CASCADE ON DELETE SET NULL,
      actions JSONB NOT NULL DEFAULT '[]',
      resources TEXT,
      due_date DATE,
      status VARCHAR(12) NOT NULL DEFAULT 'en_curso',
      achieved_at DATE,
      reflection TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE INDEX IF NOT EXISTS rover_goals_member ON rover_goals (member_id)');

    await q(`CREATE TABLE IF NOT EXISTS rover_projects (
      id UUID PRIMARY KEY,
      unit_id UUID NOT NULL REFERENCES units(id) ON UPDATE CASCADE,
      kind VARCHAR(10) NOT NULL,
      field VARCHAR(14),
      scope VARCHAR(12),
      title VARCHAR(200) NOT NULL,
      owner_member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE,
      what TEXT,
      why TEXT,
      how_where TEXT,
      for_whom TEXT,
      start_date DATE,
      end_date DATE,
      schedule TEXT,
      cost TEXT,
      funding TEXT,
      needs TEXT,
      celebration TEXT,
      status VARCHAR(12) NOT NULL DEFAULT 'borrador',
      final_report TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE INDEX IF NOT EXISTS rover_projects_unit ON rover_projects (unit_id, status)');
    await q('CREATE INDEX IF NOT EXISTS rover_projects_owner ON rover_projects (owner_member_id)');

    await q(`CREATE TABLE IF NOT EXISTS rover_project_people (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES rover_projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
      member_id UUID REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
      adult_id UUID REFERENCES adults(id) ON UPDATE CASCADE ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      CHECK ((member_id IS NULL) <> (adult_id IS NULL))
    )`);
    await q('CREATE UNIQUE INDEX IF NOT EXISTS rover_project_people_member ON rover_project_people (project_id, member_id) WHERE member_id IS NOT NULL');
    await q('CREATE UNIQUE INDEX IF NOT EXISTS rover_project_people_adult ON rover_project_people (project_id, adult_id) WHERE adult_id IS NOT NULL');

    await q(`CREATE TABLE IF NOT EXISTS rover_assemblies (
      id UUID PRIMARY KEY,
      unit_id UUID NOT NULL REFERENCES units(id) ON UPDATE CASCADE,
      status VARCHAR(8) NOT NULL DEFAULT 'abierta',
      opened_at TIMESTAMPTZ NOT NULL,
      closed_at TIMESTAMPTZ,
      opened_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
      present JSONB NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    // Una sola Asamblea abierta por Comunidad
    await q("CREATE UNIQUE INDEX IF NOT EXISTS rover_assemblies_open ON rover_assemblies (unit_id) WHERE status = 'abierta'");

    await q(`CREATE TABLE IF NOT EXISTS rover_assembly_items (
      id UUID PRIMARY KEY,
      assembly_id UUID NOT NULL REFERENCES rover_assemblies(id) ON UPDATE CASCADE ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES rover_projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
      status VARCHAR(12) NOT NULL DEFAULT 'pendiente',
      present_count INTEGER,
      yes INTEGER,
      no INTEGER,
      abstain INTEGER,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE INDEX IF NOT EXISTS rover_assembly_items_assembly ON rover_assembly_items (assembly_id, project_id)');

    await q(`CREATE TABLE IF NOT EXISTS rover_votes (
      id UUID PRIMARY KEY,
      item_id UUID NOT NULL REFERENCES rover_assembly_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
      vote VARCHAR(10) NOT NULL,
      cast_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE UNIQUE INDEX IF NOT EXISTS rover_votes_unique ON rover_votes (item_id, member_id)');
  },
  async down(queryInterface) {
    for (const t of ['rover_votes', 'rover_assembly_items', 'rover_assemblies', 'rover_project_people', 'rover_projects', 'rover_goals', 'rover_plans']) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${t}`);
    }
  },
};

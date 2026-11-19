'use strict';

/**
 * Formación de adultos como la muestra Mi Rincón:
 *  - adult_experiences: el historial de experiencias de formación, una por una, con su certificado en PDF.
 *  - adult_habilitations: habilitaciones por etapa (básica / intermedia / avanzada) con su acta.
 *  - adult_courses: datos de la Insignia de Madera (registro SAAC, lugar y rama).
 *  - Los cursos «Nivel 1 / 2 / 3» pasan a llamarse «Etapa básica / intermedia / avanzada».
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`CREATE TABLE IF NOT EXISTS adult_experiences (
      id UUID PRIMARY KEY,
      adult_id UUID NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      kind VARCHAR(30) NOT NULL DEFAULT 'formacion',
      organism VARCHAR(60),
      branch VARCHAR(20),
      date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'acreditada',
      certificate_name VARCHAR(160),
      certificate_size INTEGER,
      certificate_data BYTEA,
      source VARCHAR(40),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )`);
    await q('CREATE INDEX IF NOT EXISTS adult_experiences_adult_id ON adult_experiences (adult_id)');
    await q(`CREATE TABLE IF NOT EXISTS adult_habilitations (
      id UUID PRIMARY KEY,
      adult_id UUID NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
      level VARCHAR(20) NOT NULL,
      branch VARCHAR(20),
      act_date DATE,
      book VARCHAR(20),
      folio VARCHAR(20),
      status VARCHAR(20) NOT NULL DEFAULT 'autorizada',
      source VARCHAR(40),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )`);
    await q('CREATE INDEX IF NOT EXISTS adult_habilitations_adult_id ON adult_habilitations (adult_id)');
    await q('ALTER TABLE adult_courses ADD COLUMN IF NOT EXISTS registry_number VARCHAR(30)');
    await q('ALTER TABLE adult_courses ADD COLUMN IF NOT EXISTS place VARCHAR(80)');
    await q('ALTER TABLE adult_courses ADD COLUMN IF NOT EXISTS branch VARCHAR(20)');
    for (const [from, to] of [
      ['Nivel 1', 'Etapa básica'],
      ['Nivel 2', 'Etapa intermedia'],
      ['Nivel 3', 'Etapa avanzada'],
    ]) {
      await q(`UPDATE courses SET name = '${to}' WHERE name = '${from}' AND NOT EXISTS (SELECT 1 FROM courses c2 WHERE c2.name = '${to}')`);
    }
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    for (const [from, to] of [
      ['Etapa básica', 'Nivel 1'],
      ['Etapa intermedia', 'Nivel 2'],
      ['Etapa avanzada', 'Nivel 3'],
    ]) {
      await q(`UPDATE courses SET name = '${to}' WHERE name = '${from}'`);
    }
    await q('ALTER TABLE adult_courses DROP COLUMN IF EXISTS branch');
    await q('ALTER TABLE adult_courses DROP COLUMN IF EXISTS place');
    await q('ALTER TABLE adult_courses DROP COLUMN IF EXISTS registry_number');
    await q('DROP TABLE IF EXISTS adult_habilitations');
    await q('DROP TABLE IF EXISTS adult_experiences');
  },
};

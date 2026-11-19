'use strict';

/**
 * «Sobre el Grupo» como espacio compartido: cualquiera que entra a la app puede dejar un aporte de texto en una sección
 * (un dato, una anécdota, una corrección). Lo borra quien lo escribió o quien administra el Grupo. Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`CREATE TABLE IF NOT EXISTS group_page_notes (
      id UUID PRIMARY KEY,
      page_id UUID NOT NULL REFERENCES group_pages(id) ON UPDATE CASCADE ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
      author_name VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    await q('CREATE INDEX IF NOT EXISTS group_page_notes_page ON group_page_notes (page_id, created_at)');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS group_page_notes');
  },
};

'use strict';

/**
 * «Sobre el Grupo»: páginas de texto (historia, jefes y jefas, la tribu…) que lee cualquiera que entra a la app
 * y edita quien administra el Grupo. Solo texto, sin imágenes. Nace con tres secciones vacías para completar.
 * Idempotente.
 */
const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    await s.query(`CREATE TABLE IF NOT EXISTS group_pages (
      id UUID PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      body TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
    const [[{ n }]] = await s.query('SELECT COUNT(*)::int AS n FROM group_pages');
    if (n === 0) {
      const titles = ['Historia del Grupo', 'Jefes y jefas de Grupo', 'La tribu'];
      for (let i = 0; i < titles.length; i++) {
        await s.query('INSERT INTO group_pages (id, title, body, sort_order, created_at, updated_at) VALUES (:id, :title, NULL, :order, now(), now())', {
          replacements: { id: randomUUID(), title: titles[i], order: i + 1 },
        });
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS group_pages');
  },
};

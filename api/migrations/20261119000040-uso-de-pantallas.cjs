'use strict';

/**
 * Uso de la app: qué pantalla abre cada usuario y cuándo (sin lo que hace adentro). Sirve para saber qué se usa de
 * verdad antes de decidir qué mejorar. Las rutas se guardan sin identificadores (/protagonistas/:id). Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      path VARCHAR(160) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await q('CREATE INDEX IF NOT EXISTS page_views_created_at ON page_views (created_at)');
    await q('CREATE INDEX IF NOT EXISTS page_views_user_path ON page_views (user_id, path, created_at)');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS page_views');
  },
};

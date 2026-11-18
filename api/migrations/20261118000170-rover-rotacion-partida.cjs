'use strict';

/**
 * Rovers: «en rotación» (su último tiempo en la rama) y la partida, que los pasa a adultos del Grupo.
 *  - members.in_rotation / rotation_since: el rover sigue siendo rover, pero se lo distingue.
 *  - members.departed_at: fecha de la partida (el estado pasa a 'partida').
 *  - members.adult_id: el adulto que pasó a ser; su ficha de protagonista queda como historial.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS in_rotation BOOLEAN NOT NULL DEFAULT false');
      await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS rotation_since DATE');
      await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS departed_at DATE');
      await q('ALTER TABLE members ADD COLUMN IF NOT EXISTS adult_id UUID REFERENCES adults(id) ON UPDATE CASCADE ON DELETE SET NULL');
      await q('CREATE INDEX IF NOT EXISTS members_adult_id ON members (adult_id)');
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const q = (sql) => queryInterface.sequelize.query(sql, { transaction });
      await q("UPDATE members SET status = 'baja' WHERE status = 'partida'");
      await q('ALTER TABLE members DROP COLUMN IF EXISTS adult_id');
      await q('ALTER TABLE members DROP COLUMN IF EXISTS departed_at');
      await q('ALTER TABLE members DROP COLUMN IF EXISTS rotation_since');
      await q('ALTER TABLE members DROP COLUMN IF EXISTS in_rotation');
    });
  },
};

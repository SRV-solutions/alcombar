'use strict';

/** Motivo del pase de unidad: por edad (cambio de rama), por elección (misma rama) u otro. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('unit_transfers', 'reason', { type: Sequelize.STRING(20), allowNull: true });
    // Los pases anteriores: si cambió la rama, fue por edad; si no, por elección
    await queryInterface.sequelize.query(`
      UPDATE unit_transfers t SET reason = CASE WHEN f.branch IS DISTINCT FROM d.branch THEN 'edad' ELSE 'eleccion' END
      FROM units f, units d WHERE f.id = t.from_unit_id AND d.id = t.to_unit_id AND t.reason IS NULL`);
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('unit_transfers', 'reason');
  },
};

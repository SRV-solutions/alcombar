'use strict';

/**
 * camps.permit_signature: la firma en pantalla del Jefe/a de Campo sobre el Permiso de Acampe (trazo, quién, cuándo
 * y el código de lo que firmó; si los datos cambian después, hay que volver a firmar).
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE camps ADD COLUMN IF NOT EXISTS permit_signature JSONB');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE camps DROP COLUMN IF EXISTS permit_signature');
  },
};

'use strict';

/**
 * Experiencias de formación: el certificado deja de guardarse como archivo en la base y pasa a ser un enlace al Drive
 * (certificate_url), igual que en los cursos. Los PDF que se habían adjuntado se vacían; las columnas
 * certificate_name / certificate_size / certificate_data quedan sin uso. Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE adult_experiences ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500)');
    await queryInterface.sequelize.query(
      'UPDATE adult_experiences SET certificate_name = NULL, certificate_size = NULL, certificate_data = NULL WHERE certificate_data IS NOT NULL OR certificate_name IS NOT NULL',
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE adult_experiences DROP COLUMN IF EXISTS certificate_url');
  },
};

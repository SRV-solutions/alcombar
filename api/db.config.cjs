// Configuración de sequelize-cli (migraciones). La app usa src/db.ts.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const ssl = process.env.DATABASE_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {};

module.exports = {
  development: { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false },
  test: { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false },
  production: { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false, dialectOptions: ssl },
};

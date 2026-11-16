import { config } from './config';
import { sequelize } from './db';
import { installAuditHooks } from './lib/audit';
import { createApp } from './app';

async function main() {
  await sequelize.authenticate();
  installAuditHooks();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`✓ API de ALCOMBAR Gestión en http://localhost:${config.port}/api/v1`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar la API:', err.message ?? err);
  process.exit(1);
});

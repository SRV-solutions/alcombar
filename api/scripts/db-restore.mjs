// Restaura una copia hecha con db-backup.mjs en una base (REEMPLAZA lo que haya: borra y recrea las tablas).
//   node scripts/db-restore.mjs <archivo.dump> "postgresql://…"
// Pide confirmación escribiendo el nombre del host de destino, para no pisar una base por error.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const [file, url] = process.argv.slice(2);
if (!file || !url) {
  console.log('Uso: node scripts/db-restore.mjs <archivo.dump> "postgresql://usuario:clave@host:puerto/base"');
  process.exit(1);
}
if (!existsSync(file)) throw new Error(`No existe ${file}`);

function pgBin(name) {
  const base = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const v = readdirSync(base).filter((d) => existsSync(join(base, d, 'bin', `${name}.exe`))).sort((a, b) => Number(b) - Number(a))[0];
    if (v) return join(base, v, 'bin', `${name}.exe`);
  }
  return name;
}

const host = new URL(url).hostname;
if (process.env.ALCOMBAR_RESTORE_CONFIRM !== host) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Esto REEMPLAZA todos los datos de ${host}. Escribí el host para confirmar: `);
  rl.close();
  if (answer.trim() !== host) {
    console.log('Cancelado.');
    process.exit(1);
  }
}

const r = spawnSync(pgBin('pg_restore'), ['--clean', '--if-exists', '--no-owner', '--no-acl', '--exit-on-error', `--dbname=${url}`, file], {
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✓ Restaurado en ${host}`);

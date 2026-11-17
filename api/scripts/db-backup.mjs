// Copia completa de una base ALCOMBAR (estructura + datos) en formato custom de pg_dump.
//   node scripts/db-backup.mjs                      → copia la base local (DATABASE_URL de api/.env)
//   node scripts/db-backup.mjs "postgresql://…"     → copia otra base (por ejemplo, producción)
// No copia los datos de sesiones ni de enlaces de contraseña (se regeneran solos).
// El archivo queda en api/.data/backups/ (ignorado por git: tiene datos personales de menores).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_DIR = resolve(import.meta.dirname, '..');
const envUrl = () => readFileSync(join(API_DIR, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
const url = process.argv[2] || process.env.DATABASE_URL || envUrl();
if (!url) throw new Error('Falta la URL de la base');

function pgBin(name) {
  const base = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const v = readdirSync(base).filter((d) => existsSync(join(base, d, 'bin', `${name}.exe`))).sort((a, b) => Number(b) - Number(a))[0];
    if (v) return join(base, v, 'bin', `${name}.exe`);
  }
  return name;
}

const dir = join(API_DIR, '.data', 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
const host = new URL(url).hostname.split('.')[0];
const file = join(dir, `alcombar-${host}-${stamp}.dump`);

const r = spawnSync(
  pgBin('pg_dump'),
  ['--format=custom', '--no-owner', '--no-acl', '--exclude-table-data=sessions', '--exclude-table-data=password_tokens', `--file=${file}`, url],
  { stdio: 'inherit' },
);
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✓ Copia creada: ${file} (${Math.round(statSync(file).size / 1024)} KB)`);

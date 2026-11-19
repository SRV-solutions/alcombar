import { createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

/** Contraseña provisoria fácil de dictar: tres bloques de 4, sin letras ni números que se confundan (0/O, 1/I/L). */
export function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `${block()}-${block()}-${block()}`;
}
/** Código numérico de 6 cifras (para confirmar un mail). */
export const numericCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// Hash de referencia para comparar cuando el usuario no existe, así el tiempo de respuesta no lo delata.
export const DUMMY_HASH = bcrypt.hashSync(randomToken(), 12);

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// Hash de referencia para comparar cuando el usuario no existe, así el tiempo de respuesta no lo delata.
export const DUMMY_HASH = bcrypt.hashSync(randomToken(), 12);

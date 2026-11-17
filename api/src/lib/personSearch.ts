/**
 * Búsqueda de personas por nombre, apellido, tótem o DNI:
 * - por palabras, en cualquier orden ("juan perez" o "perez juan"); cada palabra tiene que aparecer en algún campo;
 * - sin importar mayúsculas ni tildes ("Ramírez" = "ramirez");
 * - el DNI con o sin puntos ("45.123.456" = "45123456"), también parcial.
 */
import { Op, col, fn, where as sqlWhere, type WhereOptions } from 'sequelize';

const FROM = 'áéíóúüñàèìòùâêîôûäëïöç';
const TO = 'aeiouunaeiouaeiouaeioc';
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const escapeLike = (s: string) => s.replace(/[\%_]/g, (c) => `\${c}`);

/** columns: columnas reales ("Member.first_name"); dniColumn: la del DNI. Devuelve null si no hay nada para buscar. */
export function personSearchWhere(q: string, columns: string[], dniColumn?: string): WhereOptions | null {
  const words = fold(q)
    .replace(/[,;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (!words.length) return null;
  return {
    [Op.and]: words.map((w) => {
      const ors: WhereOptions[] = columns.map((c) => sqlWhere(fn('translate', fn('lower', col(c)), FROM, TO), { [Op.like]: `%${escapeLike(w)}%` }));
      const digits = w.replace(/\D/g, '');
      // Una palabra que es un número (con o sin puntos) se busca en el DNI
      if (dniColumn && digits.length >= 3 && /^[\d.\-\s]+$/.test(w)) {
        ors.push(sqlWhere(fn('regexp_replace', col(dniColumn), '[^0-9]', '', 'g'), { [Op.like]: `%${digits}%` }));
      }
      return { [Op.or]: ors };
    }),
  };
}

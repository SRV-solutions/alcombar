/** Convierte 'dd/mm/aaaa', 'd/m/aa', 'aaaa-mm-dd' o 'dd-mm-aaaa' a 'aaaa-mm-dd'. Devuelve null si está vacío; lanza si es inválida. */
export function parseFlexibleDate(input: string | null | undefined): string | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (match) {
    y = +match[1];
    m = +match[2];
    d = +match[3];
  } else {
    match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!match) throw new Error(`Fecha inválida: "${s}" (usar dd/mm/aaaa)`);
    d = +match[1];
    m = +match[2];
    y = +match[3];
    if (match[3].length === 2) y += y > 50 ? 1900 : 2000;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new Error(`Fecha inválida: "${s}"`);
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 'aaaa-mm-dd' → 'dd/mm/aaaa' */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!d) return iso;
  return `${d}/${m}/${y}`;
}

/** Edad en años cumplidos a una fecha de referencia (hoy por defecto). */
export function ageAt(birthIso: string | null | undefined, refIso?: string): number | null {
  if (!birthIso) return null;
  const [by, bm, bd] = birthIso.slice(0, 10).split('-').map(Number);
  const ref = refIso ? new Date(refIso + 'T00:00:00') : new Date();
  let age = ref.getFullYear() - by;
  const beforeBirthday = ref.getMonth() + 1 < bm || (ref.getMonth() + 1 === bm && ref.getDate() < bd);
  if (beforeBirthday) age -= 1;
  return age;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

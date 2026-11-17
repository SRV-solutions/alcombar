/** Búsqueda de personas en listas ya cargadas: por palabras en cualquier orden, sin tildes, y DNI con o sin puntos. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function matchesPerson(needle: string, fields: (string | null | undefined)[], dni?: string | null): boolean {
  const words = fold(needle).replace(/[,;]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = fold(fields.filter(Boolean).join(' '));
  const dniDigits = (dni ?? '').replace(/\D/g, '');
  return words.every((w) => {
    if (text.includes(w)) return true;
    const digits = w.replace(/\D/g, '');
    return /^[\d.\-]+$/.test(w) && digits.length >= 3 && dniDigits.includes(digits);
  });
}

import type { SheetSummary } from './types';

/** Minúsculas y sin acentos, para comparar como escribe la gente ("brujula" encuentra "brújula"). */
export const foldText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** El texto plegado y, por cada letra, en qué posición del original estaba (para recortar el fragmento con sus acentos). */
function foldWithMap(text: string) {
  let out = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const c of foldText(text[i])) {
      out += c;
      map.push(i);
    }
  }
  return { out, map };
}

/** Las partes de la ficha donde se busca además del código, el nombre y el lugar, con el nombre que se le muestra a la persona. */
const PARTS: { label: string; get: (s: SheetSummary) => string }[] = [
  { label: 'Objetivos', get: (s) => (s.objectives ?? []).join(' · ') },
  { label: 'Competencias', get: (s) => (s.competencies ?? []).map((c) => c.name).join(' · ') },
  { label: 'Marco de exploración', get: (s) => s.exploration ?? '' },
  { label: 'Descripción', get: (s) => s.description ?? '' },
  { label: 'Recupero', get: (s) => s.closing ?? '' },
  { label: 'Materiales', get: (s) => (s.materials ?? []).join(' · ') },
  { label: 'Riesgos y medidas', get: (s) => s.safety ?? '' },
  { label: 'Demás educadores', get: (s) => s.otherEducators ?? '' },
  { label: 'Área', get: (s) => s.area?.name ?? '' },
];

export interface SheetHit {
  label: string;
  before: string;
  hit: string;
  after: string;
}

/**
 * ¿La ficha tiene todas las palabras buscadas? Busca en el código, el nombre, el lugar y en todo su contenido.
 * Devuelve null si no coincide. Si coincide por algo que no se ve en el listado, `where` dice en qué parte y muestra el fragmento.
 */
export function searchSheet(s: SheetSummary, term: string): { where: SheetHit | null } | null {
  const words = foldText(term).split(/\s+/).filter(Boolean);
  if (!words.length) return { where: null };
  const head = foldText(`${s.code} ${s.name} ${s.place ?? ''}`);
  const parts = PARTS.map((p) => ({ label: p.label, text: p.get(s).replace(/\s/g, ' ') })).filter((p) => p.text.trim());
  const all = `${head} ${foldText(parts.map((p) => p.text).join(' '))}`;
  if (!words.every((w) => all.includes(w))) return null;
  const inside = words.find((w) => !head.includes(w));
  if (!inside) return { where: null };
  // Si escribió varias palabras y están juntas en el texto, se marca la frase entera; si no, la palabra
  const folded = parts.map((p) => ({ label: p.label, text: p.text, ...foldWithMap(p.text) }));
  for (const needle of words.length > 1 ? [words.join(' '), inside] : [inside]) {
    for (const p of folded) {
      const i = p.out.indexOf(needle);
      if (i < 0) continue;
      const a = p.map[i];
      const b = p.map[i + needle.length - 1] + 1;
      const from = Math.max(0, a - 40);
      const to = Math.min(p.text.length, b + 70);
      return {
        where: {
          label: p.label,
          before: (from > 0 ? '…' : '') + p.text.slice(from, a),
          hit: p.text.slice(a, b),
          after: p.text.slice(b, to) + (to < p.text.length ? '…' : ''),
        },
      };
    }
  }
  return { where: null };
}

/** El renglón que dice en qué parte de la ficha está lo que se buscó. */
export function SheetHitLine({ hit }: { hit: SheetHit }) {
  return (
    <div className="sheet-hit">
      <span className="sheet-hit-label">{hit.label}:</span> {hit.before}
      <mark>{hit.hit}</mark>
      {hit.after}
    </div>
  );
}

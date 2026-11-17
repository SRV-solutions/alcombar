/**
 * Importa fichas de actividad a una unidad desde un JSON armado a partir de los Word con la plantilla
 * "FICHA DE ACTIVIDADES" (nombre, edad, área, objetivos, propósito/competencias, marco, descripción, iluminación,
 * recupero, función de los demás educadores, materiales, responsable, fecha, lugar, duración).
 *
 *   npm run fichas:importar -- fichas.json USLC              → muestra qué haría (no guarda nada)
 *   npm run fichas:importar -- fichas.json USLC --aplicar    → crea las fichas
 *
 * No modifica nada existente: saltea las fichas que ya están (misma unidad, mismo nombre y misma fecha).
 * Vincula al responsable con los adultos (por tótem o nombre) y las competencias del propósito con el catálogo
 * de la rama; lo que no pueda vincular queda escrito en la ficha.
 */
import { readFileSync } from 'node:fs';
import { Op } from 'sequelize';
import { normalizeName, todayIso } from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, Unit } from '../models';
import { ActivityCompetency, ActivitySheet, BranchArea, Competency } from '../models/program';

interface RawFicha {
  file: string;
  name: string;
  ages: string;
  area: string;
  participants: string;
  objectives: string[];
  competencies: string[];
  exploration: string;
  description: string;
  iluminacion: string;
  recupero: string;
  otherEducators: string;
  materials: string[];
  responsible: string;
  date: string;
  place: string;
  duration: string;
  safety: string;
  extra: string[];
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
const notApplicable = (s: string) => !s || /^no aplica\.?$/i.test(s.trim());
const bullet = (s: string) => s.replace(/^[\s•\-–*·]+/, '').trim();

function parseDate(s: string): string | null {
  const m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return Number.isNaN(new Date(`${iso}T12:00:00Z`).getTime()) ? null : iso;
}

function parseDuration(s: string): number | null {
  const t = normalizeName(s);
  const h = t.match(/(\d+)\s*h(ora)?s?\b(?:\s*(\d+)\s*min)?/);
  if (h) return Number(h[1]) * 60 + (h[3] ? Number(h[3]) : 0);
  const m = t.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseAges(s: string): [number | null, number | null] {
  const m = s.match(/(\d{1,2})\s*[-a]\s*(\d{1,2})/);
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

// Palabras significativas, sin terminaciones ("comunicarme" ≈ "comunicación", "aplico" ≈ "aplicar")
const stem = (w: string) => w.replace(/(mente|ciones|cion|idades|idad|ando|iendo|arme|irme|erme|ar|er|ir|es|s|o|a|e)$/, '');
const words = (s: string) => new Set(normalizeName(s).split(' ').filter((w) => w.length > 3).map(stem));
function similarity(a: string, b: string) {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / Math.min(A.size, B.size);
}

async function main() {
  const [file, unitCode] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const apply = process.argv.includes('--aplicar');
  if (!file || !unitCode) throw new Error('Uso: npm run fichas:importar -- fichas.json CODIGO_UNIDAD [--aplicar]');
  const fichas = JSON.parse(readFileSync(file, 'utf8')) as RawFicha[];
  const unit = await Unit.findOne({ where: { code: unitCode } });
  if (!unit) throw new Error(`No existe la unidad ${unitCode}`);

  const [areas, comps, adults, unitAssignments] = await Promise.all([
    BranchArea.findAll({ where: { branch: unit.branch } }),
    Competency.findAll({ where: { branch: unit.branch, active: true } }),
    Adult.findAll({ where: { status: { [Op.ne]: 'baja' } }, attributes: ['id', 'firstName', 'lastName', 'totem'] }),
    AdultAssignment.findAll({ where: { unitId: unit.id }, attributes: ['adultId'] }),
  ]);
  const unitAdultIds = new Set(unitAssignments.map((a) => a.adultId));

  /** "Zorro Sagaz", "Aldi", "Nicolás Burza"… → adulto (primero los de la unidad). */
  const findAdult = (token: string) => {
    const t = normalizeName(token);
    if (!t) return null;
    const first = t.split(' ')[0];
    const scored = adults
      .map((a) => {
        const totem = normalizeName(a.totem);
        const fn = normalizeName(a.firstName);
        const full = normalizeName(`${a.firstName} ${a.lastName}`);
        let s = 0;
        if (totem && (totem === t || totem.startsWith(`${t} `) || totem.split(' ')[0] === t)) s = 5;
        else if (totem && totem.startsWith(first) && t.split(' ').length > 1 && totem.includes(t.split(' ')[1])) s = 5;
        else if (full === t || full.startsWith(t)) s = 4;
        else if (fn.split(' ')[0] === first && t.split(' ').length === 1) s = 3;
        else if (first.length >= 3 && fn.startsWith(first.slice(0, Math.min(first.length, 4)))) s = 1;
        return { a, s: s ? s + (unitAdultIds.has(a.id) ? 0.5 : 0) : 0 };
      })
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s);
    if (scored.length && scored[0].s >= 3) {
      // Si hay empate en el mejor puntaje, no se adivina
      if (scored.length > 1 && scored[0].s === scored[1].s) return null;
      return scored[0].a;
    }
    // Apodos de los adultos de la unidad ("Aldi" → Aldana, "Ferre" → Ferreiro): prefijo común, solo si es único
    if (t.split(' ').length === 1) {
      const common = (x: string, y: string) => {
        let i = 0;
        while (i < x.length && i < y.length && x[i] === y[i]) i++;
        return i;
      };
      const nick = adults.filter((a) => {
        if (!unitAdultIds.has(a.id)) return false;
        const fn = normalizeName(a.firstName).split(' ')[0];
        const ln = normalizeName(a.lastName).split(' ')[0];
        return common(first, fn) >= 3 || (first.length >= 4 && ln.startsWith(first));
      });
      if (nick.length === 1) return nick[0];
    }
    if (!scored.length || (scored.length > 1 && scored[0].s === scored[1].s)) return null;
    return scored[0].a;
  };

  const today = todayIso();
  const prefixYear = (date: string | null) => (date ?? today).slice(0, 4);
  const nextNumber = new Map<string, number>();
  const codeFor = async (date: string | null) => {
    const prefix = `${unit.code}-${prefixYear(date)}-`;
    if (!nextNumber.has(prefix)) {
      const rows = await ActivitySheet.findAll({ where: { code: { [Op.like]: `${prefix}%` } }, attributes: ['code'], paranoid: false });
      nextNumber.set(prefix, rows.reduce((m, r) => Math.max(m, Number(r.code.slice(prefix.length)) || 0), 0));
    }
    const n = nextNumber.get(prefix)! + 1;
    nextNumber.set(prefix, n);
    return `${prefix}${String(n).padStart(3, '0')}`;
  };

  let created = 0;
  let skipped = 0;
  for (const f of fichas) {
    const name = clean(f.name) || f.file.split('/').pop()!.replace(/\.docx$/i, '');
    const date = parseDate(f.date);
    const exists = await ActivitySheet.findOne({ where: { unitId: unit.id, name, date }, paranoid: false });
    if (exists) {
      skipped++;
      console.log(`= ya existe: ${exists.code} ${name}`);
      continue;
    }
    const [ageMin, ageMax] = parseAges(f.ages);
    const area = areas.find((a) => normalizeName(a.name) === normalizeName(f.area) || normalizeName(f.area).startsWith(normalizeName(a.name)));

    // Responsables: el primero que se reconozca queda como responsable; el resto, en "otros educadores"
    const tokens = f.responsible.split(/\s+y\s+|,|\//i).map((s) => s.trim()).filter(Boolean);
    const matched = tokens.map((t) => ({ t, a: findAdult(t) }));
    const responsible = matched.find((m) => m.a)?.a ?? null;
    const others = matched.filter((m) => m.a !== responsible).map((m) => (m.a ? `${m.a.firstName} ${m.a.lastName}` : m.t));

    // Competencias del propósito → catálogo de la rama
    const compIds: string[] = [];
    const unmatched: string[] = [];
    for (const raw of f.competencies.map(bullet).filter(Boolean)) {
      // Solo se vincula si se parece bastante, con ventaja clara sobre la segunda y con al menos 3 palabras
      const ranked = comps.map((c) => ({ c, s: similarity(raw, c.name) })).sort((a, b) => b.s - a.s);
      const [best, second] = ranked;
      if (best && best.s >= 0.6 && best.s - (second?.s ?? 0) >= 0.15 && words(raw).size >= 3) {
        if (!compIds.includes(best.c.id)) compIds.push(best.c.id);
      } else unmatched.push(raw);
    }

    const ilu = notApplicable(f.iluminacion) ? '' : clean(f.iluminacion);
    const rec = notApplicable(f.recupero) ? '' : clean(f.recupero);
    let closing = [ilu && `Iluminación:\n${ilu}`, rec && `Recupero:\n${rec}`].filter(Boolean).join('\n\n');
    let description = clean(f.description);
    if (closing.length > 6000) {
      // El cierre tiene un máximo: si no entra, el recupero va al final de la descripción
      description += `\n\nRecupero:\n${rec}`;
      closing = ilu ? `Iluminación:\n${ilu}` : '';
    }
    if (f.extra.length) description += `\n\nAnexo:\n${f.extra.map(clean).filter(Boolean).join('\n')}`;
    if (unmatched.length) description += `\n\nCompetencias que figuran en la ficha original:\n${unmatched.map((c) => `- ${c}`).join('\n')}`;
    if (!area && clean(f.area)) description += `\nÁrea indicada en la ficha original: ${clean(f.area)}`;

    const place = clean(f.place) || null;
    const outside = !!place && !/(sede|grupo scout 155|divina providencia|plaza del grupo)/i.test(normalizeName(place));
    const participants = /^\d+$/.test(clean(f.participants)) ? Number(clean(f.participants)) : null;
    const scope = /por patrulla/i.test(`${name} ${f.description}`) ? 'pequeno_grupo' : 'unidad';
    const values = {
      unitId: unit.id,
      code: await codeFor(date),
      name: name.slice(0, 160),
      ageMin,
      ageMax,
      areaId: area?.id ?? null,
      participants,
      objectives: f.objectives.map(bullet).filter(Boolean).map((s) => s.slice(0, 500)).slice(0, 40),
      exploration: clean(f.exploration).slice(0, 4000) || null,
      description: description.slice(0, 20000) || null,
      closing: closing || null,
      otherEducators:
        [clean(f.otherEducators), others.length ? `${responsible ? 'También responsables' : 'Responsables (según la ficha)'}: ${others.join(', ')}` : '']
          .filter(Boolean)
          .join('\n\n') || null,
      materials: f.materials.map(bullet).filter(Boolean).map((s) => s.slice(0, 500)).slice(0, 60),
      responsibleAdultId: responsible?.id ?? null,
      date,
      place: place?.slice(0, 200) ?? null,
      durationMin: parseDuration(f.duration),
      opportunityType: 'variable',
      scope,
      outside,
      safety: clean(f.safety) || null,
      nights: null,
      status: date && date <= today ? 'realizada' : 'aprobada',
    };
    console.log(
      `+ ${values.code} ${name} | ${date ?? 'sin fecha'} | ${area?.name ?? '(área: ' + (f.area || '—') + ')'} | resp: ${
        responsible ? `${responsible.firstName} ${responsible.lastName}` : `(${f.responsible || '—'})`
      } | comp ${compIds.length}/${compIds.length + unmatched.length} | ${values.durationMin ?? '?'} min${outside ? ' | fuera de la sede' : ''}`,
    );
    if (!apply) continue;
    await sequelize.transaction(async (transaction) => {
      const sheet = await ActivitySheet.create(values as never, { transaction });
      for (const competencyId of compIds) await ActivityCompetency.create({ activitySheetId: sheet.id, competencyId }, { transaction });
    });
    created++;
  }
  console.log(apply ? `\n✓ Creadas: ${created}. Ya existían: ${skipped}.` : `\nVista previa: ${fichas.length - skipped} para crear, ${skipped} ya existen. Agregá --aplicar para guardarlas.`);
  await sequelize.close();
}

main().catch(async (e) => {
  console.error('✗', (e as Error).message);
  await sequelize.close();
  process.exit(1);
});

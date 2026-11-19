/**
 * Carga la formación de los adultos desde la planilla del Grupo (copiada con encabezados, separada por tabs):
 *   Apellido y nombre | … | APF asignado | IM Programa de Jóvenes | IM Gestión | Miembro Activo |
 *   Nivel 1 (de 2) | Nivel 2 (de 9) | Nivel 3 (de 5) | …
 *
 *   npm run adultos:formacion -- planilla.tsv            → muestra qué haría, sin guardar
 *   npm run adultos:formacion -- planilla.tsv --aplicar  → guarda
 *
 * Por cada adulto de la planilla reemplaza la formación que vino de importaciones (Mi Rincón o esta planilla)
 * por la de la planilla, y le asigna su APF. Lo que se cargó a mano desde la app no se toca.
 */
import { readFileSync } from 'node:fs';
import { Op, type Transaction } from 'sequelize';
import { normalizeName } from '../shared';
import { sequelize } from '../db';
import { Adult, AdultCourse, AuditLog, Course } from '../models';

const FROM_SHEET = 'Según la planilla de formación';
const IMPORTED_NOTES = [FROM_SHEET, 'Según Mi Rincón'];
const COURSES = [
  { col: 'im programa de jovenes', name: 'Insignia de Madera de Programa', kind: 'insignia_madera', modules: null },
  { col: 'im gestion', name: 'Insignia de Madera de Gestión', kind: 'insignia_madera', modules: null },
  { col: 'miembro activo', name: 'Miembro Activo', kind: 'miembro_activo', modules: null },
  { col: 'nivel 1 (de 2)', name: 'Etapa básica', kind: 'curso', modules: 2 },
  { col: 'nivel 2 (de 9)', name: 'Etapa intermedia', kind: 'curso', modules: 9 },
  { col: 'nivel 3 (de 5)', name: 'Etapa avanzada', kind: 'curso', modules: 5 },
] as const;

const yes = (v: string | undefined) => /^s[ií]$/i.test((v ?? '').trim());

function matchAdult(adults: Adult[], last: string, first: string): Adult[] {
  const nl = normalizeName(last);
  const nf = normalizeName(first);
  const f1 = nf.split(' ')[0];
  let c = adults.filter((a) => normalizeName(a.lastName) === nl && (normalizeName(a.firstName) === nf || normalizeName(a.firstName).split(' ')[0] === f1));
  if (!c.length) c = adults.filter((a) => normalizeName(a.lastName).includes(nl.split(' ')[0]) && normalizeName(a.firstName).split(' ')[0] === f1);
  return c;
}

/** "Mariela Rodríguez" (Nombre Apellido) → adulto. */
function matchByFullName(adults: Adult[], full: string): Adult[] {
  const n = normalizeName(full);
  if (!n) return [];
  const words = n.split(' ');
  return adults.filter((a) => {
    const fn = normalizeName(a.firstName).split(' ')[0];
    const ln = normalizeName(a.lastName);
    return words[0] === fn && words.slice(1).some((w) => ln.split(' ').includes(w));
  });
}

class DryRun extends Error {}

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes('--aplicar');
  if (!file) throw new Error('Uso: npm run adultos:formacion -- planilla.tsv [--aplicar]');
  const lines = readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split('\t').map((h) => normalizeName(h.replace(/[¿?]/g, '')));
  const col = (name: string) => header.findIndex((h) => h === normalizeName(name));
  const iName = col('apellido y nombre');
  const iApf = col('apf asignado');
  if (iName < 0) throw new Error('Falta la columna "Apellido y nombre"');
  const report: string[] = [];
  const stats = { adultos: 0, registros: 0, quitados: 0, apf: 0, noEncontrados: 0 };

  await sequelize
    .transaction(async (transaction: Transaction) => {
      const t = { transaction };
      const adults = await Adult.findAll(t);
      const courses = new Map<string, Course>();
      for (const c of COURSES) {
        const [course] = await Course.findOrCreate({ where: { name: c.name }, defaults: { name: c.name, kind: c.kind, totalModules: c.modules }, ...t });
        if (c.modules && course.totalModules !== c.modules) await course.update({ totalModules: c.modules }, t);
        courses.set(c.name, course);
      }
      const generic = await Course.findOne({ where: { name: 'Insignia de Madera' }, ...t }); // genérica de Mi Rincón

      for (const line of lines.slice(1)) {
        const c = line.split('\t');
        const [last, first] = (c[iName] ?? '').split(',').map((x) => x.trim());
        if (!last) continue;
        const found = matchAdult(adults, last, first ?? '');
        if (found.length !== 1) {
          report.push(`✗ ${last}, ${first}: ${found.length ? 'coincide con varias personas' : 'no está en la base'}`);
          stats.noEncontrados++;
          continue;
        }
        const adult = found[0];
        stats.adultos++;

        // Se reemplaza lo que vino de importaciones; lo cargado a mano queda
        const imported = await AdultCourse.findAll({ where: { adultId: adult.id, notes: { [Op.in]: IMPORTED_NOTES } }, ...t });
        const wanted: { course: Course; modules: number | null }[] = [];
        const parts: string[] = [];
        for (const def of COURSES) {
          const i = col(def.col);
          if (i < 0) continue;
          const v = (c[i] ?? '').trim();
          if (def.modules) {
            const n = Number(v) || 0;
            if (n > 0) {
              wanted.push({ course: courses.get(def.name)!, modules: Math.min(n, def.modules) });
              parts.push(`${def.name} ${n}/${def.modules}`);
            }
          } else if (yes(v)) {
            wanted.push({ course: courses.get(def.name)!, modules: null });
            parts.push(def.name.replace('Insignia de Madera', 'IM'));
          }
        }
        for (const ac of imported) {
          const keep = wanted.find((w) => w.course.id === ac.courseId);
          if (keep) {
            if ((ac.modulesDone ?? null) !== keep.modules) await ac.update({ modulesDone: keep.modules, notes: FROM_SHEET }, t);
            continue;
          }
          await ac.destroy(t);
          stats.quitados++;
        }
        for (const w of wanted) {
          if (imported.some((ac) => ac.courseId === w.course.id)) continue;
          const manual = await AdultCourse.findOne({ where: { adultId: adult.id, courseId: w.course.id }, ...t });
          if (manual) continue; // ya lo tenía cargado a mano
          await AdultCourse.create(
            { adultId: adult.id, courseId: w.course.id, completedAt: null, modulesDone: w.modules, certificateUrl: null, notes: FROM_SHEET },
            t,
          );
          stats.registros++;
        }
        if (generic) {
          // la "Insignia de Madera" genérica de Mi Rincón queda reemplazada por la de Programa / Gestión
          const g = await AdultCourse.findAll({ where: { adultId: adult.id, courseId: generic.id, notes: { [Op.in]: IMPORTED_NOTES } }, ...t });
          for (const x of g) {
            await x.destroy(t);
            stats.quitados++;
          }
        }

        // APF asignado
        let apfText = '';
        const apfName = iApf >= 0 ? (c[iApf] ?? '').trim() : '';
        if (apfName) {
          const apf = matchByFullName(adults, apfName);
          if (apf.length === 1 && apf[0].id !== adult.id) {
            if (adult.advisorAdultId !== apf[0].id) {
              await adult.update({ advisorAdultId: apf[0].id }, t);
              stats.apf++;
            }
            apfText = ` · APF: ${apf[0].firstName} ${apf[0].lastName}`;
          } else apfText = ` · ✗ APF "${apfName}" no encontrado`;
        }
        report.push(`✓ ${adult.lastName}, ${adult.firstName}: ${parts.join(', ') || 'sin formación'}${apfText}`);
      }

      if (!apply) throw new DryRun();
      await AuditLog.create(
        { userId: null, ip: null, action: 'import', entity: 'AdultCourse', entityId: null, summary: `Formación desde planilla: ${stats.adultos} adultos`, changes: stats },
        t,
      );
    })
    .catch((e) => {
      if (!(e instanceof DryRun)) throw e;
    });

  console.log(report.join('\n'));
  console.log(`\n${apply ? '✓ Guardado' : '· Modo prueba: no se guardó nada (agregá --aplicar)'}`);
  console.log(`  ${stats.adultos} adultos, ${stats.registros} registros nuevos, ${stats.quitados} reemplazados, ${stats.apf} APF asignados, ${stats.noEncontrados} no encontrados`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('✗', err.message ?? err);
  await sequelize.close();
  process.exit(1);
});

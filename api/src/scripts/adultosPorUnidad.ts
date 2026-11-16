/**
 * Corrige cargos y unidades de los adultos a partir de una lista (copiada de una planilla, separada por tabs):
 *   Apellido, Nombre | Tótem | Edad | Cargo | Unidad (código, Jefatura, Equipo de apoyo, Rovers, Castores) | Unidad (nombre) | (otra columna)
 *
 *   npm run adultos:unidades -- lista.tsv            → muestra qué haría, sin guardar
 *   npm run adultos:unidades -- lista.tsv --aplicar  → guarda los cambios
 *
 * Para cada adulto de la lista: carga el tótem, reemplaza sus cargos del año (salvo APF) por el de la lista con su unidad
 * y ajusta los roles de su usuario según el cargo. El rol Superadmin y los roles personalizados no se tocan.
 * Si un adulto de la lista no existe, se crea (sin DNI ni contacto).
 */
import { readFileSync } from 'node:fs';
import type { Transaction } from 'sequelize';
import { normalizeName } from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, AuditLog, Role, SupportTeam, Unit, User, UserRole } from '../models';

const YEAR = new Date().getFullYear();
const UNIT_ALIASES: Record<string, string> = { rovers: 'CRSLO', castores: 'CCA' };
const MANAGED_ROLES = ['jefe_unidad', 'educador', 'consulta', 'jefatura', 'programa'];
// Comité Ejecutivo y sus áreas (como en el organigrama del Drive). Las áreas sin responsable quedan "a confirmar".
const COMITE = 'Comité Ejecutivo';
const AREAS: { name: string; description: string }[] = [
  { name: COMITE, description: 'Conduce la gestión del Grupo. Lo encabeza el Director Ejecutivo.' },
  { name: 'Programa y Asesores Personales', description: 'Programa educativo y Asesores Personales de Formación.' },
  { name: 'Espiritualidad', description: 'A confirmar.' },
  { name: 'Secretaría', description: 'A confirmar.' },
  { name: 'Administración y Finanzas', description: 'A confirmar.' },
  { name: 'Infraestructura', description: 'A confirmar.' },
  { name: 'Sistemas', description: 'A confirmar.' },
  { name: 'Comunicaciones', description: 'A confirmar.' },
];
/** Área del equipo de apoyo según el cargo; el que no tiene área va al Comité. */
const areaFor = (cargo: string) => (/programa/i.test(cargo) ? 'Programa y Asesores Personales' : COMITE);
const leadsArea = (cargo: string) => /director/i.test(cargo) || /programa/i.test(cargo);

function roleFor(cargo: string): { key: string; unitScoped: boolean } {
  const c = normalizeName(cargo);
  if (/jef[ea] de grupo/.test(c)) return { key: 'jefatura', unitScoped: false };
  if (/jef[ea] de unidad/.test(c)) return { key: 'jefe_unidad', unitScoped: true }; // incluye Subjefe/a
  if (/ayudante/.test(c)) return { key: 'educador', unitScoped: true };
  if (/programa/.test(c)) return { key: 'programa', unitScoped: false };
  return { key: 'consulta', unitScoped: false };
}

interface Row {
  line: number;
  lastName: string;
  firstName: string;
  totem: string | null;
  age: number | null;
  cargo: string;
  where: string;
  extra: string;
}

function parse(file: string): Row[] {
  return readFileSync(file, 'utf8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.trim())
    .map(({ l, i }) => {
      const c = l.split('\t').map((x) => x.trim());
      const [last, first] = (c[0] ?? '').split(',').map((x) => x.trim());
      return {
        line: i + 1,
        lastName: last ?? '',
        firstName: first ?? '',
        totem: c[1] || null,
        age: c[2] && /^\d+$/.test(c[2]) ? Number(c[2]) : null,
        cargo: c[3] || 'Otro',
        where: c[4] || '',
        extra: c[6] || '',
      };
    });
}

const ageOf = (birth: string | null) => {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  const now = new Date();
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
};

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes('--aplicar');
  if (!file) throw new Error('Uso: npm run adultos:unidades -- lista.tsv [--aplicar]');
  const rows = parse(file);
  const report: string[] = [];
  const stats = { coinciden: 0, nuevos: 0, cargos: 0, rolesAgregados: 0, rolesQuitados: 0, totems: 0 };

  await sequelize.transaction(async (transaction: Transaction) => {
    const t = { transaction };
    const [adults, units, roles] = await Promise.all([Adult.findAll(t), Unit.findAll(t), Role.findAll(t)]);
    const roleByKey = (k: string) => roles.find((r) => r.key === k)!;
    const teams = new Map<string, SupportTeam>();
    for (const a of AREAS) {
      const [team] = await SupportTeam.findOrCreate({ where: { name: a.name }, defaults: { name: a.name, description: a.description, leaderAdultId: null }, ...t });
      teams.set(a.name, team);
    }

    for (const r of rows) {
      const nl = normalizeName(r.lastName);
      const nf = normalizeName(r.firstName);
      const first = nf.split(' ')[0];
      // 1) apellido igual y nombre igual o que empiece igual; 2) apellido que contenga y primer nombre igual
      let cands = adults.filter((a) => normalizeName(a.lastName) === nl && (normalizeName(a.firstName) === nf || normalizeName(a.firstName).split(' ')[0] === first));
      if (!cands.length) cands = adults.filter((a) => normalizeName(a.lastName).includes(nl.split(' ')[0]) && normalizeName(a.firstName).split(' ')[0] === first);
      if (cands.length > 1 && r.age !== null) cands = cands.filter((a) => ageOf(a.birthDate) === r.age);

      // Unidad / equipo
      const whereKey = normalizeName(r.where);
      let unit: Unit | null = null;
      let toTeam = false;
      if (whereKey === 'equipo de apoyo') toTeam = true;
      else if (whereKey !== 'jefatura') {
        const code = UNIT_ALIASES[whereKey] ?? r.where.toUpperCase();
        unit = units.find((u) => u.code === code) ?? null;
        if (!unit) {
          report.push(`✗ línea ${r.line} ${r.lastName}, ${r.firstName}: no existe la unidad "${r.where}"`);
          continue;
        }
      }

      let adult: Adult;
      if (cands.length === 1) {
        adult = cands[0];
        stats.coinciden++;
        const agePart = r.age !== null && ageOf(adult.birthDate) !== null && ageOf(adult.birthDate) !== r.age ? ` (edad en la base: ${ageOf(adult.birthDate)}, en la lista: ${r.age})` : '';
        report.push(`✓ ${r.lastName}, ${r.firstName} → ${adult.lastName}, ${adult.firstName}${agePart}: ${r.cargo} · ${unit?.code ?? (toTeam ? areaFor(r.cargo) : 'Grupo')}`);
      } else if (cands.length > 1) {
        report.push(`✗ línea ${r.line} ${r.lastName}, ${r.firstName}: coincide con varias personas, no se toca`);
        continue;
      } else {
        report.push(`+ ${r.lastName}, ${r.firstName}: no está en la base, se crea · ${r.cargo} · ${unit?.code ?? (toTeam ? areaFor(r.cargo) : 'Grupo')}`);
        stats.nuevos++;
        adult = await Adult.create(
          {
            firstName: r.firstName,
            lastName: r.lastName,
            totem: r.totem,
            dni: null,
            birthDate: null,
            email: null,
            phone: null,
            address: null,
            joinedAt: null,
            status: 'alta',
            advisorAdultId: null,
            notes: 'Cargado desde la lista de adultos por unidad (no figuraba en Mi Rincón).',
          },
          t,
        );
      }

      if (r.totem && adult.totem !== r.totem) {
        await adult.update({ totem: r.totem }, t);
        stats.totems++;
      }

      const team = toTeam ? teams.get(areaFor(r.cargo))! : null;
      if (team && leadsArea(r.cargo) && team.leaderAdultId !== adult.id) await team.update({ leaderAdultId: adult.id }, t);

      // Cargos del año: se reemplazan por el de la lista (se conserva APF, que es otra función)
      const current = await AdultAssignment.findAll({ where: { adultId: adult.id, year: YEAR }, ...t });
      const same = current.find((a) => a.position === r.cargo && a.unitId === (unit?.id ?? null) && a.supportTeamId === (team?.id ?? null));
      for (const a of current) {
        if (a === same || /asesor\/a personal de formaci/i.test(a.position)) continue;
        await a.destroy(t);
      }
      if (!same) {
        await AdultAssignment.create(
          { adultId: adult.id, year: YEAR, position: r.cargo, unitId: unit?.id ?? null, supportTeamId: team?.id ?? null, branch: null, notes: null },
          t,
        );
        stats.cargos++;
      }

      // Roles del usuario
      const user = await User.findOne({ where: { adultId: adult.id }, ...t });
      if (user) {
        const want = roleFor(r.cargo);
        const wantRole = roleByKey(want.key);
        const wantUnit = want.unitScoped ? unit?.id ?? null : null;
        if (want.unitScoped && !wantUnit) {
          report.push(`  ! ${user.email}: el cargo es de unidad pero no tiene unidad; no se cambian sus roles`);
        } else {
          const urs = await UserRole.findAll({ where: { userId: user.id }, include: [{ model: Role, as: 'role' }], ...t });
          for (const ur of urs) {
            if (!ur.role?.key || !MANAGED_ROLES.includes(ur.role.key)) continue; // superadmin y personalizados quedan
            if (ur.roleId === wantRole.id && (ur.unitId ?? null) === wantUnit) continue;
            await ur.destroy(t);
            stats.rolesQuitados++;
          }
          if (!urs.some((ur) => ur.roleId === wantRole.id && (ur.unitId ?? null) === wantUnit)) {
            await UserRole.create({ userId: user.id, roleId: wantRole.id, unitId: wantUnit }, t);
            stats.rolesAgregados++;
          }
        }
      }
    }

    if (apply) {
      await AuditLog.create(
        { userId: null, ip: null, action: 'import', entity: 'Adult', entityId: null, summary: `Cargos y unidades desde lista: ${rows.length} adultos`, changes: stats },
        t,
      );
    } else {
      throw new DryRun();
    }
  }).catch((e) => {
    if (!(e instanceof DryRun)) throw e;
  });

  console.log(report.join('\n'));
  console.log(`\n${apply ? '✓ Guardado' : '· Modo prueba: no se guardó nada (agregá --aplicar)'}`);
  console.log(`  ${stats.coinciden} coinciden, ${stats.nuevos} nuevos, ${stats.cargos} cargos cargados, ${stats.totems} tótems, roles: +${stats.rolesAgregados} / -${stats.rolesQuitados}`);
  await sequelize.close();
}

class DryRun extends Error {}

main().catch(async (err) => {
  console.error('✗', err.message ?? err);
  await sequelize.close();
  process.exit(1);
});

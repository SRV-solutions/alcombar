/**
 * Importa a los integrantes del Grupo desde el JSON que genera obtener_personas.py (API de Mi Rincón).
 *
 *   npm run import:personas -- "C:\Users\...\personas\personas.json"
 *
 * - Chicos y chicas (adulto = false) → Protagonistas. Castores y Rovers van a su unidad (hay una sola);
 *   Lobatos, Scouts y Caminantes quedan "por asignar" con su rama, para repartirlos desde la app.
 * - Adultos → Adultos, con un cargo del año por cada función en el Grupo y su nivel de formación.
 *   Si tienen email, se les crea un usuario (sin contraseña: el acceso se activa con "Generar enlace")
 *   con el rol que corresponde a su función.
 * - Se puede correr varias veces: identifica a cada persona por su id de Mi Rincón (o DNI) y actualiza.
 */
import { readFileSync } from 'node:fs';
import { Op, type Transaction } from 'sequelize';
import { parseFlexibleDate, type Branch } from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, AdultCourse, Affiliation, AuditLog, Course, Member, Role, Unit, User, UserRole } from '../models';

interface Funcion {
  organismo_codigo: string;
  funcion: string;
  protagonista: boolean;
}
interface Persona {
  uuid: string;
  documento: number | string;
  apellido: string;
  nombre: string;
  nacimiento: string;
  celular: string | null;
  email: string | null;
  rama: string | null;
  rama_codigo: string | null;
  adulto: boolean;
  afiliacion: boolean;
  nivel_formacion: string | null;
  funciones: Funcion[] | null;
  datos?: { totem?: string | null } | null;
}

const GRUPO = 'Z1D1G84';
const YEAR = new Date().getFullYear();
const BRANCH_BY_CODE: Record<string, Branch> = { T: 'castores', L: 'lobatos', S: 'scouts', C: 'caminantes', R: 'rovers' };
const SINGLE_UNIT: Partial<Record<Branch, string>> = { castores: 'CCA', rovers: 'CRSLO' };

const clean = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ') || null;
const email = (s: string | null | undefined) => {
  const e = clean(s)?.toLowerCase() ?? null;
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};
const phone = (s: string | null | undefined) => {
  const p = clean(s);
  return p && p.replace(/\D/g, '').length >= 6 ? p : null;
};
const date = (s: string | null | undefined) => {
  try {
    return parseFlexibleDate(s);
  } catch {
    return null;
  }
};

/** Rama a la que pertenece una función ("Ayudante de Manada" → lobatos). */
function branchOfFunction(f: string): Branch | null {
  if (/castor/i.test(f)) return 'castores';
  if (/rover/i.test(f)) return 'rovers';
  if (/manada|lobat|lobezn/i.test(f)) return 'lobatos';
  if (/unidad scout|^scout$/i.test(f)) return 'scouts';
  if (/caminante/i.test(f)) return 'caminantes';
  return null;
}
/** Rol de la app según la función en Mi Rincón. */
function roleOfFunction(f: string): { key: string; unitRole: boolean } {
  if (/^(jefe\/a de grupo|sub-?jefe\/?a? de grupo)/i.test(f)) return { key: 'jefatura', unitRole: false };
  if (/^jefe\/a de /i.test(f)) return { key: 'jefe_unidad', unitRole: true };
  if (/^ayudante/i.test(f)) return { key: 'educador', unitRole: true };
  if (/asesor\/a personal de formaci/i.test(f)) return { key: 'programa', unitRole: false };
  return { key: 'consulta', unitRole: false };
}
const COURSE_BY_LEVEL: Record<string, { name: string; kind: string }> = {
  'Insignia de Madera': { name: 'Insignia de Madera', kind: 'insignia_madera' },
  'Nivel 1': { name: 'Nivel 1', kind: 'curso' },
  'Nivel 2': { name: 'Nivel 2', kind: 'curso' },
};

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Falta la ruta del archivo: npm run import:personas -- "ruta\\personas.json"');
  const personas: Persona[] = JSON.parse(readFileSync(file, 'utf8'));
  const del = personas.filter((p) => (p.funciones ?? []).some((f) => f.organismo_codigo === GRUPO));
  console.log(`→ ${personas.length} personas en el archivo, ${del.length} con funciones en el Grupo`);

  const stats = {
    protagonistas: { nuevos: 0, actualizados: 0, porAsignar: 0 },
    adultos: { nuevos: 0, actualizados: 0, cargos: 0, formacion: 0 },
    usuarios: { creados: 0, yaExistian: 0, sinEmail: 0, rolesDeUnidadPendientes: 0 },
  };
  const warnings: string[] = [];

  await sequelize.transaction(async (transaction: Transaction) => {
    const t = { transaction };
    const units = await Unit.findAll(t);
    const roles = await Role.findAll(t);
    const unitByCode = (code: string) => units.find((u) => u.code === code) ?? null;
    const role = (key: string) => roles.find((r) => r.key === key)!;

    for (const p of del) {
      const funcs = (p.funciones ?? []).filter((f) => f.organismo_codigo === GRUPO).map((f) => clean(f.funcion)!).filter(Boolean);
      const base = {
        firstName: clean(p.nombre) ?? '(sin nombre)',
        lastName: clean(p.apellido) ?? '(sin apellido)',
        dni: clean(String(p.documento ?? '')),
        birthDate: date(p.nacimiento),
        email: email(p.email),
        phone: phone(p.celular),
        externalId: p.uuid,
      };

      if (!p.adulto) {
        // ---------------- Protagonista ----------------
        const branch = (p.rama_codigo && BRANCH_BY_CODE[p.rama_codigo]) || funcs.map(branchOfFunction).find(Boolean) || null;
        const code = branch ? SINGLE_UNIT[branch] : undefined;
        const unit = code ? unitByCode(code) : null;
        const extra = funcs.filter((f) => !/^(castor|lobato \/ lobezna|scout|caminante|rover)$/i.test(f));
        let m = await Member.findOne({ where: { [Op.or]: [{ externalId: p.uuid }, ...(base.dni ? [{ dni: base.dni }] : [])] }, ...t });
        if (m) {
          await m.update(
            {
              ...Object.fromEntries(Object.entries(base).filter(([, v]) => v !== null)),
              ...(m.unitId ? {} : { branch, unitId: unit?.id ?? null }),
            },
            t,
          );
          stats.protagonistas.actualizados++;
        } else {
          m = await Member.create(
            {
              ...base,
              unitId: unit?.id ?? null,
              branch,
              smallGroupId: null,
              joinedAt: null,
              promiseDate: null,
              address: null,
              status: 'activo',
              leftAt: null,
              notes: extra.length ? `Funciones en Mi Rincón: ${extra.join(', ')}` : null,
            },
            t,
          );
          stats.protagonistas.nuevos++;
        }
        if (!m.unitId) stats.protagonistas.porAsignar++;
        if (!branch) warnings.push(`${base.lastName}, ${base.firstName}: sin rama en Mi Rincón`);
        if (p.afiliacion) {
          const af = await Affiliation.findOne({ where: { memberId: m.id, year: YEAR }, ...t });
          if (!af) await Affiliation.create({ memberId: m.id, year: YEAR, status: 'afiliado', date: null, notes: 'Según Mi Rincón' }, t);
        }
        continue;
      }

      // ---------------- Adulto ----------------
      let a = await Adult.findOne({ where: { [Op.or]: [{ externalId: p.uuid }, ...(base.dni ? [{ dni: base.dni }] : [])] }, ...t });
      const totem = clean(p.datos?.totem);
      if (a) {
        await a.update({ ...Object.fromEntries(Object.entries(base).filter(([, v]) => v !== null)), ...(totem ? { totem } : {}) }, t);
        stats.adultos.actualizados++;
      } else {
        a = await Adult.create(
          { ...base, totem, address: null, joinedAt: null, status: 'alta', advisorAdultId: null, notes: null },
          t,
        );
        stats.adultos.nuevos++;
      }

      // Cargos del año (uno por función)
      const wantedRoles: { roleId: string; unitId: string | null; pendingUnit: boolean }[] = [];
      for (const f of funcs) {
        const r = roleOfFunction(f);
        const branch = r.unitRole ? branchOfFunction(f) : null;
        const code = branch ? SINGLE_UNIT[branch] : undefined;
        const unit = code ? unitByCode(code) : null;
        const exists = await AdultAssignment.findOne({ where: { adultId: a.id, year: YEAR, position: f }, ...t });
        if (!exists) {
          await AdultAssignment.create(
            { adultId: a.id, year: YEAR, position: f, unitId: unit?.id ?? null, supportTeamId: null, branch: unit ? null : branch, notes: null },
            t,
          );
          stats.adultos.cargos++;
        }
        if (r.unitRole && !unit) wantedRoles.push({ roleId: role('consulta').id, unitId: null, pendingUnit: true });
        else wantedRoles.push({ roleId: role(r.key).id, unitId: r.unitRole ? unit!.id : null, pendingUnit: false });
      }

      // Formación
      const level = clean(p.nivel_formacion);
      const c = level ? COURSE_BY_LEVEL[level] : undefined;
      if (c) {
        const [course] = await Course.findOrCreate({ where: { name: c.name }, defaults: { name: c.name, kind: c.kind }, ...t });
        const has = await AdultCourse.findOne({ where: { adultId: a.id, courseId: course.id }, ...t });
        if (!has) {
          await AdultCourse.create({ adultId: a.id, courseId: course.id, completedAt: null, certificateUrl: null, notes: 'Según Mi Rincón' }, t);
          stats.adultos.formacion++;
        }
      }

      // Usuario (solo con email)
      if (!base.email) {
        stats.usuarios.sinEmail++;
        continue;
      }
      let user = await User.findOne({ where: { email: base.email }, paranoid: false, ...t });
      if (user) {
        stats.usuarios.yaExistian++;
        if (!user.adultId) await user.update({ adultId: a.id }, t);
      } else {
        user = await User.create(
          { email: base.email, name: `${base.firstName} ${base.lastName}`, passwordHash: null, adultId: a.id, lastLoginAt: null, lockedUntil: null },
          t,
        );
        stats.usuarios.creados++;
      }
      const current = await UserRole.findAll({ where: { userId: user.id }, ...t });
      const seen = new Set(current.map((ur) => `${ur.roleId}|${ur.unitId ?? ''}`));
      for (const w of wantedRoles) {
        const k = `${w.roleId}|${w.unitId ?? ''}`;
        if (seen.has(k)) continue;
        seen.add(k);
        await UserRole.create({ userId: user.id, roleId: w.roleId, unitId: w.unitId }, t);
      }
      if (wantedRoles.some((w) => w.pendingUnit)) stats.usuarios.rolesDeUnidadPendientes++;
    }

    await AuditLog.create(
      {
        userId: null,
        ip: null,
        action: 'import',
        entity: 'Persona',
        entityId: null,
        summary: `Importación desde Mi Rincón: ${stats.protagonistas.nuevos} protagonistas y ${stats.adultos.nuevos} adultos nuevos, ${stats.usuarios.creados} usuarios`,
        changes: stats,
      },
      t,
    );
  });

  console.log('\n✓ Importación terminada');
  console.log(`  Protagonistas: ${stats.protagonistas.nuevos} nuevos, ${stats.protagonistas.actualizados} actualizados, ${stats.protagonistas.porAsignar} por asignar unidad`);
  console.log(`  Adultos: ${stats.adultos.nuevos} nuevos, ${stats.adultos.actualizados} actualizados, ${stats.adultos.cargos} cargos ${YEAR}, ${stats.adultos.formacion} registros de formación`);
  console.log(
    `  Usuarios: ${stats.usuarios.creados} creados, ${stats.usuarios.yaExistian} ya existían, ${stats.usuarios.sinEmail} adultos sin email (sin usuario), ` +
      `${stats.usuarios.rolesDeUnidadPendientes} con rol de unidad pendiente (tienen "Consulta" hasta que se asigne la unidad de su cargo)`,
  );
  if (warnings.length) console.log(`  Avisos:\n   - ${warnings.join('\n   - ')}`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('✗ No se pudo importar:', err.message ?? err);
  await sequelize.close();
  process.exit(1);
});

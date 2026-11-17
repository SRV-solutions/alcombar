// Importador de protagonistas desde planilla (informe §10): vista previa + validación antes de confirmar.
import type { Request } from 'express';
import type { Transaction } from 'sequelize';
import {
  ageAt,
  BRANCH_INFO,
  can,
  defaultSmallGroupKind,
  normalizeName,
  parseFlexibleDate,
  titleCase,
  type Branch,
  type MemberImportRow,
} from '../shared';
import { sequelize } from '../db';
import { Guardian, Member, MemberGuardian, SmallGroup, Unit } from '../models';
import { writeAudit } from '../lib/audit';
import { recordRegistryChanges } from '../lib/registry';

interface GuardianPlan {
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  dni: string | null;
}

interface RowPlan {
  unit: Unit;
  smallGroup: SmallGroup | { create: string } | null;
  existing: Member | null;
  values: {
    firstName: string;
    lastName: string;
    dni: string | null;
    birthDate: string | null;
    joinedAt: string | null;
    promiseDate: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  guardians: GuardianPlan[];
  writeGuardians: boolean;
}

export interface RowResult {
  row: number;
  status: 'new' | 'update' | 'error';
  errors: string[];
  warnings: string[];
  display: { name: string; unit: string | null; smallGroup: string | null; birthDate: string | null; dni: string | null; guardians: number };
  plan?: RowPlan;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanDni = (v: string | undefined | null) => (v ?? '').replace(/[.\s-]/g, '').toUpperCase() || null;
const str = (v: string | undefined | null) => (v ?? '').trim().replace(/\s+/g, ' ') || null;
const digits = (v: string | null) => (v ?? '').replace(/\D/g, '');
const sgKey = (s: string) => normalizeName(s).replace(/^(patrulla|seisena|equipo|madriguera)\s+/, '');

function findUnit(units: Unit[], input: string): Unit | 'ambiguous' | null {
  const raw = input.trim();
  const n = normalizeName(raw);
  if (!n) return null;
  const byCode = units.find((u) => u.code.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode;
  const exact = units.find((u) => normalizeName(u.name) === n);
  if (exact) return exact;
  const partial = units.filter((u) => {
    const un = normalizeName(u.name);
    return un.includes(n) || n.includes(un);
  });
  if (partial.length === 1) return partial[0];
  return partial.length > 1 ? 'ambiguous' : null;
}

export async function analyzeRows(rows: MemberImportRow[], req: Request): Promise<RowResult[]> {
  const [units, smallGroups, members] = await Promise.all([
    Unit.findAll(),
    SmallGroup.findAll(),
    Member.findAll({ attributes: ['id', 'firstName', 'lastName', 'dni', 'birthDate', 'unitId', 'branch'] }),
  ]);
  const byDni = new Map(members.filter((m) => m.dni).map((m) => [m.dni!, m]));
  const byNameBirth = new Map(members.map((m) => [`${normalizeName(m.lastName)}|${normalizeName(m.firstName)}|${m.birthDate ?? ''}`, m]));
  const seenDni = new Map<string, number>();
  const seenName = new Map<string, number>();
  const today = new Date().toISOString().slice(0, 10);

  return rows.map((r, i) => {
    const rowNum = i + 2; // fila 1 = encabezados
    const errors: string[] = [];
    const warnings: string[] = [];
    const lastName = str(r.apellido) ? titleCase(str(r.apellido)!) : null;
    const firstName = str(r.nombre) ? titleCase(str(r.nombre)!) : null;
    if (!lastName) errors.push('Falta el apellido');
    if (!firstName) errors.push('Falta el nombre');

    const date = (label: string, v: string | undefined, required = false) => {
      try {
        const d = parseFlexibleDate(v);
        if (!d && required) errors.push(`Falta la ${label}`);
        return d;
      } catch {
        errors.push(`${label[0].toUpperCase()}${label.slice(1)} inválida: "${v}" (usar dd/mm/aaaa)`);
        return null;
      }
    };
    const birthDate = date('fecha de nacimiento', r.fecha_nacimiento, true);
    const joinedAt = date('fecha de ingreso', r.fecha_ingreso);
    const promiseDate = date('fecha de Promesa', r.fecha_promesa);

    const dni = cleanDni(r.dni);
    if (dni && !/^[0-9A-Z]{6,12}$/.test(dni)) errors.push(`DNI inválido: "${r.dni}"`);
    const email = str(r.email)?.toLowerCase() ?? null;
    if (email && !EMAIL_RE.test(email)) errors.push(`Email inválido: "${email}"`);

    // Unidad
    let unit: Unit | null = null;
    const unitInput = str(r.unidad);
    if (!unitInput) errors.push('Falta la unidad');
    else {
      const found = findUnit(units, unitInput);
      if (found === 'ambiguous') errors.push(`"${unitInput}" coincide con más de una unidad; usá el nombre completo o el código`);
      else if (!found) errors.push(`No existe la unidad "${unitInput}"`);
      else unit = found;
    }

    // Duplicados dentro de la planilla
    if (dni) {
      if (seenDni.has(dni)) errors.push(`DNI repetido en la planilla (fila ${seenDni.get(dni)})`);
      else seenDni.set(dni, rowNum);
    }
    const nameKey = `${normalizeName(lastName)}|${normalizeName(firstName)}|${birthDate ?? ''}`;
    if (lastName && firstName) {
      if (seenName.has(nameKey)) errors.push(`Protagonista repetido en la planilla (fila ${seenName.get(nameKey)})`);
      else seenName.set(nameKey, rowNum);
    }

    // ¿Ya existe?
    const existing = (dni && byDni.get(dni)) || byNameBirth.get(nameKey) || null;

    // Pequeño grupo
    let smallGroup: RowPlan['smallGroup'] = null;
    const sgInput = str(r.pequeno_grupo);
    if (sgInput && unit) {
      const found = smallGroups.find((s) => s.unitId === unit!.id && sgKey(s.name) === sgKey(sgInput));
      if (found) smallGroup = found;
      else if (can(req.auth, 'small_groups', 'create', unit.id)) {
        smallGroup = { create: titleCase(sgInput) };
        warnings.push(`Se va a crear el pequeño grupo "${titleCase(sgInput)}"`);
      } else warnings.push(`No existe el pequeño grupo "${sgInput}"; queda sin asignar`);
    }

    // Permisos
    if (unit) {
      if (existing && !existing.unitId) {
        // Estaba "por asignar": la planilla le asigna la unidad (por ejemplo, la nómina de una unidad)
        if (existing.branch && existing.branch !== unit.branch) errors.push(`Ya está cargado/a en otra rama (${existing.branch}); no puede ir a ${unit.name}`);
        else if (!can(req.auth, 'members', 'edit', unit.id)) errors.push(`No tenés permiso para asignar protagonistas a ${unit.name}`);
        else warnings.push(`Estaba por asignar: queda en ${unit.name}`);
      } else if (existing) {
        if (!can(req.auth, 'members', 'edit', existing.unitId)) errors.push('Ya existe y no tenés permiso para editarlo');
        if (existing.unitId !== unit.id) {
          const other = units.find((u) => u.id === existing.unitId);
          warnings.push(`Ya está cargado en ${other?.name ?? 'otra unidad'}: se actualizan sus datos pero no la unidad (para cambiarla usá "Pase de unidad")`);
        }
      } else if (!can(req.auth, 'members', 'create', unit.id)) {
        errors.push(`No tenés permiso para dar de alta protagonistas en ${unit.name}`);
      }
    }

    // Edad vs rama
    if (unit && birthDate) {
      const age = ageAt(birthDate, today);
      const info = BRANCH_INFO[unit.branch as Branch];
      if (age !== null && info && (age < info.ages[0] - 1 || age > info.ages[1] + 1)) {
        warnings.push(`Tiene ${age} años; la rama ${info.label} es de ${info.ages[0]} a ${info.ages[1]}`);
      }
    }

    // Responsables
    const guardians: GuardianPlan[] = [];
    for (const n of [1, 2] as const) {
      const name = str(r[`resp${n}_nombre`]);
      const phone = str(r[`resp${n}_telefono`]);
      const gEmail = str(r[`resp${n}_email`])?.toLowerCase() ?? null;
      const gDni = cleanDni(r[`resp${n}_dni`]);
      if (!name) {
        if (phone || gEmail || gDni) warnings.push(`Responsable ${n}: tiene datos pero falta el nombre; no se carga`);
        continue;
      }
      if (gEmail && !EMAIL_RE.test(gEmail)) errors.push(`Responsable ${n}: email inválido "${gEmail}"`);
      if (gDni && !/^[0-9A-Z]{6,12}$/.test(gDni)) errors.push(`Responsable ${n}: DNI inválido "${gDni}"`);
      guardians.push({ name: titleCase(name), relationship: str(r[`resp${n}_vinculo`]), phone, email: gEmail, dni: gDni });
    }
    const writeGuardians = unit ? can(req.auth, 'member_contacts', 'edit', existing?.unitId || unit.id) : false;
    if (guardians.length && unit && !writeGuardians) warnings.push('No tenés permiso para cargar responsables; se omiten');

    const result: RowResult = {
      row: rowNum,
      status: errors.length ? 'error' : existing ? 'update' : 'new',
      errors,
      warnings,
      display: {
        name: [lastName, firstName].filter(Boolean).join(', ') || '(sin nombre)',
        unit: unit?.name ?? unitInput ?? null,
        smallGroup: smallGroup ? ('create' in smallGroup ? smallGroup.create : smallGroup.name) : null,
        birthDate,
        dni,
        guardians: guardians.length,
      },
    };
    if (!errors.length && unit) {
      result.plan = {
        unit,
        smallGroup,
        existing,
        values: { firstName: firstName!, lastName: lastName!, dni, birthDate, joinedAt, promiseDate, address: str(r.direccion), phone: str(r.telefono), email },
        guardians,
        writeGuardians,
      };
    }
    return result;
  });
}

export async function commitRows(rows: MemberImportRow[], req: Request) {
  const results = await analyzeRows(rows, req);
  const valid = results.filter((r) => r.plan);
  const stats = { created: 0, updated: 0, skipped: results.length - valid.length, guardiansCreated: 0, smallGroupsCreated: 0 };
  const createdMembers: Member[] = [];

  await sequelize.transaction(async (transaction: Transaction) => {
    const guardians = await Guardian.findAll({ transaction });
    const createdGroups = new Map<string, SmallGroup>();

    const findGuardian = (g: GuardianPlan) =>
      (g.dni && guardians.find((x) => x.dni === g.dni)) ||
      (g.email && guardians.find((x) => x.email?.toLowerCase() === g.email)) ||
      (digits(g.phone) && guardians.find((x) => normalizeName(x.name) === normalizeName(g.name) && digits(x.phone) === digits(g.phone))) ||
      null;

    for (const r of valid) {
      const p = r.plan!;
      // Pequeño grupo
      let smallGroupId: string | null = null;
      if (p.smallGroup && 'create' in p.smallGroup) {
        const key = `${p.unit.id}|${sgKey(p.smallGroup.create)}`;
        let sg = createdGroups.get(key);
        if (!sg) {
          sg = await SmallGroup.create(
            { unitId: p.unit.id, name: p.smallGroup.create, kind: defaultSmallGroupKind(p.unit.branch as Branch) },
            { transaction },
          );
          createdGroups.set(key, sg);
          stats.smallGroupsCreated++;
        }
        smallGroupId = sg.id;
      } else if (p.smallGroup) smallGroupId = p.smallGroup.id;

      // Protagonista
      let member: Member;
      if (p.existing) {
        member = (await Member.findByPk(p.existing.id, { transaction }))!;
        const updates: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(p.values)) if (v !== null && v !== undefined) updates[k] = v;
        if (!member.unitId) {
          updates.unitId = p.unit.id;
          updates.branch = p.unit.branch;
        }
        if (smallGroupId && (member.unitId ?? p.unit.id) === p.unit.id) updates.smallGroupId = smallGroupId;
        await member.update(updates, { transaction });
        stats.updated++;
      } else {
        member = await Member.create(
          { ...p.values, unitId: p.unit.id, branch: p.unit.branch, smallGroupId, status: 'activo', leftAt: null, notes: null },
          { transaction },
        );
        createdMembers.push(member);
        stats.created++;
      }

      // Responsables (hermanos comparten el mismo registro de responsable)
      if (p.writeGuardians) {
        for (const [idx, g] of p.guardians.entries()) {
          let guardian = findGuardian(g);
          if (guardian) {
            const upd: Record<string, unknown> = {};
            if (g.phone) upd.phone = g.phone;
            if (g.email) upd.email = g.email;
            if (g.dni) upd.dni = g.dni;
            if (Object.keys(upd).length) await guardian.update(upd, { transaction });
          } else {
            guardian = await Guardian.create({ name: g.name, phone: g.phone, email: g.email, dni: g.dni, address: null }, { transaction });
            guardians.push(guardian);
            stats.guardiansCreated++;
          }
          const link = await MemberGuardian.findOne({ where: { memberId: member.id, guardianId: guardian.id }, transaction });
          if (link) {
            if (g.relationship && link.relationship !== g.relationship) await link.update({ relationship: g.relationship }, { transaction });
          } else {
            await MemberGuardian.create({ memberId: member.id, guardianId: guardian.id, relationship: g.relationship, sortOrder: idx }, { transaction });
          }
        }
      }
    }
    await writeAudit(
      {
        action: 'import',
        entity: 'Member',
        summary: `Importación: ${stats.created} nuevos, ${stats.updated} actualizados, ${stats.skipped} con errores`,
        changes: stats,
      },
      transaction,
    );
  });
  // Los nuevos son altas para cargar en Cruz del Sur (un solo aviso con todos)
  if (createdMembers.length) await recordRegistryChanges(req, createdMembers.map((member) => ({ kind: 'alta' as const, member, detail: 'Importado desde planilla' })));
  return { stats, results: results.map(({ plan: _plan, ...rest }) => rest) };
}

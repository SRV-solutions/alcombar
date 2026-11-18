import { Router, type Request } from 'express';
import { z } from 'zod';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import {
  affiliationSchema,
  can,
  departureSchema,
  roverRotationSchema,
  documentStatus,
  formatDate,
  guardianSchema,
  memberDocumentSchema,
  memberImportSchema,
  memberSchema,
  moveSmallGroupSchema,
  optUuid,
  todayIso,
  transferSchema,
  bulkTransferSchema,
  TRANSFER_REASON_LABELS,
  type TransferReason,
  unitsWith,
  type MemberImportRow,
} from '../shared';
import { sequelize } from '../db';
import {
  Adult,
  Affiliation,
  Attendance,
  DocumentType,
  Guardian,
  Member,
  MemberDocument,
  MemberGuardian,
  SmallGroup,
  Unit,
  UnitTransfer,
} from '../models';
import { writeAudit } from '../lib/audit';
import { adultRegistered, memberRegistered, recordRegistryChanges, registryTransition } from '../lib/registry';
import { sendCsv, toCsv } from '../lib/csv';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';
import { analyzeRows, commitRows } from './members.import';
import { personSearchWhere } from '../lib/personSearch';

export const membersRouter = Router();

const memberUnit = async (req: Request) => (await Member.findByPk(req.params.id, { attributes: ['unitId'] }))?.unitId;

const unitInclude = [
  { model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'branch'] },
  { model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name', 'kind'] },
];

/** Resumen de documentación por protagonista (cantidad al día / total de tipos activos). */
async function docSummaries(memberIds: string[]) {
  const [types, docs] = await Promise.all([
    DocumentType.findAll({ where: { active: true, appliesTo: 'member' } }),
    memberIds.length ? MemberDocument.findAll({ where: { memberId: memberIds } }) : Promise.resolve([] as MemberDocument[]),
  ]);
  const today = todayIso();
  const out = new Map<string, { ok: number; expiring: number; expired: number; missing: number; total: number }>();
  for (const id of memberIds) {
    const s = { ok: 0, expiring: 0, expired: 0, missing: 0, total: types.length };
    for (const t of types) s[documentStatus(docs.find((d) => d.memberId === id && d.documentTypeId === t.id), t.hasExpiry, today, t.required)]++;
    out.set(id, s);
  }
  return out;
}

membersRouter.get(
  '/',
  authorize('members', 'view'),
  ah(async (req, res) => {
    const where: WhereOptions = {};
    const allowed = unitsWith(req.auth, 'members', 'view');
    const unitId = String(req.query.unitId ?? '');
    if (unitId === 'pendientes') {
      // Protagonistas sin unidad asignada (se sabe la rama): los ve quien puede ver a todo el Grupo
      if (allowed !== 'all') throw forbidden();
      Object.assign(where, { unitId: null });
      if (req.query.branch) Object.assign(where, { branch: String(req.query.branch) });
    } else if (unitId) {
      if (allowed !== 'all' && !allowed.includes(unitId)) throw forbidden();
      Object.assign(where, { unitId });
    } else if (allowed !== 'all') Object.assign(where, { unitId: allowed });
    if (req.query.smallGroupId) Object.assign(where, { smallGroupId: String(req.query.smallGroupId) });
    const status = String(req.query.status ?? 'activo');
    if (status !== 'todos') Object.assign(where, { status });
    const q = String(req.query.q ?? '').trim();
    const search = q ? personSearchWhere(q, ['Member.first_name', 'Member.last_name', 'Member.dni'], 'Member.dni') : null;
    if (search) Object.assign(where, { [Op.and]: [search] });
    if (req.query.branch && unitId !== 'pendientes') Object.assign(where, { branch: String(req.query.branch) });
    const limit = Math.min(Number(req.query.limit) || 0, 50) || undefined;
    const members = await Member.findAll({ where, include: unitInclude, order: [['lastName', 'ASC'], ['firstName', 'ASC']], limit });
    const docs = await docSummaries(members.map((m) => m.id));
    res.json(
      members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        dni: m.dni,
        birthDate: m.birthDate,
        joinedAt: m.joinedAt,
        promiseDate: m.promiseDate,
        status: m.status,
        inRotation: m.inRotation,
        branch: m.branch ?? m.unit?.branch ?? null,
        unit: m.unit,
        smallGroup: m.smallGroup,
        docs: can(req.auth, 'member_documents', 'view', m.unitId) ? docs.get(m.id) : null,
      })),
    );
  }),
);

membersRouter.get(
  '/export',
  authorize('members', 'export'),
  ah(async (req, res) => {
    const allowed = unitsWith(req.auth, 'members', 'export');
    const unitId = String(req.query.unitId ?? '');
    const where: WhereOptions = { status: 'activo' };
    if (unitId) {
      if (allowed !== 'all' && !allowed.includes(unitId)) throw forbidden();
      Object.assign(where, { unitId });
    } else if (allowed !== 'all') Object.assign(where, { unitId: allowed });
    const members = await Member.findAll({
      where,
      include: [...unitInclude, { model: MemberGuardian, as: 'guardianLinks', include: [{ model: Guardian, as: 'guardian' }] }],
      order: [['unitId', 'ASC'], ['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const headers = [
      'unidad', 'apellido', 'nombre', 'fecha_nacimiento', 'dni', 'pequeno_grupo', 'fecha_ingreso', 'fecha_promesa', 'direccion', 'telefono', 'email',
      'resp1_nombre', 'resp1_vinculo', 'resp1_telefono', 'resp1_email', 'resp1_dni',
      'resp2_nombre', 'resp2_vinculo', 'resp2_telefono', 'resp2_email', 'resp2_dni',
    ];
    const rows = members.map((m) => {
      const showContacts = can(req.auth, 'member_contacts', 'view', m.unitId);
      const links = showContacts ? [...(m.guardianLinks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder) : [];
      const g = (i: number) => {
        const l = links[i];
        return l ? [l.guardian?.name, l.relationship, l.guardian?.phone, l.guardian?.email, l.guardian?.dni] : ['', '', '', '', ''];
      };
      return [
        m.unit?.name ?? `Por asignar (${m.branch ?? 'sin rama'})`, m.lastName, m.firstName, formatDate(m.birthDate), m.dni, m.smallGroup?.name, formatDate(m.joinedAt), formatDate(m.promiseDate),
        showContacts ? m.address : '', showContacts ? m.phone : '', showContacts ? m.email : '', ...g(0), ...g(1),
      ];
    });
    await writeAudit({ action: 'export', entity: 'Member', summary: `Exportación de ${members.length} protagonistas` });
    sendCsv(res, `protagonistas-${todayIso()}.csv`, toCsv(headers, rows));
  }),
);

// ---------------- Asignar unidad a protagonistas "por asignar" ----------------
const assignSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1, 'Elegí al menos un protagonista').max(500),
  unitId: z.string({ required_error: 'Elegí la unidad' }).uuid('Elegí la unidad'),
  smallGroupId: optUuid,
});

membersRouter.post(
  '/assign-unit',
  ah(async (req, res) => {
    const data = parse(assignSchema, req.body);
    // Puede asignar quien puede editar protagonistas de la unidad destino (por ejemplo, su Jefe/a de Unidad)
    assertCan(req, 'members', 'edit', data.unitId);
    const unit = await Unit.findByPk(data.unitId);
    if (!unit) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
    if (data.smallGroupId) {
      const sg = await SmallGroup.findByPk(data.smallGroupId);
      if (!sg || sg.unitId !== unit.id) throw badRequest('Revisá los datos', { smallGroupId: 'El pequeño grupo no es de esa unidad' });
    }
    const result = { assigned: 0, alreadyAssigned: 0, otherBranch: [] as string[] };
    await sequelize.transaction(async (transaction) => {
      const members = await Member.findAll({ where: { id: data.memberIds }, transaction });
      for (const m of members) {
        if (m.unitId) {
          result.alreadyAssigned++;
          continue;
        }
        if (m.branch && m.branch !== unit.branch) {
          result.otherBranch.push(`${m.firstName} ${m.lastName}`);
          continue;
        }
        await m.update({ unitId: unit.id, branch: unit.branch, smallGroupId: data.smallGroupId }, { transaction });
        result.assigned++;
      }
    });
    res.json(result);
  }),
);

// ---------------- Importación ----------------
membersRouter.post(
  '/import/preview',
  ah(async (req, res) => {
    const { rows } = parse(memberImportSchema, req.body);
    const results = await analyzeRows(rows as MemberImportRow[], req);
    res.json({
      results: results.map(({ plan: _plan, ...r }) => r),
      summary: {
        new: results.filter((r) => r.status === 'new').length,
        update: results.filter((r) => r.status === 'update').length,
        error: results.filter((r) => r.status === 'error').length,
      },
    });
  }),
);

membersRouter.post(
  '/import/commit',
  ah(async (req, res) => {
    const { rows } = parse(memberImportSchema, req.body);
    res.json(await commitRows(rows as MemberImportRow[], req));
  }),
);

// ---------------- Historial de pases ----------------
membersRouter.get(
  '/transfers',
  authorize('members', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const allowed = unitsWith(req.auth, 'members', 'view');
    const list = await UnitTransfer.findAll({
      where: {
        date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] },
        ...(allowed === 'all' ? {} : { [Op.or]: [{ fromUnitId: allowed }, { toUnitId: allowed }] }),
      },
      include: [
        { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName'], required: true },
        { model: Unit, as: 'fromUnit', attributes: ['id', 'name', 'code', 'branch'] },
        { model: Unit, as: 'toUnit', attributes: ['id', 'name', 'code', 'branch'] },
      ],
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    res.json(
      list.map((t) => ({
        ...t.toJSON(),
        reasonLabel: t.reason ? TRANSFER_REASON_LABELS[t.reason as TransferReason] ?? t.reason : null,
      })),
    );
  }),
);

// ---------------- Ficha ----------------
/**
 * Mover protagonistas de pequeño grupo (patrulla, seisena, equipo) en cualquier momento. Lo pueden hacer los
 * adultos con permiso de editar protagonistas en esa unidad (jefes y ayudantes), solo en su propia unidad.
 */
membersRouter.post(
  '/small-group',
  ah(async (req, res) => {
    const { memberIds, smallGroupId } = parse(moveSmallGroupSchema, req.body);
    const ids = [...new Set(memberIds)];
    const members = await Member.findAll({ where: { id: ids } });
    if (members.length !== ids.length) throw badRequest('Hay protagonistas que no existen');
    const sg = smallGroupId ? await SmallGroup.findByPk(smallGroupId) : null;
    if (smallGroupId && (!sg || !sg.active)) throw badRequest('Ese pequeño grupo no existe o está inactivo');
    for (const m of members) {
      if (!m.unitId) throw badRequest(`${m.firstName} ${m.lastName} todavía no tiene unidad`);
      assertCan(req, 'members', 'edit', m.unitId);
      if (sg && sg.unitId !== m.unitId) throw badRequest(`${sg.name} no es de la unidad de ${m.firstName} ${m.lastName}`);
    }
    let moved = 0;
    await sequelize.transaction(async (transaction) => {
      for (const m of members) {
        if (m.smallGroupId === (sg?.id ?? null)) continue;
        await m.update({ smallGroupId: sg?.id ?? null }, { transaction });
        moved++;
      }
    });
    res.json({ moved });
  }),
);

membersRouter.get(
  '/:id',
  authorize('members', 'view', memberUnit),
  ah(async (req, res) => {
    const m = await Member.findByPk(req.params.id, { include: unitInclude });
    if (!m) throw notFound();
    const u = m.unitId;
    const flags = {
      canEdit: can(req.auth, 'members', 'edit', u),
      canDelete: can(req.auth, 'members', 'delete', u),
      canViewContacts: can(req.auth, 'member_contacts', 'view', u),
      canEditContacts: can(req.auth, 'member_contacts', 'edit', u),
      canViewDocuments: can(req.auth, 'member_documents', 'view', u),
      canEditDocuments: can(req.auth, 'member_documents', 'edit', u),
      canViewAttendance: can(req.auth, 'attendance', 'view', u),
    };
    const [links, documents, types, transfers, affiliations, attendance] = await Promise.all([
      flags.canViewContacts
        ? MemberGuardian.findAll({ where: { memberId: m.id }, include: [{ model: Guardian, as: 'guardian', required: true }], order: [['sortOrder', 'ASC']] })
        : [],
      flags.canViewDocuments ? MemberDocument.findAll({ where: { memberId: m.id } }) : [],
      DocumentType.findAll({ where: { appliesTo: 'member' }, order: [['sortOrder', 'ASC']] }),
      UnitTransfer.findAll({
        where: { memberId: m.id },
        include: [
          { model: Unit, as: 'fromUnit', attributes: ['id', 'name', 'code'] },
          { model: Unit, as: 'toUnit', attributes: ['id', 'name', 'code'] },
        ],
        order: [['date', 'DESC']],
      }),
      Affiliation.findAll({ where: { memberId: m.id }, order: [['year', 'DESC']] }),
      flags.canViewAttendance ? Attendance.findAll({ where: { memberId: m.id }, order: [['date', 'DESC']], limit: 60 }) : [],
    ]);
    // Los hermanos se detectan por responsables compartidos
    const guardianIds = links.map((l) => l.guardianId);
    const siblings = guardianIds.length
      ? await MemberGuardian.findAll({
          where: { guardianId: guardianIds, memberId: { [Op.ne]: m.id } },
          include: [{ model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'unitId'], required: true }],
        })
      : [];
    const data = m.toJSON() as Record<string, unknown>;
    // Si hizo la partida: el adulto que pasó a ser
    const adult = m.adultId ? await Adult.findByPk(m.adultId, { attributes: ['id', 'firstName', 'lastName', 'totem'] }) : null;
    if (!flags.canViewContacts) {
      data.address = null;
      data.phone = null;
      data.email = null;
    }
    res.json({
      ...data,
      ...flags,
      guardians: links.map((l) => ({ linkId: l.id, relationship: l.relationship, ...l.guardian!.toJSON() })),
      documents: flags.canViewDocuments
        ? types
            .filter((t) => t.active || documents.some((d) => d.documentTypeId === t.id))
            .map((t) => {
              const d = documents.find((x) => x.documentTypeId === t.id);
              return {
                documentTypeId: t.id,
                name: t.name,
                hasExpiry: t.hasExpiry,
                required: t.required,
                presented: d?.presented ?? false,
                notApplicable: (!d?.presented && d?.notApplicable) ?? false,
                presentedAt: d?.presentedAt ?? null,
                expiresAt: d?.expiresAt ?? null,
                notes: d?.notes ?? null,
                status: documentStatus(d, t.hasExpiry, todayIso(), t.required),
              };
            })
        : null,
      adult,
      transfers,
      affiliations,
      attendance,
      siblings: [...new Map(siblings.map((s) => [s.member!.id, s.member!])).values()],
    });
  }),
);

membersRouter.post(
  '/',
  ah(async (req, res) => {
    const data = parse(memberSchema, req.body);
    assertCan(req, 'members', 'create', data.unitId);
    if (data.smallGroupId) {
      const sg = await SmallGroup.findByPk(data.smallGroupId);
      if (!sg || sg.unitId !== data.unitId) throw badRequest('Revisá los datos', { smallGroupId: 'El pequeño grupo no es de esa unidad' });
    }
    if (data.dni && (await Member.findOne({ where: { dni: data.dni } }))) {
      throw badRequest('Revisá los datos', { dni: 'Ya hay un protagonista con ese DNI' });
    }
    const unit = await Unit.findByPk(data.unitId);
    if (!unit) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
    const member = await Member.create({ ...data, branch: unit.branch, leftAt: data.status === 'baja' ? todayIso() : null });
    if (memberRegistered(member.status)) await recordRegistryChanges(req, [{ kind: 'alta', member }]);
    res.status(201).json(member);
  }),
);

membersRouter.put(
  '/:id',
  authorize('members', 'edit', memberUnit),
  ah(async (req, res) => {
    const member = await Member.findByPk(req.params.id);
    if (!member) throw notFound();
    const data = parse(memberSchema, req.body);
    let assignUnit: Unit | null = null;
    if (data.unitId !== member.unitId) {
      if (member.unitId) throw badRequest('Para cambiar de unidad usá "Pase de unidad"');
      // Estaba "por asignar": se le puede asignar la unidad desde el formulario
      assertCan(req, 'members', 'edit', data.unitId);
      assignUnit = await Unit.findByPk(data.unitId);
      if (!assignUnit) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
    }
    if (data.smallGroupId) {
      const sg = await SmallGroup.findByPk(data.smallGroupId);
      if (!sg || sg.unitId !== data.unitId) throw badRequest('Revisá los datos', { smallGroupId: 'El pequeño grupo no es de esa unidad' });
    }
    if (data.dni) {
      const dup = await Member.findOne({ where: { dni: data.dni, id: { [Op.ne]: member.id } } });
      if (dup) throw badRequest('Revisá los datos', { dni: 'Ya hay otro protagonista con ese DNI' });
    }
    if (data.status === 'partida' && member.status !== 'partida') {
      throw badRequest('Revisá los datos', { status: 'La partida se registra con el botón «Hizo la partida» de su ficha' });
    }
    const canContacts = can(req.auth, 'member_contacts', 'edit', member.unitId ?? data.unitId);
    const { address, phone, email, unitId: _unitId, ...rest } = data;
    const leftAt = data.status === 'activo' ? null : member.status === data.status ? member.leftAt : todayIso();
    const wasRegistered = memberRegistered(member.status);
    await member.update({
      ...rest,
      leftAt,
      // Si vuelve a estar activo, se deshace la partida (el adulto creado no se borra)
      ...(data.status === 'activo' ? { departedAt: null, adultId: null } : { inRotation: false, rotationSince: null }),
      ...(assignUnit ? { unitId: assignUnit.id, branch: assignUnit.branch } : {}),
      ...(canContacts ? { address, phone, email } : {}),
    });
    const kind = registryTransition(wasRegistered, memberRegistered(member.status));
    if (kind) await recordRegistryChanges(req, [{ kind, member }]);
    res.json(member);
  }),
);

membersRouter.delete(
  '/:id',
  authorize('members', 'delete', memberUnit),
  ah(async (req, res) => {
    const member = await Member.findByPk(req.params.id);
    if (!member) throw notFound();
    await member.destroy();
    if (memberRegistered(member.status)) {
      await recordRegistryChanges(req, [
        { kind: 'baja', member, detail: 'Se eliminó de ALCOMBAR. Si era un registro duplicado o cargado por error, marcalo como "No corresponde".' },
      ]);
    }
    res.json({ ok: true });
  }),
);

// ---------------- Pase de unidad ----------------
async function destination(data: { toUnitId: string; toSmallGroupId: string | null }) {
  const toUnit = await Unit.findByPk(data.toUnitId);
  if (!toUnit) throw badRequest('Revisá los datos', { toUnitId: 'Unidad inexistente' });
  if (data.toSmallGroupId) {
    const sg = await SmallGroup.findByPk(data.toSmallGroupId);
    if (!sg || sg.unitId !== toUnit.id) throw badRequest('Revisá los datos', { toSmallGroupId: 'El pequeño grupo no es de esa unidad' });
  }
  return toUnit;
}

async function moveMember(
  member: Member,
  toUnit: Unit,
  data: { toSmallGroupId: string | null; date: string; reason: TransferReason; notes: string | null },
  transaction: Transaction,
) {
  await UnitTransfer.create(
    { memberId: member.id, fromUnitId: member.unitId, toUnitId: toUnit.id, date: data.date, reason: data.reason, notes: data.notes },
    { transaction },
  );
  await member.update({ unitId: toUnit.id, branch: toUnit.branch, smallGroupId: data.toSmallGroupId }, { transaction });
}

membersRouter.post(
  '/:id/transfer',
  authorize('members', 'edit', memberUnit),
  ah(async (req, res) => {
    const member = await Member.findByPk(req.params.id);
    if (!member) throw notFound();
    const data = parse(transferSchema, req.body);
    if (data.toUnitId === member.unitId) throw badRequest('Revisá los datos', { toUnitId: 'Ya está en esa unidad' });
    if (!member.unitId) throw badRequest('No tiene unidad: usá "Asignar unidad"');
    const toUnit = await destination(data);
    await sequelize.transaction((transaction) => moveMember(member, toUnit, data, transaction));
    res.json(member);
  }),
);

/** Solo un rover activo pasa a rotación o hace la partida. */
async function activeRover(id: string) {
  const member = await Member.findByPk(id, { include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'branch'] }] });
  if (!member) throw notFound();
  if ((member.unit?.branch ?? member.branch) !== 'rovers') throw badRequest('Solo los rovers pasan a rotación o hacen la partida');
  if (member.status !== 'activo') throw badRequest('No está activo/a');
  return member;
}

/** Rover en rotación: su último tiempo en la rama, antes de la partida. Sigue siendo rover. */
membersRouter.post(
  '/:id/rotation',
  authorize('members', 'edit', memberUnit),
  ah(async (req, res) => {
    const member = await activeRover(req.params.id);
    const { inRotation } = parse(roverRotationSchema, req.body);
    await member.update({ inRotation, rotationSince: inRotation ? (member.inRotation ? member.rotationSince : todayIso()) : null });
    await writeAudit({
      action: 'update',
      entity: 'Member',
      entityId: member.id,
      summary: `${member.firstName} ${member.lastName}: ${inRotation ? 'pasa a rover en rotación' : 'deja de estar en rotación'}`,
    });
    res.json({ ok: true, inRotation: member.inRotation, rotationSince: member.rotationSince });
  }),
);

/**
 * Partida: el rover termina su etapa de protagonista y pasa a ser adulto del Grupo. Su ficha de protagonista no se
 * pierde: queda con estado «Hizo la partida» y enlazada al adulto, con todo su historial (pases, progresión, asistencia).
 */
membersRouter.post(
  '/:id/departure',
  authorize('members', 'edit', memberUnit),
  ah(async (req, res) => {
    const member = await activeRover(req.params.id);
    const { date } = parse(departureSchema, req.body);
    if (date > todayIso()) throw badRequest('Revisá los datos', { date: 'La partida todavía no pasó' });
    let created = false;
    const adult = await sequelize.transaction(async (transaction) => {
      // Si ya estaba cargado como adulto (mismo DNI), se enlaza en lugar de duplicarlo
      let a = member.dni ? await Adult.findOne({ where: { dni: member.dni }, transaction }) : null;
      if (!a) {
        a = await Adult.create(
          {
            firstName: member.firstName,
            lastName: member.lastName,
            totem: null,
            dni: member.dni,
            birthDate: member.birthDate,
            email: member.email,
            phone: member.phone,
            address: member.address,
            joinedAt: member.joinedAt,
            status: 'alta',
            advisorAdultId: null,
            notes: `Fue protagonista del Grupo. Hizo la partida el ${formatDate(date)}.`,
          },
          { transaction },
        );
        created = true;
      }
      await member.update({ status: 'partida', leftAt: date, departedAt: date, inRotation: false, adultId: a.id }, { transaction });
      await writeAudit(
        { action: 'update', entity: 'Member', entityId: member.id, summary: `${member.firstName} ${member.lastName} hizo la partida (${date}) y pasa a ser adulto del Grupo` },
        transaction,
      );
      return a;
    });
    // Cruz del Sur: baja como protagonista y, si el adulto es nuevo, alta como adulto
    await recordRegistryChanges(req, [
      { kind: 'baja', member, detail: 'Hizo la partida: pasa a ser adulto del Grupo' },
      ...(created && adultRegistered(adult.status) ? [{ kind: 'alta' as const, adult, detail: 'Viene de la Comunidad Rover (partida)' }] : []),
    ]);
    res.json({ ok: true, adultId: adult.id, created });
  }),
);

/** Pase de varios protagonistas a la vez (por edad o entre unidades de la misma rama). */
membersRouter.post(
  '/transfers',
  ah(async (req, res) => {
    assertCan(req, 'members', 'edit');
    const data = parse(bulkTransferSchema, req.body);
    const toUnit = await destination(data);
    const moved: string[] = [];
    const skipped: { name: string; why: string }[] = [];
    await sequelize.transaction(async (transaction) => {
      const members = await Member.findAll({ where: { id: data.memberIds }, transaction });
      for (const m of members) {
        const name = `${m.firstName} ${m.lastName}`;
        if (!m.unitId) skipped.push({ name, why: 'no tiene unidad (usá "Asignar unidad")' });
        else if (m.unitId === toUnit.id) skipped.push({ name, why: 'ya está en esa unidad' });
        else if (!can(req.auth, 'members', 'edit', m.unitId)) skipped.push({ name, why: 'no tenés permiso sobre su unidad' });
        else {
          await moveMember(m, toUnit, data, transaction);
          moved.push(name);
        }
      }
    });
    res.json({ moved: moved.length, toUnit: toUnit.name, skipped });
  }),
);

// ---------------- Responsables ----------------
membersRouter.post(
  '/:id/guardians',
  authorize('member_contacts', 'edit', memberUnit),
  ah(async (req, res) => {
    const data = parse(guardianSchema, req.body);
    const { relationship, ...g } = data;
    const memberId = req.params.id;
    const link = await sequelize.transaction(async (transaction) => {
      // Si ya existe un responsable con ese DNI (por ejemplo, de un hermano), se reutiliza.
      let guardian = g.dni ? await Guardian.findOne({ where: { dni: g.dni }, transaction }) : null;
      if (guardian) await guardian.update(Object.fromEntries(Object.entries(g).filter(([, v]) => v !== null)), { transaction });
      else guardian = await Guardian.create(g, { transaction });
      const existing = await MemberGuardian.findOne({ where: { memberId, guardianId: guardian.id }, transaction });
      if (existing) throw badRequest('Ese responsable ya está vinculado');
      const count = await MemberGuardian.count({ where: { memberId }, transaction });
      return MemberGuardian.create({ memberId, guardianId: guardian.id, relationship, sortOrder: count }, { transaction });
    });
    res.status(201).json(link);
  }),
);

/** Busca responsables existentes (para vincular hermanos). */
membersRouter.get(
  '/guardians/search',
  ah(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 3) return res.json([]);
    const allowed = unitsWith(req.auth, 'member_contacts', 'edit');
    if (allowed !== 'all' && !allowed.length) throw forbidden();
    const like = `%${q}%`;
    const list = await Guardian.findAll({
      where: { [Op.or]: [{ name: { [Op.iLike]: like } }, { dni: { [Op.iLike]: like } }] },
      include: [{ model: MemberGuardian, as: 'memberLinks', include: [{ model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'unitId'] }] }],
      limit: 10,
    });
    res.json(
      list.map((g) => ({
        id: g.id,
        name: g.name,
        dni: g.dni,
        phone: g.phone,
        email: g.email,
        members: ((g as unknown as { memberLinks?: MemberGuardian[] }).memberLinks ?? [])
          .filter((l) => l.member)
          .map((l) => `${l.member!.firstName} ${l.member!.lastName}`),
      })),
    );
  }),
);

membersRouter.post(
  '/:id/guardians/link',
  authorize('member_contacts', 'edit', memberUnit),
  ah(async (req, res) => {
    const guardianId = String(req.body?.guardianId ?? '');
    const relationship = String(req.body?.relationship ?? '').trim() || null;
    const guardian = await Guardian.findByPk(guardianId);
    if (!guardian) throw notFound('Responsable inexistente');
    if (await MemberGuardian.findOne({ where: { memberId: req.params.id, guardianId } })) throw badRequest('Ese responsable ya está vinculado');
    const count = await MemberGuardian.count({ where: { memberId: req.params.id } });
    res.status(201).json(await MemberGuardian.create({ memberId: req.params.id, guardianId, relationship, sortOrder: count }));
  }),
);

membersRouter.put(
  '/:id/guardians/:linkId',
  authorize('member_contacts', 'edit', memberUnit),
  ah(async (req, res) => {
    const link = await MemberGuardian.findOne({ where: { id: req.params.linkId, memberId: req.params.id } });
    if (!link) throw notFound();
    const { relationship, ...g } = parse(guardianSchema, req.body);
    await sequelize.transaction(async (transaction) => {
      const guardian = await Guardian.findByPk(link.guardianId, { transaction });
      if (guardian) await guardian.update(g, { transaction });
      await link.update({ relationship }, { transaction });
    });
    res.json({ ok: true });
  }),
);

membersRouter.delete(
  '/:id/guardians/:linkId',
  authorize('member_contacts', 'edit', memberUnit),
  ah(async (req, res) => {
    const link = await MemberGuardian.findOne({ where: { id: req.params.linkId, memberId: req.params.id } });
    if (!link) throw notFound();
    await link.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Documentación ----------------
membersRouter.put(
  '/:id/documents',
  authorize('member_documents', 'edit', memberUnit),
  ah(async (req, res) => {
    const data = parse(memberDocumentSchema, req.body);
    const type = await DocumentType.findByPk(data.documentTypeId);
    if (!type || type.appliesTo !== 'member') throw badRequest('Tipo de documento inexistente');
    const values = {
      presented: data.presented,
      // "No corresponde" solo tiene sentido si no se presentó
      notApplicable: !data.presented && data.notApplicable,
      presentedAt: data.presented ? data.presentedAt ?? todayIso() : null,
      expiresAt: data.presented && type.hasExpiry ? data.expiresAt : null,
      notes: data.notes,
    };
    const doc = await MemberDocument.findOne({ where: { memberId: req.params.id, documentTypeId: type.id } });
    if (doc) await doc.update(values);
    else await MemberDocument.create({ memberId: req.params.id, documentTypeId: type.id, ...values });
    res.json({ ok: true });
  }),
);

// ---------------- Afiliación anual ----------------
membersRouter.put(
  '/:id/affiliations',
  authorize('members', 'edit', memberUnit),
  ah(async (req, res) => {
    const data = parse(affiliationSchema, req.body);
    const existing = await Affiliation.findOne({ where: { memberId: req.params.id, year: data.year } });
    if (existing) await existing.update(data);
    else await Affiliation.create({ ...data, memberId: req.params.id });
    res.json({ ok: true });
  }),
);

/**
 * Autorizaciones de madres, padres y tutores firmadas en pantalla (con el dedo) sobre las planillas oficiales de
 * Scouts de Argentina. Se firma en persona, en el dispositivo de un educador de la unidad.
 *  - Firmar: quien carga la documentación de la unidad (member_documents:edit).
 *  - Testigos (ingreso): dos educadores del Grupo; firman en el momento.
 *  - Aval (salidas cercanas y salidas/campamentos) y anular: Jefe/a de Unidad o de Grupo (member_documents:approve).
 * Una autorización firmada no se modifica: si hay un error, se anula y se firma otra.
 */
import { Router, type Request } from 'express';
import { Op, type Transaction } from 'sequelize';
import {
  AUTH_KIND_ANNUAL,
  AUTH_KIND_DOCUMENT,
  AUTH_KINDS,
  AUTH_NEEDS_AVAL,
  AUTH_TEMPLATE_VERSION,
  AUTH_WITNESSES,
  authorizationAvalSchema,
  authorizationPending,
  authorizationSignSchema,
  authorizationVoidSchema,
  authorizationWitnessSchema,
  buildAuthorizationText,
  can,
  GROUP_INFO,
  todayIso,
  unitsWith,
  type AuthKind,
  type AuthorizationContent,
} from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, DocumentType, Guardian, Member, MemberDocument, MemberGuardian, Unit, User } from '../models';
import { SignedAuthorization, type AdultSignature } from '../models/authorizations';
import { Camp, CampEnrollment, CampSite } from '../models/treasury';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { sha256 } from '../lib/security';

export const authorizationsRouter = Router();

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
const unitAttrs = ['id', 'code', 'name', 'branch'];

async function memberOr404(id: string) {
  const m = await Member.findByPk(id, { include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] });
  if (!m) throw notFound('Protagonista inexistente');
  return m;
}
const campPlace = (camp: Camp) => [camp.site?.name, camp.place || camp.site?.address, camp.site?.location].filter(Boolean).join(', ');
const campInfo = (camp: Camp) => ({ id: camp.id, name: camp.name, type: camp.type, startDate: camp.startDate, endDate: camp.endDate, place: campPlace(camp) });
const loadCamp = (id: string) => Camp.findByPk(id, { include: [{ model: CampSite, as: 'site' }] });

/** Adulto del usuario que tiene la sesión (para testigos y aval): nombre, DNI y función de este año. */
async function adultOf(user: User, unitId?: string | null) {
  if (!user.adultId) return null;
  const adult = await Adult.findByPk(user.adultId);
  if (!adult) return null;
  const cargos = await AdultAssignment.findAll({ where: { adultId: adult.id, year: new Date().getFullYear() } });
  const cargo = cargos.find((c) => unitId && c.unitId === unitId) ?? cargos.find((c) => /de grupo/i.test(c.position)) ?? cargos[0];
  return { adult, name: `${adult.firstName} ${adult.lastName}`, dni: digits(adult.dni) || null, function: cargo?.position ?? null };
}

/** Fila liviana (sin los trazos) para listas. */
function row(a: SignedAuthorization, req: Request) {
  const unitId = a.member?.unitId ?? null;
  const active = a.status !== 'anulada';
  return {
    id: a.id,
    kind: a.kind,
    year: a.year,
    status: a.status,
    signedAt: a.signedAt,
    member: a.member ? { id: a.member.id, firstName: a.member.firstName, lastName: a.member.lastName, unit: a.member.unit ?? null } : null,
    camp: a.camp ? { id: a.camp.id, name: a.camp.name } : null,
    signerName: a.content.signer.name,
    signerRole: a.content.signer.role,
    witnesses: a.witnesses.map((w) => w.name),
    avalBy: a.aval?.name ?? null,
    pending: active ? authorizationPending(a.kind, a.witnesses.length, !!a.aval) : null,
    canWitness: active && a.witnesses.length < AUTH_WITNESSES[a.kind] && can(req.auth, 'member_documents', 'edit', unitId),
    canApprove: active && AUTH_NEEDS_AVAL[a.kind] && !a.aval && can(req.auth, 'member_documents', 'approve', unitId),
    canVoid: active && can(req.auth, 'member_documents', 'approve', unitId),
  };
}
const listInclude = [
  { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'unitId'], include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] },
  { model: Camp, as: 'camp', attributes: ['id', 'name'] },
];
const listAttrs = { exclude: ['signature', 'custodySignature'] };

// ---------------- Datos para armar la planilla antes de firmar ----------------
authorizationsRouter.get(
  '/prefill',
  ah(async (req, res) => {
    const kind = String(req.query.kind ?? '') as AuthKind;
    if (!AUTH_KINDS.includes(kind)) throw badRequest('Tipo de autorización inválido');
    const member = await memberOr404(String(req.query.memberId ?? ''));
    if (!can(req.auth, 'member_documents', 'edit', member.unitId)) throw forbidden();
    const campId = String(req.query.campId ?? '');
    const camp = kind === 'campamento' && campId ? await loadCamp(campId) : null;
    if (kind === 'campamento' && !camp) throw badRequest('Falta el campamento o la salida');
    const year = kind === 'campamento' && camp ? Number(camp.startDate.slice(0, 4)) : Number(req.query.year) || new Date().getFullYear();

    const [links, previous, me] = await Promise.all([
      MemberGuardian.findAll({ where: { memberId: member.id }, include: [{ model: Guardian, as: 'guardian' }], order: [['sortOrder', 'ASC']] }),
      SignedAuthorization.findAll({ where: { memberId: member.id, status: { [Op.ne]: 'anulada' } }, order: [['signedAt', 'DESC']], limit: 20 }),
      adultOf(req.user!, member.unitId),
    ]);
    const same = previous.filter((p) => p.kind === kind && (kind === 'campamento' ? p.campId === camp?.id : kind === 'ingreso' || p.year === year));
    res.json({
      kind,
      year,
      today: todayIso(),
      group: GROUP_INFO,
      member: { id: member.id, firstName: member.firstName, lastName: member.lastName, dni: member.dni, birthDate: member.birthDate, address: member.address, unit: member.unit ?? null },
      camp: camp ? campInfo(camp) : null,
      guardians: links.filter((l) => l.guardian).map((l) => ({ name: l.guardian!.name, dni: l.guardian!.dni, phone: l.guardian!.phone, address: l.guardian!.address, relationship: l.relationship })),
      // Lo que ya declaró la última vez, para no volver a escribirlo
      last: previous[0] ? { signer: previous[0].content.signer, minor: previous[0].content.minor, place: previous[0].content.place, range: previous.find((p) => p.content.range)?.content.range ?? null } : null,
      // Ya hay una vigente del mismo tipo (se puede firmar otra igual, por ejemplo del otro progenitor)
      existing: same.map((p) => ({ id: p.id, signerName: p.content.signer.name, signedAt: p.signedAt, status: p.status })),
      attendedBy: { name: me?.name ?? req.user!.name, hasAdult: !!me },
    });
  }),
);

// ---------------- Lista ----------------
authorizationsRouter.get(
  '/',
  ah(async (req, res) => {
    const allowed = unitsWith(req.auth, 'member_documents', 'view');
    if (allowed !== 'all' && !allowed.length) throw forbidden();
    const memberWhere: Record<string, unknown> = {};
    const unitId = String(req.query.unitId ?? '');
    if (unitId) {
      if (allowed !== 'all' && !allowed.includes(unitId)) throw forbidden();
      memberWhere.unitId = unitId;
    } else if (allowed !== 'all') memberWhere.unitId = allowed;
    const where: Record<string, unknown> = {};
    if (req.query.memberId) where.memberId = String(req.query.memberId);
    if (req.query.campId) where.campId = String(req.query.campId);
    if (req.query.kind) where.kind = String(req.query.kind);
    const status = String(req.query.status ?? '');
    if (status === 'pendientes') where.status = 'firmada';
    else if (status) where.status = status;
    else if (req.query.all !== '1') where.status = { [Op.ne]: 'anulada' };
    const list = await SignedAuthorization.findAll({
      where,
      attributes: listAttrs,
      include: [{ ...listInclude[0], where: memberWhere, required: true }, listInclude[1]],
      order: [['signedAt', 'DESC']],
      limit: 500,
    });
    res.json(list.map((a) => row(a, req)));
  }),
);

// ---------------- Ver una (con los trazos, para mostrar e imprimir) ----------------
authorizationsRouter.get(
  '/:id',
  ah(async (req, res) => {
    const a = await SignedAuthorization.findByPk(req.params.id, { include: listInclude });
    if (!a) throw notFound();
    const unitId = a.member?.unitId ?? null;
    // Tiene datos de contacto del responsable: la ve quien carga la documentación o ve los contactos de esa unidad
    if (!can(req.auth, 'member_documents', 'edit', unitId) && !can(req.auth, 'member_contacts', 'view', unitId) && !can(req.auth, 'member_documents', 'approve', unitId)) throw forbidden();
    const me = await adultOf(req.user!, unitId);
    res.json({
      ...row(a, req),
      templateVersion: a.templateVersion,
      content: a.content,
      text: buildAuthorizationText(a.content),
      signature: a.signature,
      custodySignature: a.custodySignature,
      witnessList: a.witnesses,
      aval: a.aval,
      attendedBy: a.attendedBy,
      hash: a.hash,
      voidedAt: a.voidedAt,
      voidReason: a.voidReason,
      me: me ? { adultId: me.adult.id, name: me.name, hasDni: !!me.dni, function: me.function, isWitness: a.witnesses.some((w) => w.adultId === me.adult.id) } : null,
    });
  }),
);

/** Deja presentado (o no) el documento del legajo o la autorización de la inscripción al campamento. */
async function syncLegajo(a: SignedAuthorization, presented: boolean, transaction: Transaction) {
  const date = todayIso();
  if (a.kind === 'campamento') {
    if (!a.campId) return;
    const enr = await CampEnrollment.findOne({ where: { campId: a.campId, memberId: a.memberId }, transaction });
    if (enr) await enr.update({ authorizationPresented: presented, authorizationDate: presented ? date : null }, { transaction });
    return;
  }
  const code = AUTH_KIND_DOCUMENT[a.kind];
  const type = code ? await DocumentType.findOne({ where: { code }, transaction }) : null;
  if (!type) return;
  const values = {
    presented,
    notApplicable: false,
    presentedAt: presented ? date : null,
    expiresAt: presented && type.hasExpiry && AUTH_KIND_ANNUAL[a.kind] ? `${a.year}-12-31` : null,
    notes: presented ? 'Firmada en la app' : 'Se anuló la autorización firmada en la app',
  };
  const doc = await MemberDocument.findOne({ where: { memberId: a.memberId, documentTypeId: type.id }, transaction });
  if (doc) await doc.update(values, { transaction });
  else await MemberDocument.create({ memberId: a.memberId, documentTypeId: type.id, ...values }, { transaction });
}

// ---------------- Firmar ----------------
authorizationsRouter.post(
  '/',
  ah(async (req, res) => {
    const data = parse(authorizationSignSchema, req.body);
    const member = await memberOr404(data.memberId);
    if (!can(req.auth, 'member_documents', 'edit', member.unitId)) throw forbidden();
    const camp = data.kind === 'campamento' ? await loadCamp(data.campId!) : null;
    if (data.kind === 'campamento') {
      if (!camp) throw badRequest('Campamento o salida inexistente');
      if (!(await CampEnrollment.findOne({ where: { campId: camp.id, memberId: member.id } }))) throw badRequest('Primero hay que inscribir al protagonista en el campamento o la salida');
    }
    const me = await adultOf(req.user!, member.unitId);
    const now = new Date();
    const year = camp ? Number(camp.startDate.slice(0, 4)) : AUTH_KIND_ANNUAL[data.kind] ? data.year ?? now.getFullYear() : now.getFullYear();
    const content: AuthorizationContent = {
      kind: data.kind,
      date: todayIso(),
      year,
      place: data.place,
      signer: data.signer,
      minor: { name: `${member.firstName} ${member.lastName}`, nationality: data.minor.nationality, birthDate: member.birthDate ?? null, dni: digits(member.dni) || null, address: data.minor.address },
      group: { number: GROUP_INFO.number, name: GROUP_INFO.name, district: GROUP_INFO.district, zone: GROUP_INFO.zone },
      camp: camp ? { name: camp.name, type: camp.type, startDate: camp.startDate, endDate: camp.endDate, place: campPlace(camp) } : null,
      range: data.kind === 'salidas_cercanas' ? data.range : null,
      custodyNotes: data.kind === 'ingreso' ? data.custodyNotes : null,
    };
    const custodySignature = content.custodyNotes ? data.custodySignature ?? null : null;
    const complete = !AUTH_WITNESSES[data.kind] && !AUTH_NEEDS_AVAL[data.kind];
    // Sello de integridad: si cambia el texto, los datos o el trazo, el código ya no coincide
    const hash = sha256(JSON.stringify({ v: AUTH_TEMPLATE_VERSION, text: buildAuthorizationText(content), content, signature: data.signature, custodySignature, signedAt: now.toISOString() }));

    const created = await sequelize.transaction(async (transaction) => {
      const a = await SignedAuthorization.create(
        {
          kind: data.kind,
          memberId: member.id,
          campId: camp?.id ?? null,
          year,
          templateVersion: AUTH_TEMPLATE_VERSION,
          content,
          signature: data.signature,
          custodySignature,
          aval: null,
          attendedBy: { userId: req.user!.id, name: me?.name ?? req.user!.name, adultId: me?.adult.id ?? null, dni: me?.dni ?? null },
          status: complete ? 'completa' : 'firmada',
          hash,
          signedAt: now,
          userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) || null,
          ip: (req.ip ?? '').slice(0, 60) || null,
          voidedAt: null,
          voidedByUserId: null,
          voidReason: null,
        },
        { transaction },
      );
      await syncLegajo(a, true, transaction);

      // El responsable queda cargado en la ficha (o se actualiza), así la próxima vez no escribe todo de nuevo
      const links = await MemberGuardian.findAll({ where: { memberId: member.id }, include: [{ model: Guardian, as: 'guardian' }], transaction });
      const link = links.find((l) => l.guardian && ((digits(l.guardian.dni) && digits(l.guardian.dni) === data.signer.dni) || fold(l.guardian.name) === fold(data.signer.name)));
      const values = { name: data.signer.name, dni: data.signer.dni, phone: data.signer.phone, address: data.signer.address };
      if (link?.guardian) await link.guardian.update(values, { transaction });
      else {
        // Si ya figura por ser responsable de un hermano, se enlaza el mismo
        const known = (await Guardian.findAll({ where: { dni: { [Op.ne]: null } }, transaction })).find((g) => digits(g.dni) === data.signer.dni);
        const guardian = known ?? (await Guardian.create({ ...values, email: null }, { transaction }));
        if (known) await known.update(values, { transaction });
        await MemberGuardian.create({ memberId: member.id, guardianId: guardian.id, relationship: data.signer.role, sortOrder: links.length }, { transaction });
      }
      if (!member.address) await member.update({ address: data.minor.address }, { transaction });
      return a;
    });
    res.status(201).json({ id: created.id, status: created.status });
  }),
);

/** Autorización vigente (no anulada) para firmar encima: testigo o aval. */
async function activeOr404(id: string, transaction?: Transaction) {
  const a = await SignedAuthorization.findByPk(id, { include: listInclude, transaction, lock: transaction ? { level: transaction.LOCK.UPDATE, of: SignedAuthorization } : undefined });
  if (!a) throw notFound();
  if (a.status === 'anulada') throw badRequest('La autorización está anulada');
  return a;
}
const statusOf = (a: SignedAuthorization, witnesses: number, hasAval: boolean) => (authorizationPending(a.kind, witnesses, hasAval) ? 'firmada' : 'completa');

// ---------------- Testigos (autorización de ingreso) ----------------
authorizationsRouter.post(
  '/:id/witness',
  ah(async (req, res) => {
    const data = parse(authorizationWitnessSchema, req.body);
    const result = await sequelize.transaction(async (transaction) => {
      const a = await activeOr404(req.params.id, transaction);
      if (!can(req.auth, 'member_documents', 'edit', a.member?.unitId ?? null)) throw forbidden();
      if (a.witnesses.length >= AUTH_WITNESSES[a.kind]) throw badRequest('Ya están las firmas de los testigos');
      const mine = await adultOf(req.user!, a.member?.unitId ?? null);
      let who: { adult: Adult; name: string; dni: string | null };
      let onDeviceOf: string | null = null;
      if (data.adultId && data.adultId !== mine?.adult.id) {
        // Otro educador presente, que firma en este mismo dispositivo
        const adult = await Adult.findByPk(data.adultId, { transaction });
        if (!adult) throw badRequest('Revisá los datos', { adultId: 'Adulto inexistente' });
        who = { adult, name: `${adult.firstName} ${adult.lastName}`, dni: digits(adult.dni) || null };
        onDeviceOf = mine?.name ?? req.user!.name;
      } else {
        if (!mine) throw badRequest('Tu usuario no está vinculado a un adulto del Grupo: no podés firmar como testigo');
        who = mine;
      }
      if (a.witnesses.some((w) => w.adultId === who.adult.id)) throw badRequest('Esa persona ya firmó como testigo: el segundo testigo tiene que ser otro educador');
      const witness: AdultSignature = { userId: onDeviceOf ? null : req.user!.id, adultId: who.adult.id, name: who.name, dni: who.dni, signature: data.signature, signedAt: new Date().toISOString(), onDeviceOf };
      const witnesses = [...a.witnesses, witness];
      await a.update({ witnesses, status: statusOf(a, witnesses.length, !!a.aval) }, { transaction });
      return a;
    });
    res.json({ ok: true, status: result.status });
  }),
);

// ---------------- Aval del Jefe/a de Unidad o de Grupo (una firma para una o varias) ----------------
authorizationsRouter.post(
  '/aval',
  ah(async (req, res) => {
    const data = parse(authorizationAvalSchema, req.body);
    const done = await sequelize.transaction(async (transaction) => {
      let n = 0;
      for (const id of [...new Set(data.ids)]) {
        const a = await activeOr404(id, transaction);
        const unitId = a.member?.unitId ?? null;
        if (!can(req.auth, 'member_documents', 'approve', unitId)) throw forbidden('El aval lo da el Jefe/a de Unidad o de Grupo');
        if (!AUTH_NEEDS_AVAL[a.kind]) throw badRequest('Esa autorización no lleva aval');
        if (a.aval) continue;
        const me = await adultOf(req.user!, unitId);
        if (!me || !me.dni) throw badRequest('Para dar el aval, tu usuario tiene que estar vinculado a un adulto del Grupo con DNI cargado');
        const aval: AdultSignature = { userId: req.user!.id, adultId: me.adult.id, name: me.name, dni: me.dni, function: me.function, signature: data.signature, signedAt: new Date().toISOString() };
        await a.update({ aval, status: statusOf(a, a.witnesses.length, true) }, { transaction });
        n++;
      }
      return n;
    });
    res.json({ ok: true, done });
  }),
);

// ---------------- Anular ----------------
authorizationsRouter.post(
  '/:id/void',
  ah(async (req, res) => {
    const data = parse(authorizationVoidSchema, req.body);
    await sequelize.transaction(async (transaction) => {
      const a = await activeOr404(req.params.id, transaction);
      if (!can(req.auth, 'member_documents', 'approve', a.member?.unitId ?? null)) throw forbidden('Anular lo hace el Jefe/a de Unidad o de Grupo');
      await a.update({ status: 'anulada', voidedAt: new Date(), voidedByUserId: req.user!.id, voidReason: data.reason }, { transaction });
      // Si no queda otra vigente del mismo tipo, el legajo vuelve a mostrarla como faltante
      const others = await SignedAuthorization.count({
        where: { id: { [Op.ne]: a.id }, memberId: a.memberId, kind: a.kind, status: { [Op.ne]: 'anulada' }, ...(a.kind === 'campamento' ? { campId: a.campId } : a.kind === 'ingreso' ? {} : { year: a.year }) },
        transaction,
      });
      if (!others) await syncLegajo(a, false, transaction);
    });
    res.json({ ok: true });
  }),
);

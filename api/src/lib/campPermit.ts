/**
 * Datos del Permiso de Acampe de un campamento: lo que se guardó a mano más lo que la app ya sabe (Grupo, cantidades
 * por rama según los inscriptos, Jefe/a de Campo, fechas, primer y último horario del cronograma). Los datos del
 * lugar que todavía no se cargaron se proponen desde el último permiso hecho para el mismo lugar de acampe.
 */
import { Op } from 'sequelize';
import { BRANCHES, CAMP_PERMIT_KEYS, CAMP_PERMIT_PLACE_KEYS, GROUP_INFO, hasProgramWoodBadge, type Branch, type CampPermitValues } from '../shared';
import { Adult, AdultCourse, Course, Member, Unit } from '../models';
import { MeetingItem, MeetingProgram } from '../models/program';
import { Camp, CampEnrollment, CampSite } from '../models/treasury';
import { campUnitIds } from './campProgram';
import type { PermitPdfData } from './campPermitPdf';

type Key = keyof CampPermitValues;
export type PermitForm = Record<Key, string>;
/** Con qué datos del campamento se guardó: si después cambian, lo que dependía de ellos se vuelve a proponer. */
interface Basis {
  chiefAdultId: string | null;
  startDate: string;
  endDate: string;
  campSiteId: string | null;
}
type Stored = Partial<Record<Key, string | number | null>> & { basis?: Basis };

const CHIEF_KEYS: Key[] = ['chiefEmail', 'chiefPhone', 'chiefLevel'];
const DATE_KEYS: Key[] = ['departureDate', 'arrivalDate'];
const text = (x: unknown) => (x === null || x === undefined ? '' : String(x).trim());

/** «Aldo Bonzi, La Matanza, Buenos Aires» → localidad y provincia. */
function splitLocation(location: string | null | undefined) {
  const parts = text(location).split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { locality: parts[0] ?? '', province: '' };
  return { locality: parts.slice(0, -1).join(', '), province: parts[parts.length - 1] };
}
/** «Propietaria: Fulana · 11-5555» → propietario y teléfono. */
function splitContact(contact: string | null | undefined) {
  const c = text(contact);
  const m = /^propietari[oa]s?:\s*(.+?)(?:\s*[·|]\s*(.+))?$/i.exec(c);
  return m ? { owner: m[1].trim(), contact: (m[2] ?? '').trim() } : { owner: '', contact: c };
}
/** Nivel de formación según los cursos cargados. */
function trainingLevel(courses: string[]) {
  if (hasProgramWoodBadge(courses.map((name) => ({ name })))) return 'Insignia de Madera';
  if (courses.some((c) => /insignia de madera/i.test(c))) return 'Insignia de Madera (Gestión)';
  if (courses.some((c) => /intermedi/i.test(c))) return 'Intermedio';
  if (courses.some((c) => /b[aá]sic/i.test(c))) return 'Básico';
  return '';
}
/** Primer horario del primer día y último del último, del cronograma de la unidad que organiza. */
async function scheduleEdges(camp: Camp) {
  const unitIds = await campUnitIds(camp);
  if (!unitIds.length) return { first: '', last: '' };
  const programs = await MeetingProgram.findAll({
    where: { unitId: unitIds[0], date: [camp.startDate, camp.endDate] },
    include: [{ model: MeetingItem, as: 'items', attributes: ['time'] }],
  });
  const times = (date: string) =>
    (programs.find((p) => p.date === date)?.items ?? [])
      .map((i) => (i.time ? i.time.slice(0, 5) : ''))
      // La madrugada (antes de las 5) es el final del día anterior, no un horario de salida o de vuelta
      .filter((t) => t >= '05:00')
      .sort();
  const start = times(camp.startDate);
  const end = times(camp.endDate);
  return { first: start[0] ?? '', last: end[end.length - 1] ?? '' };
}

export async function buildPermit(campId: string) {
  const camp = await Camp.findByPk(campId, {
    include: [
      { model: CampSite, as: 'site' },
      { model: Adult, as: 'responsible', attributes: ['id', 'firstName', 'lastName', 'dni', 'email', 'phone'] },
      { model: Unit, as: 'ownerUnit', attributes: ['id', 'branch'] },
    ],
  });
  if (!camp) return null;
  const stored = (camp.permit ?? null) as Stored | null;
  const basis = stored?.basis;

  // ---- Lo que propone la app ----
  const chief = camp.responsible ?? null;
  const [courses, edges, previous, enrollments] = await Promise.all([
    chief ? AdultCourse.findAll({ where: { adultId: chief.id }, include: [{ model: Course, as: 'course', attributes: ['name'] }] }) : [],
    scheduleEdges(camp),
    camp.campSiteId
      ? Camp.findOne({ where: { campSiteId: camp.campSiteId, id: { [Op.ne]: camp.id }, permit: { [Op.ne]: null } }, order: [['startDate', 'DESC']] })
      : null,
    CampEnrollment.findAll({
      where: { campId: camp.id },
      attributes: ['memberId', 'adultId'],
      include: [{ model: Member, as: 'member', attributes: ['id', 'unitId'], include: [{ model: Unit, as: 'unit', attributes: ['branch'] }] }],
    }),
  ]);
  const loc = splitLocation(camp.site?.location);
  const con = splitContact(camp.site?.contact);
  const proposed: Partial<PermitForm> = {
    transportCompany: text(camp.transportCompany),
    transportPhone: text(camp.transportContact),
    placeLocality: loc.locality,
    placeProvince: loc.province,
    placeAddress: text(camp.site?.address) || (camp.site ? '' : text(camp.place)),
    placeOwner: con.owner,
    placeContact: con.contact,
    campPhone: text(chief?.phone),
    departureDate: camp.startDate,
    departureTime: edges.first,
    arrivalDate: camp.endDate,
    arrivalTime: edges.last,
    chiefEmail: text(chief?.email),
    chiefPhone: text(chief?.phone),
    chiefLevel: trainingLevel(courses.map((c) => c.course?.name ?? '')),
  };
  // Los datos del lugar, del último permiso hecho ahí
  const prev = (previous?.permit ?? null) as Stored | null;
  let copied = false;
  if (prev) {
    for (const k of CAMP_PERMIT_PLACE_KEYS) {
      if (text(prev[k])) {
        proposed[k] = text(prev[k]);
        copied = true;
      }
    }
  }

  // ---- Lo guardado gana, salvo lo que dependía de algo que cambió en el campamento ----
  const stale = new Set<Key>();
  if (stored && basis) {
    if (basis.chiefAdultId !== (camp.responsibleAdultId ?? null)) CHIEF_KEYS.forEach((k) => stale.add(k));
    if (basis.startDate !== camp.startDate || basis.endDate !== camp.endDate) DATE_KEYS.forEach((k) => stale.add(k));
    if (basis.campSiteId !== (camp.campSiteId ?? null)) CAMP_PERMIT_PLACE_KEYS.forEach((k) => stale.add(k));
  }
  const values = {} as PermitForm;
  for (const k of CAMP_PERMIT_KEYS) values[k] = stored && k in stored && !stale.has(k) ? text(stored[k]) : (proposed[k] ?? '');

  // ---- Contingente: sale de los inscriptos ----
  const branches = Object.fromEntries(BRANCHES.map((b) => [b, 0])) as Record<Branch, number>;
  let beneficiaries = 0;
  let leaders = 0;
  for (const e of enrollments) {
    if (e.memberId) {
      beneficiaries++;
      const b = (e.member?.unit?.branch ?? camp.ownerUnit?.branch) as Branch | undefined;
      if (b && b in branches) branches[b]++;
    } else if (e.adultId) leaders++;
  }

  return {
    camp,
    saved: !!stored,
    values,
    /** Si hay datos del lugar tomados del permiso de otro campamento en el mismo lugar. */
    copiedFrom: !stored && copied && previous ? { id: previous.id, name: previous.name } : null,
    auto: {
      group: { number: GROUP_INFO.number, name: GROUP_INFO.name, district: GROUP_INFO.district, zone: GROUP_INFO.zone },
      branches,
      beneficiaries,
      leaders,
      chief: chief ? { id: chief.id, name: `${chief.firstName} ${chief.lastName}`, dni: chief.dni ?? null } : null,
    },
  };
}

/** Lo que se guarda: los datos del formulario y con qué campamento se cargaron. */
export function permitToStore(camp: Camp, data: CampPermitValues): Stored {
  return {
    ...data,
    basis: { chiefAdultId: camp.responsibleAdultId ?? null, startDate: camp.startDate, endDate: camp.endDate, campSiteId: camp.campSiteId ?? null },
  };
}

export function permitPdfData(p: NonNullable<Awaited<ReturnType<typeof buildPermit>>>): PermitPdfData {
  const companions = p.values.companions ? Number(p.values.companions) : null;
  return {
    group: p.auto.group,
    branches: p.auto.branches,
    beneficiaries: p.auto.beneficiaries,
    companions,
    leaders: p.auto.leaders,
    blankCounts: p.auto.beneficiaries + p.auto.leaders === 0,
    chiefName: p.auto.chief?.name ?? '',
    chiefDni: p.auto.chief?.dni ?? '',
    v: p.values,
  };
}

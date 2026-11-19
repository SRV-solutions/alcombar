import { z } from 'zod';
import { BRANCHES, SMALL_GROUP_KINDS } from './branches';
import { ACTIONS } from './permissions';
import {
  ADULT_STATUSES,
  AFFILIATION_STATUSES,
  ATTENDANCE_STATUSES,
  COURSE_KINDS,
  EXPERIENCE_KINDS,
  EXPERIENCE_STATUSES,
  HABILITATION_LEVELS,
  HABILITATION_STATUSES,
  MEMBER_STATUSES,
  TRANSFER_REASONS,
} from './catalogs';
import { parseFlexibleDate } from './dates';

// ---------- helpers ----------
export const reqStr = (max = 200) => z.string({ required_error: 'Requerido' }).trim().min(1, 'Requerido').max(max);
export const optStr = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
/** Enlace opcional (por ejemplo al archivo en el Drive). */
export const optUrl = z
  .union([z.literal(''), z.string().trim().url('URL inválida').max(500)])
  .nullish()
  .transform((v) => (v ? v : null));
/** Rama opcional: '' o null = sin rama. */
export const optBranch = z
  .union([z.enum(BRANCHES), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null);
export const optDate = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    try {
      return parseFlexibleDate(v);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
      return z.NEVER;
    }
  });
export const reqDate = z
  .string({ required_error: 'Requerido' })
  .transform((v, ctx) => {
    try {
      const d = parseFlexibleDate(v);
      if (!d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido' });
        return z.NEVER;
      }
      return d;
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
      return z.NEVER;
    }
  });
export const optUuid = z
  .union([z.literal(''), z.string().uuid()])
  .nullish()
  .transform((v) => (v ? v : null));
export const optEmail = z
  .union([z.literal(''), z.string().trim().toLowerCase().email('Email inválido').max(200)])
  .nullish()
  .transform((v) => (v ? v : null));
export const optDni = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const clean = (v ?? '').replace(/[.\s-]/g, '').trim();
    if (!clean) return null;
    if (!/^[0-9A-Za-z]{6,12}$/.test(clean)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DNI inválido' });
      return z.NEVER;
    }
    return clean.toUpperCase();
  });
export const password = z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(200);

// ---------- auth ----------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});
export const setPasswordSchema = z.object({ token: z.string().min(10), password });
export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email('Email inválido') });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Requerido'), password });
/** Mi perfil: cada usuario edita sus datos (y los de su ficha de adulto, si está vinculada). */
export const profileSchema = z.object({
  name: reqStr(120),
  email: z.string().trim().toLowerCase().email('Email inválido').max(200),
  /** Se pide solo si cambia el email. */
  currentPassword: z.string().max(200).optional(),
  adult: z
    .object({
      firstName: reqStr(80),
      lastName: reqStr(80),
      totem: optStr(80),
      dni: optDni,
      birthDate: optDate,
      phone: optStr(40),
      address: optStr(200),
    })
    .nullish(),
});
export type ProfileInput = z.input<typeof profileSchema>;

// ---------- usuarios y roles ----------
export const userRoleInput = z.object({ roleId: z.string().uuid(), unitId: optUuid });
export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  name: reqStr(120),
  adultId: optUuid,
  roles: z.array(userRoleInput).default([]),
});
export const userUpdateSchema = z.object({
  /** Opcional: solo se manda para corregirlo. */
  email: z.string().trim().toLowerCase().email('Email inválido').optional(),
  name: reqStr(120),
  adultId: optUuid,
  active: z.boolean(),
  roles: z.array(userRoleInput),
});
export const roleSchema = z.object({
  name: reqStr(80),
  description: optStr(500),
  scope: z.enum(['group', 'unit']),
  permissions: z.array(z.object({ module: z.string(), action: z.enum(ACTIONS), unitLimited: z.boolean().default(false) })),
});

// ---------- grupo ----------
export const unitSchema = z.object({
  code: reqStr(12).transform((v) => v.toUpperCase()),
  name: reqStr(120),
  branch: z.enum(BRANCHES),
  kidsPerAdult: z.coerce.number().int().min(1, 'Tiene que ser 1 o más').max(50).nullish().transform((v) => v ?? null),
  active: z.boolean().default(true),
});
export const smallGroupSchema = z.object({
  unitId: z.string().uuid(),
  name: reqStr(80),
  kind: z.enum(SMALL_GROUP_KINDS),
  active: z.boolean().default(true),
});
export const supportTeamSchema = z.object({
  name: reqStr(120),
  description: optStr(500),
  leaderAdultId: optUuid,
  /** Recibe los avisos de altas y bajas para cargar en Cruz del Sur. */
  receivesRegistryAlerts: z.boolean().optional(),
});
export const documentTypeSchema = z.object({
  name: reqStr(120),
  hasExpiry: z.boolean().default(false),
  required: z.boolean().default(true),
  appliesTo: z.enum(['member', 'adult']).default('member'),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export const courseSchema = z.object({
  name: reqStr(160),
  kind: z.enum(COURSE_KINDS),
  totalModules: z.coerce.number().int().min(1).max(50).nullish().or(z.literal('')).transform((v) => (v ? Number(v) : null)),
  active: z.boolean().default(true),
});

// ---------- adultos ----------
export const adultSchema = z.object({
  firstName: reqStr(80),
  lastName: reqStr(80),
  totem: optStr(80),
  dni: optDni,
  birthDate: optDate,
  email: optEmail,
  phone: optStr(40),
  address: optStr(200),
  joinedAt: optDate,
  status: z.enum(ADULT_STATUSES).default('alta'),
  advisorAdultId: optUuid,
  notes: optStr(2000),
});
export const adultAssignmentSchema = z.object({
  year: z.coerce.number().int().min(1950).max(2100),
  position: reqStr(120),
  unitId: optUuid,
  supportTeamId: optUuid,
  /** Rama del cargo cuando no hay unidad (referente de Programa o cargo por asignar). Si no viene, no se toca. */
  branch: z.union([z.enum(BRANCHES), z.literal(''), z.null()]).optional(),
  notes: optStr(500),
});
export const adultCourseSchema = z.object({
  courseId: z.string().uuid(),
  completedAt: optDate,
  modulesDone: z.coerce.number().int().min(0).max(50).nullish().or(z.literal('')).transform((v) => (v === '' || v === null || v === undefined ? null : Number(v))),
  certificateUrl: optUrl,
  /** Insignia de Madera: número de registro SAAC, dónde se otorgó y rama. */
  registryNumber: optStr(30),
  place: optStr(80),
  branch: optBranch,
  notes: optStr(500),
});
export const adultExperienceSchema = z.object({
  name: reqStr(200),
  kind: z.enum(EXPERIENCE_KINDS).default('formacion'),
  /** Quién la dictó: zona, distrito o nivel nacional (por ejemplo «Z1»). */
  organism: optStr(60),
  branch: optBranch,
  date: optDate,
  status: z.enum(EXPERIENCE_STATUSES).default('acreditada'),
  /** Enlace al certificado (en el Drive). */
  certificateUrl: optUrl,
  notes: optStr(500),
});
export const adultHabilitationSchema = z.object({
  level: z.enum(HABILITATION_LEVELS),
  branch: optBranch,
  actDate: optDate,
  book: optStr(20),
  folio: optStr(20),
  status: z.enum(HABILITATION_STATUSES).default('autorizada'),
  notes: optStr(500),
});


// ---------- protagonistas ----------
export const memberSchema = z.object({
  firstName: reqStr(80),
  lastName: reqStr(80),
  dni: optDni,
  birthDate: optDate,
  unitId: z.string({ required_error: 'Requerido' }).uuid('Elegí una unidad'),
  smallGroupId: optUuid,
  joinedAt: optDate,
  promiseDate: optDate,
  address: optStr(200),
  phone: optStr(40),
  email: optEmail,
  status: z.enum(MEMBER_STATUSES).default('activo'),
  notes: optStr(2000),
});
/** Rover en rotación (su último tiempo en la rama). */
export const roverRotationSchema = z.object({ inRotation: z.boolean() });
/** Partida del rover: pasa a ser adulto del Grupo. */
export const departureSchema = z.object({ date: reqDate });

export const guardianSchema = z.object({
  name: reqStr(160),
  relationship: optStr(60),
  dni: optDni,
  phone: optStr(40),
  email: optEmail,
  address: optStr(200),
});
export const transferSchema = z.object({
  toUnitId: z.string().uuid('Elegí una unidad'),
  toSmallGroupId: optUuid,
  date: reqDate,
  reason: z.enum(TRANSFER_REASONS).default('otro'),
  notes: optStr(500),
});
/** Pase de varios protagonistas a la vez. */
export const bulkTransferSchema = transferSchema.extend({
  memberIds: z.array(z.string().uuid()).min(1, 'Elegí al menos un protagonista').max(500),
});
export const memberDocumentSchema = z.object({
  documentTypeId: z.string().uuid(),
  presented: z.boolean(),
  notApplicable: z.boolean().default(false),
  presentedAt: optDate,
  expiresAt: optDate,
  notes: optStr(500),
});
export const affiliationSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(AFFILIATION_STATUSES),
  date: optDate,
  notes: optStr(500),
});
export const attendanceSaveSchema = z.object({
  unitId: z.string().uuid(),
  date: reqDate,
  records: z.array(z.object({ memberId: z.string().uuid(), status: z.enum(ATTENDANCE_STATUSES), notes: optStr(200) })),
});
export const adultAttendanceSaveSchema = z.object({
  date: reqDate,
  records: z.array(z.object({ adultId: z.string().uuid(), status: z.enum(ATTENDANCE_STATUSES), notes: optStr(200) })),
});
export const memberImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullish())).min(1, 'La planilla no tiene filas').max(2000),
});

export type LoginInput = z.input<typeof loginSchema>;
export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
export type RoleInput = z.input<typeof roleSchema>;
export type UnitInput = z.input<typeof unitSchema>;
export type SmallGroupInput = z.input<typeof smallGroupSchema>;
export type SupportTeamInput = z.input<typeof supportTeamSchema>;
export type AdultInput = z.input<typeof adultSchema>;
export type AdultAssignmentInput = z.input<typeof adultAssignmentSchema>;
export type AdultCourseInput = z.input<typeof adultCourseSchema>;
export type AdultExperienceInput = z.input<typeof adultExperienceSchema>;
export type AdultHabilitationInput = z.input<typeof adultHabilitationSchema>;
export type MemberInput = z.input<typeof memberSchema>;
export type GuardianInput = z.input<typeof guardianSchema>;
export type TransferInput = z.input<typeof transferSchema>;
export type MemberDocumentInput = z.input<typeof memberDocumentSchema>;
export type AffiliationInput = z.input<typeof affiliationSchema>;

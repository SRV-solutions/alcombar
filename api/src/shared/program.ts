// Etapas 3 y 4: fichas, ciclos, programa del sábado y progresión. Esquemas Zod, catálogos y utilidades
// compartidas entre API y client.
import { z } from 'zod';
import { BRANCHES, type Branch } from './branches';
import { optDate, optStr, optUuid, reqDate, reqStr } from './schemas';

// ---------------- Catálogos ----------------
export const OPPORTUNITY_TYPES = ['fija', 'variable', 'proyecto', 'descubierta', 'campamento'] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  fija: 'Actividad fija',
  variable: 'Actividad variable',
  proyecto: 'Proyecto',
  descubierta: 'Descubierta',
  campamento: 'Campamento',
};

export const SHEET_SCOPES = ['pequeno_grupo', 'unidad'] as const;
export type SheetScope = (typeof SHEET_SCOPES)[number];
export const SHEET_SCOPE_LABELS: Record<SheetScope, string> = { pequeno_grupo: 'De pequeño grupo', unidad: 'De unidad' };

export const SHEET_STATUSES = ['borrador', 'en_revision', 'aprobada', 'realizada', 'evaluada'] as const;
export type SheetStatus = (typeof SHEET_STATUSES)[number];
export const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  realizada: 'Realizada',
  evaluada: 'Evaluada',
};

/** Acciones sobre el estado de una ficha. */
export const SHEET_ACTIONS = ['enviar', 'aprobar', 'devolver', 'realizada'] as const;
export type SheetAction = (typeof SHEET_ACTIONS)[number];

export const CYCLE_PHASES = ['revisar', 'elegir', 'organizar', 'realizar'] as const;
export type CyclePhase = (typeof CYCLE_PHASES)[number];
export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  revisar: 'Revisar',
  elegir: 'Elegir',
  organizar: 'Organizar',
  realizar: 'Realizar',
};

export const COMPETENCY_STATUSES = ['elegida', 'en_proceso', 'lograda'] as const;
export type CompetencyStatus = (typeof COMPETENCY_STATUSES)[number];
export const COMPETENCY_STATUS_LABELS: Record<CompetencyStatus, string> = {
  elegida: 'Elegida',
  en_proceso: 'En proceso',
  lograda: 'Lograda',
};

/** Nombre del campo "Marco de exploración" en cada rama (a confirmar con las guías de cada rama). */
export const EXPLORATION_LABEL: Record<Branch, string> = {
  castores: 'Marco simbólico',
  lobatos: 'Marco simbólico',
  scouts: 'Marco de exploración',
  caminantes: 'Marco simbólico',
  rovers: 'Marco simbólico',
};

/** Encabezado de los objetivos de la ficha según la rama. */
export const OBJECTIVES_HEADER: Record<Branch, string> = {
  castores: 'Que el Castor logre:',
  lobatos: 'Que el Lobato / la Lobezna logre:',
  scouts: 'Que el/la Scout logre:',
  caminantes: 'Que el/la Caminante logre:',
  rovers: 'Que el/la Rover logre:',
};

/** Estándares anuales de la Unidad Scout (guía de la rama). */
export const SCOUT_STANDARDS = { descubiertas: 3, proyectos: 2, noches: 4 };
/** Competencias que se eligen por etapa (Cartas de Exploración). */
export const COMPETENCIES_PER_STAGE = { min: 12, max: 14 };

/** "1. Nombre", "1) Nombre", "1 - Nombre" o "Nombre" → { number, name }. */
export function parseCompetencyLines(text: string): { number: number | null; name: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d{1,3})\s*[.)\-–:]\s*(.+)$/);
      return m ? { number: Number(m[1]), name: m[2].trim() } : { number: null, name: l };
    })
    .filter((c) => c.name.length > 0)
    .map((c) => ({ ...c, name: c.name.slice(0, 200) }));
}

// ---------------- Helpers de validación ----------------
const optInt = (min: number, max: number) =>
  z
    .union([z.literal(''), z.coerce.number().int().min(min).max(max)])
    .nullish()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)));
const lines = (max = 40) =>
  z
    .array(z.string().trim().max(500))
    .max(max)
    .default([])
    .transform((a) => a.filter(Boolean));
const branch = z.enum(BRANCHES);

// ---------------- Fichas ----------------
export const sheetSchema = z
  .object({
    unitId: z.string({ required_error: 'Elegí la unidad' }).uuid('Elegí la unidad'),
    name: reqStr(160),
    ageMin: optInt(3, 30),
    ageMax: optInt(3, 30),
    areaId: optUuid,
    participants: optInt(0, 500),
    objectives: lines(),
    competencyIds: z.array(z.string().uuid()).max(30).default([]),
    exploration: optStr(4000),
    description: optStr(20000),
    closing: optStr(6000),
    otherEducators: optStr(6000),
    materials: lines(60),
    responsibleAdultId: optUuid,
    date: optDate,
    place: optStr(200),
    durationMin: optInt(0, 100000),
    opportunityType: z.enum(OPPORTUNITY_TYPES).default('variable'),
    scope: z.enum(SHEET_SCOPES).default('unidad'),
    cycleId: optUuid,
    outside: z.boolean().default(false),
    safety: optStr(6000),
    nights: optInt(0, 60),
  })
  .superRefine((v, ctx) => {
    if (v.outside && !v.safety) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['safety'], message: 'Si es fuera de la sede, completá los riesgos y las medidas' });
    }
    if (v.ageMin !== null && v.ageMax !== null && v.ageMin > v.ageMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ageMax'], message: 'La edad máxima es menor que la mínima' });
    }
  });
export type SheetInput = z.input<typeof sheetSchema>;

export const sheetActionSchema = z.object({ action: z.enum(SHEET_ACTIONS), comment: optStr(2000) });
export const sheetEvaluationSchema = z.object({ worked: optStr(6000), change: optStr(6000), attendance: optInt(0, 500) });
export const sheetDuplicateSchema = z.object({ unitId: z.string().uuid('Elegí la unidad') });

// ---------------- Ciclos ----------------
export const cycleSchema = z
  .object({
    unitId: z.string({ required_error: 'Elegí la unidad' }).uuid('Elegí la unidad'),
    name: reqStr(120),
    startDate: optDate,
    endDate: optDate,
    phase: z.enum(CYCLE_PHASES).default('revisar'),
    diagnosis: optStr(10000),
    purposes: optStr(10000),
    evaluation: optStr(10000),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && v.startDate > v.endDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La fecha de fin es anterior al inicio' });
    }
  });
export type CycleInput = z.input<typeof cycleSchema>;

// ---------------- Programa del sábado ----------------
export const meetingItemSchema = z
  .object({
    time: z
      .union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)')])
      .nullish()
      .transform((v) => (v ? v : null)),
    activitySheetId: optUuid,
    title: optStr(200),
    responsibleAdultId: optUuid,
    durationMin: optInt(0, 600),
    notes: optStr(500),
  })
  .refine((v) => v.activitySheetId || v.title, { message: 'Poné una ficha o un título', path: ['title'] });
export const meetingSchema = z.object({
  unitId: z.string().uuid('Elegí la unidad'),
  date: reqDate,
  notes: optStr(2000),
  items: z.array(meetingItemSchema).max(40),
});

// ---------------- Catálogos de rama ----------------
export const areaSchema = z.object({ branch, name: reqStr(80), sortOrder: optInt(0, 99) });
export const competencySchema = z.object({
  branch,
  areaId: optUuid,
  number: optInt(1, 999),
  name: reqStr(200),
  description: optStr(4000),
  requiredChallenges: lines(),
  optionalChallenges: lines(),
  active: z.boolean().default(true),
});
export const competencyBulkSchema = z.object({
  branch,
  areaId: optUuid,
  text: z.string().min(1, 'Pegá al menos una competencia').max(30000),
});
export const schemeSchema = z.object({ branch, name: reqStr(80), version: z.coerce.number().int().min(1).max(99).default(1), active: z.boolean().default(true) });
export const stageSchema = z.object({ name: reqStr(80), description: optStr(2000) });
export const specialtySchema = z.object({
  name: reqStr(120),
  description: optStr(2000),
  /** Rama (vacía = para todas las ramas) y área de desarrollo */
  branch: z.enum(BRANCHES).nullable().optional().transform((v) => v ?? null),
  areaId: optUuid,
  active: z.boolean().default(true),
});

// ---------------- Progresión de cada protagonista ----------------
export const memberMomentsSchema = z.object({
  ambientacionSince: optDate,
  transition: z.boolean().default(false),
  transitionNotes: optStr(2000),
  notes: optStr(4000),
});
export const memberStageSchema = z.object({
  stageId: z.string().uuid('Elegí la etapa'),
  startedAt: optDate,
  insigniaAt: optDate,
  endedAt: optDate,
  notes: optStr(2000),
});
export const chooseCompetenciesSchema = z.object({
  competencyIds: z.array(z.string().uuid()).min(1, 'Elegí al menos una competencia').max(30),
  memberStageId: optUuid,
});
export const memberCompetencySchema = z.object({
  status: z.enum(COMPETENCY_STATUSES),
  achievedAt: optDate,
  notes: optStr(4000),
});
export const memberRoleSchema = z.object({ cycleId: optUuid, role: reqStr(80), notes: optStr(1000) });
export const cycleReviewSchema = z.object({
  cycleId: optUuid,
  date: optDate,
  selfReview: optStr(6000),
  peersReview: optStr(6000),
  educatorReview: optStr(6000),
});
export const memberSpecialtySchema = z.object({ specialtyId: z.string().uuid('Elegí la especialidad'), achievedAt: optDate, notes: optStr(1000) });

// ---- Seguimiento de la progresión (notas de los adultos) ----
export const progressionNoteSchema = z.object({ date: reqDate, note: reqStr(3000) });
export type ProgressionNoteInput = z.infer<typeof progressionNoteSchema>;

// ---- Mover protagonistas de pequeño grupo (patrulla, seisena, equipo) ----
export const moveSmallGroupSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1, 'Elegí al menos un protagonista').max(200),
  /** null = sin pequeño grupo */
  smallGroupId: z.string().uuid().nullable(),
});
export type MoveSmallGroupInput = z.infer<typeof moveSmallGroupSchema>;

// ---- Ramas cuya propuesta de progresión todavía no está publicada ----
export const BRANCHES_COMING_SOON: readonly string[] = ['castores'];
export const isComingSoon = (branch: string | null | undefined) => !!branch && BRANCHES_COMING_SOON.includes(branch);
export const COMING_SOON_TEXT = 'Próximamente: la propuesta de progresión de esta rama todavía no está publicada.';

/** Con qué herramienta elige cada protagonista sus competencias, según la guía de su rama. */
export const PROGRESSION_TOOL: Record<string, string | null> = {
  castores: null,
  lobatos: 'Rastros',
  scouts: 'Cartas de Exploración',
  caminantes: 'Diario de Marcha',
  rovers: 'Plan Personal',
};

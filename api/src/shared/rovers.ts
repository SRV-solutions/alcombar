import { z } from 'zod';

/** Comunidad Rover: Plan Personal, proyectos y mingas, y Asamblea. Vocabulario de la Guía de la Rama Rovers. */

// ---- Plan Personal ----
export const GOAL_STATUSES = ['en_curso', 'lograda', 'dejada'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = { en_curso: 'En curso', lograda: 'Lograda', dejada: 'La dejé' };

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
const optDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .nullish()
  .or(z.literal(''))
  .transform((v) => (v ? v : null));
const optId = z
  .string()
  .uuid()
  .nullish()
  .or(z.literal(''))
  .transform((v) => (v ? v : null));

export const roverPlanSchema = z.object({ vision: optText(4000) });

/**
 * «Hacer un alto en el camino»: la evaluación periódica del Plan Personal (herramienta de la Rama en Rumbo Sur).
 * Cada tanto el rover mira cómo viene, lo conversa con su Comunidad y sus educadores, y ajusta el Plan.
 */
export const PLAN_REVIEW_QUESTIONS = [
  { key: 'path', label: '¿Cómo fue el camino transitado?' },
  { key: 'learned', label: '¿Qué aprendiste en este tiempo?' },
  { key: 'feedback', label: '¿Qué te dijeron las personas con quienes hiciste la evaluación?' },
  { key: 'keep', label: '¿Qué querés conservar de esta etapa?' },
  { key: 'drop', label: '¿Qué querés dejar atrás?' },
  { key: 'improve', label: '¿Qué podés mejorar, y cómo?' },
  { key: 'help', label: 'Para mejorar, ¿necesitás ayuda? ¿De quiénes?' },
] as const;
export type PlanReviewKey = (typeof PLAN_REVIEW_QUESTIONS)[number]['key'];
export type PlanReviewAnswers = Partial<Record<PlanReviewKey, string>>;
const answer = z.string().trim().max(3000).optional().default('');
export const roverPlanReviewSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    answers: z.object({ path: answer, learned: answer, feedback: answer, keep: answer, drop: answer, improve: answer, help: answer }),
  })
  .refine((d) => Object.values(d.answers).some((v) => v), { message: 'Respondé al menos una pregunta', path: ['answers'] });
export const roverGoalSchema = z.object({
  title: z.string().trim().min(1, 'Escribí la meta').max(300),
  areaId: optId,
  competencyId: optId,
  actions: z
    .array(z.object({ text: z.string().trim().min(1).max(300), done: z.boolean().default(false) }))
    .max(30)
    .default([]),
  resources: optText(2000),
  dueDate: optDate,
  status: z.enum(GOAL_STATUSES).default('en_curso'),
  reflection: optText(3000),
});
export type RoverGoalInput = z.input<typeof roverGoalSchema>;
export interface RoverGoalAction {
  text: string;
  done: boolean;
}

// ---- Proyectos y mingas ----
export const PROJECT_KINDS = ['proyecto', 'minga'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = { proyecto: 'Proyecto', minga: 'Minga' };

/** Campos de acción prioritarios de la Rama. */
export const PROJECT_FIELDS = ['solidaridad', 'naturaleza', 'viaje', 'trabajo', 'cultura'] as const;
export type ProjectField = (typeof PROJECT_FIELDS)[number];
export const PROJECT_FIELD_LABELS: Record<ProjectField, string> = {
  solidaridad: 'Solidaridad',
  naturaleza: 'Naturaleza',
  viaje: 'Viaje',
  trabajo: 'Trabajo',
  cultura: 'Cultura',
};

export const PROJECT_SCOPES = ['comunidad', 'equipo', 'individual'] as const;
export type ProjectScope = (typeof PROJECT_SCOPES)[number];
export const PROJECT_SCOPE_LABELS: Record<ProjectScope, string> = { comunidad: 'De toda la Comunidad', equipo: 'De un equipo', individual: 'Individual' };

export const PROJECT_STATUSES = ['borrador', 'postulado', 'reformular', 'aprobado', 'en_curso', 'terminado'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  borrador: 'Borrador',
  postulado: 'En Asamblea',
  reformular: 'A reformular',
  aprobado: 'Aprobado',
  en_curso: 'En marcha',
  terminado: 'Terminado',
};
/** Un renglón del cuadro de actividades de la plantilla de la Minga. */
export const projectActivitySchema = z.object({
  activity: z.string().trim().min(1).max(300),
  responsible: z.string().trim().max(160).optional().default(''),
  resources: z.string().trim().max(400).optional().default(''),
  when: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(600).optional().default(''),
});
export type ProjectActivity = z.infer<typeof projectActivitySchema>;

/** Mientras está en borrador o volvió de la Asamblea, la ficha se puede editar y postular. */
export const projectIsEditable = (s: string) => s === 'borrador' || s === 'reformular';

export const roverProjectSchema = z.object({
  kind: z.enum(PROJECT_KINDS),
  title: z.string().trim().min(1, 'Ponele un nombre').max(200),
  field: z
    .enum(PROJECT_FIELDS)
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  scope: z
    .enum(PROJECT_SCOPES)
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  what: optText(4000),
  why: optText(4000),
  howWhere: optText(4000),
  forWhom: optText(2000),
  startDate: optDate,
  endDate: optDate,
  schedule: optText(4000),
  cost: optText(2000),
  funding: optText(2000),
  needs: optText(2000),
  celebration: optText(2000),
  // Plantilla de organización de una Minga (y el «con quiénes» de la ficha de proyecto)
  supportTeam: optText(1000),
  expectedResult: optText(2000),
  roversEstimate: z
    .union([z.number().int().min(0).max(999), z.string().trim().regex(/^\d{0,3}$/, 'Poné un número')])
    .nullish()
    .transform((v) => (v === '' || v == null ? null : Number(v))),
  allies: optText(2000),
  roles: optText(2000),
  activities: z.array(projectActivitySchema).max(40).default([]),
  tools: optText(2000),
  outreach: optText(2000),
  media: optText(1000),
  slogan: optText(300),
  /** Una minga puede ser parte de un proyecto. */
  parentProjectId: optId,
});
export type RoverProjectInput = z.input<typeof roverProjectSchema>;

export const roverProjectPersonSchema = z
  .object({ memberId: optId, adultId: optId })
  .refine((d) => Boolean(d.memberId) !== Boolean(d.adultId), { message: 'Elegí a quién sumar' });
export const roverProjectProgressSchema = z.object({
  status: z.enum(['aprobado', 'en_curso', 'terminado']),
  finalReport: optText(6000),
  learnings: optText(4000),
  impact: optText(4000),
  nextSteps: optText(4000),
  recordLink: z
    .string()
    .trim()
    .max(500)
    .regex(/^(https?:\/\/\S+)?$/i, 'Pegá un enlace que empiece con https://')
    .nullish()
    .transform((v) => (v ? v : null)),
});

// ---- Asamblea ----
export const VOTES = ['si', 'no', 'abstencion'] as const;
export type Vote = (typeof VOTES)[number];
export const VOTE_LABELS: Record<Vote, string> = { si: 'A favor', no: 'En contra', abstencion: 'Me abstengo' };
export const ITEM_STATUSES = ['pendiente', 'votando', 'aprobado', 'no_aprobado'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Para qué se convoca: conviene no mezclar objetivos en una misma Asamblea. */
export const ASSEMBLY_PURPOSES = ['decisiones', 'informacion', 'analisis', 'consulta', 'negociacion', 'organizacion'] as const;
export type AssemblyPurpose = (typeof ASSEMBLY_PURPOSES)[number];
export const ASSEMBLY_PURPOSE_LABELS: Record<AssemblyPurpose, string> = {
  decisiones: 'Tomar decisiones',
  informacion: 'Informar',
  analisis: 'Analizar un problema',
  consulta: 'Consultar',
  negociacion: 'Llegar a un acuerdo',
  organizacion: 'Organizar o planificar',
};
const assemblyInfo = {
  purpose: z
    .enum(ASSEMBLY_PURPOSES)
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  agenda: optText(4000),
  chairMemberId: optId,
};
export const assemblyOpenSchema = z.object({ unitId: z.string().uuid(), ...assemblyInfo });
export const assemblyInfoSchema = z.object(assemblyInfo);
export const assemblyPresentSchema = z.object({ memberId: z.string().uuid(), present: z.boolean() });
export const assemblyItemSchema = z.object({ projectId: z.string().uuid() });
export const assemblyVoteSchema = z.object({ vote: z.enum(VOTES), memberId: optId });
export const assemblyCloseSchema = z.object({ notes: optText(6000) });

// ---- Sobre el Grupo ----
export const groupPageSchema = z.object({ title: z.string().trim().min(1, 'Ponele un título').max(160), body: optText(40000) });
export const groupPageOrderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

/** Se aprueba con más de la mitad de los presentes a favor (las abstenciones y los que no votan no suman). */
export const votePasses = (yes: number, present: number) => present > 0 && yes * 2 > present;

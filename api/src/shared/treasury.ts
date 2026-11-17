// Etapas 5 y 6: contabilidad, cuotas, eventos y campamentos. Esquemas Zod, catálogos y utilidades compartidas entre API y client.
import { z } from 'zod';
import { optDate, optStr, optUuid, reqDate, reqStr } from './schemas';

// ---------------- Catálogos ----------------
export const ACCOUNT_TYPES = ['efectivo', 'banco', 'billetera'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { efectivo: 'Efectivo', banco: 'Banco', billetera: 'Billetera virtual' };

export const MOVEMENT_KINDS = ['ingreso', 'egreso'] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];
export const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = { ingreso: 'Ingreso', egreso: 'Egreso' };

export const CHARGE_CONCEPTS = ['cuota', 'afiliacion', 'campamento', 'otro'] as const;
export type ChargeConcept = (typeof CHARGE_CONCEPTS)[number];
export const CHARGE_CONCEPT_LABELS: Record<ChargeConcept, string> = {
  cuota: 'Cuota',
  afiliacion: 'Afiliación',
  campamento: 'Campamento',
  otro: 'Otro',
};
/** Categoría contable (código) donde entra el pago de cada concepto. */
export const CHARGE_CONCEPT_CATEGORY: Record<ChargeConcept, string> = {
  cuota: 'cuotas',
  afiliacion: 'afiliaciones',
  campamento: 'campamentos',
  otro: 'otros_ingresos',
};

export const CHARGE_STATUSES = ['pendiente', 'parcial', 'pagado', 'anulado'] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];
export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
  anulado: 'Anulado',
};

export const PAYMENT_METHODS = ['efectivo', 'transferencia', 'mercadopago', 'otro'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
  otro: 'Otro',
};

export const EVENT_TYPES = ['fogon', 'aniversario', 'recaudacion', 'otro'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  fogon: 'Fogón',
  aniversario: 'Festival aniversario',
  recaudacion: 'Evento de recaudación',
  otro: 'Otro',
};
export const EVENT_STATUSES = ['planificacion', 'en_curso', 'rendido'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planificacion: 'En planificación',
  en_curso: 'En curso',
  rendido: 'Rendido',
};

export const CAMP_TYPES = ['campamento', 'acantonamiento', 'salida'] as const;
export type CampType = (typeof CAMP_TYPES)[number];
export const CAMP_TYPE_LABELS: Record<CampType, string> = {
  campamento: 'Campamento',
  acantonamiento: 'Acantonamiento',
  salida: 'Salida de unidad',
};
export const CAMP_STATUSES = ['borrador', 'aprobado', 'realizado', 'rendido'] as const;
export type CampStatus = (typeof CAMP_STATUSES)[number];
export const CAMP_STATUS_LABELS: Record<CampStatus, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  realizado: 'Realizado',
  rendido: 'Rendido',
};
export const CAMP_RUBROS = ['traslado', 'comida', 'predio', 'materiales', 'contingencias', 'otro'] as const;
export type CampRubro = (typeof CAMP_RUBROS)[number];
export const CAMP_RUBRO_LABELS: Record<CampRubro, string> = {
  traslado: 'Traslado',
  comida: 'Comida',
  predio: 'Predio',
  materiales: 'Materiales',
  contingencias: 'Contingencias',
  otro: 'Otro',
};
export const MEALS = ['desayuno', 'almuerzo', 'merienda', 'cena'] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABELS: Record<Meal, string> = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena' };

export const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------------- Utilidades ----------------
/** Redondeo a centavos. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "$ 12.345,67" */
export function formatMoney(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Noches de un campamento (fin − inicio). */
export function campNights(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00Z').getTime();
  const b = new Date(end + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

// ---------------- Esquemas ----------------
const amount = z.coerce.number({ invalid_type_error: 'Monto inválido' }).min(0, 'No puede ser negativo').max(99_999_999, 'Monto demasiado grande');
const positiveAmount = z.coerce.number({ invalid_type_error: 'Monto inválido' }).positive('Tiene que ser mayor a 0').max(99_999_999, 'Monto demasiado grande');
const optUrl = z
  .union([z.literal(''), z.string().trim().url('Enlace inválido').max(500)])
  .nullish()
  .transform((v) => (v ? v : null));
const pct = z.coerce.number().int().min(0).max(100);

export const accountSchema = z.object({
  name: reqStr(80),
  type: z.enum(ACCOUNT_TYPES),
  holder: optStr(120),
  initialBalance: amount.default(0),
  initialDate: optDate,
  active: z.boolean().default(true),
  notes: optStr(500),
});
export const categorySchema = z.object({
  name: reqStr(80),
  kind: z.enum(MOVEMENT_KINDS),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export const transactionSchema = z.object({
  date: reqDate,
  kind: z.enum(MOVEMENT_KINDS),
  accountId: z.string({ required_error: 'Elegí la cuenta' }).uuid('Elegí la cuenta'),
  categoryId: z.string({ required_error: 'Elegí la categoría' }).uuid('Elegí la categoría'),
  amount: positiveAmount,
  description: optStr(300),
  receiptUrl: optUrl,
  eventId: optUuid,
  campId: optUuid,
  campRubro: z
    .union([z.literal(''), z.enum(CAMP_RUBROS)])
    .nullish()
    .transform((v) => (v ? v : null)),
});
export const accountTransferSchema = z.object({
  date: reqDate,
  fromAccountId: z.string().uuid('Elegí la cuenta de origen'),
  toAccountId: z.string().uuid('Elegí la cuenta de destino'),
  amount: positiveAmount,
  description: optStr(300),
});
export const voidSchema = z.object({ date: optDate, reason: optStr(300) });
export const periodCloseSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  notes: optStr(500),
});
export const budgetSchema = z.object({
  notes: optStr(1000),
  lines: z.array(z.object({ categoryId: z.string().uuid(), amount, notes: optStr(300) })),
});

export const feePlanSchema = z.object({
  monthlyAmount: amount,
  months: z.array(z.coerce.number().int().min(1).max(12)).max(12),
  affiliationAmount: amount,
  siblingDiscountPct: pct.default(0),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  notes: optStr(500),
});
export const feeSettingSchema = z.object({ discountPct: pct, note: optStr(300) });
export const generateChargesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).nullish(),
  concept: z.enum(['cuota', 'afiliacion']),
  unitId: optUuid,
});
export const chargeSchema = z.object({
  concept: z.enum(CHARGE_CONCEPTS),
  period: optStr(7),
  description: optStr(200),
  amount: positiveAmount,
  dueDate: optDate,
});
export const paymentSchema = z.object({
  date: reqDate,
  amount: positiveAmount,
  method: z.enum(PAYMENT_METHODS),
  accountId: z.string({ required_error: 'Elegí la cuenta' }).uuid('Elegí la cuenta'),
  chargeIds: z.array(z.string().uuid()).default([]),
  payerName: optStr(160),
  notes: optStr(500),
});

export const eventSchema = z.object({
  name: reqStr(160),
  type: z.enum(EVENT_TYPES),
  date: optDate,
  place: optStr(200),
  responsibleAdultId: optUuid,
  status: z.enum(['planificacion', 'en_curso']).default('planificacion'),
  description: optStr(2000),
});
export const eventTaskSchema = z.object({
  kind: z.enum(['tarea', 'compra']).default('tarea'),
  title: reqStr(200),
  responsibleAdultId: optUuid,
  dueDate: optDate,
  done: z.boolean().default(false),
  notes: optStr(500),
});
export const eventBudgetLineSchema = z.object({ concept: reqStr(160), kind: z.enum(MOVEMENT_KINDS), planned: amount });
export const renderSchema = z.object({ resultNotes: optStr(3000), evaluation: optStr(3000) });

export const campSiteSchema = z.object({
  name: reqStr(160),
  location: optStr(200),
  address: optStr(200),
  contact: optStr(200),
  capacity: z.coerce.number().int().min(0).max(100000).nullish().or(z.literal('')).transform((v) => (v === '' || v == null ? null : Number(v))),
  services: optStr(2000),
  link: optUrl,
  notes: optStr(2000),
});
export const campSchema = z
  .object({
    name: reqStr(160),
    type: z.enum(CAMP_TYPES),
    ownerUnitId: optUuid,
    unitIds: z.array(z.string().uuid()).default([]),
    startDate: reqDate,
    endDate: reqDate,
    campSiteId: optUuid,
    place: optStr(200),
    responsibleAdultId: optUuid,
    cost: amount.default(0),
    description: optStr(3000),
    transportCompany: optStr(160),
    transportContact: optStr(160),
    transportSchedule: optStr(200),
    transportNotes: optStr(2000),
    materials: optStr(3000),
  })
  .refine((c) => c.endDate >= c.startDate, { path: ['endDate'], message: 'Tiene que ser igual o posterior al inicio' });
export const enrollSchema = z.object({
  memberIds: z.array(z.string().uuid()).default([]),
  adultIds: z.array(z.string().uuid()).default([]),
  /** Inscribe a todos los protagonistas activos de las unidades participantes. */
  allFromUnits: z.boolean().default(false),
});
export const enrollmentSchema = z.object({
  cost: amount,
  discountPct: pct,
  authorizationPresented: z.boolean(),
  authorizationDate: optDate,
  dniPresented: z.boolean(),
  notes: optStr(500),
});
export const campBudgetLineSchema = z.object({ rubro: z.enum(CAMP_RUBROS), concept: reqStr(160), planned: amount });
export const campMenuSchema = z.object({ day: optDate, meal: z.enum(MEALS), dish: reqStr(200), notes: optStr(500) });
export const campShoppingSchema = z.object({ item: reqStr(200), quantity: optStr(80), bought: z.boolean().default(false), notes: optStr(500) });
export const campRenderSchema = z.object({
  resultNotes: optStr(3000),
  siteRating: z.coerce.number().int().min(1).max(5).nullish().or(z.literal('')).transform((v) => (v === '' || v == null ? null : Number(v))),
  siteReview: optStr(3000),
});

export type AccountInput = z.input<typeof accountSchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type FeePlanInput = z.input<typeof feePlanSchema>;
export type PaymentInput = z.input<typeof paymentSchema>;
export type EventInput = z.input<typeof eventSchema>;
export type CampInput = z.input<typeof campSchema>;
export type CampSiteInput = z.input<typeof campSiteSchema>;

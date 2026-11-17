// Etapas 7 y 8: inventario, calendario, actas y documentos. Esquemas Zod, catálogos y utilidades compartidas entre API y client.
import { z } from 'zod';
import { optDate, optStr, optUuid, reqDate, reqStr } from './schemas';

// ======================= Inventario =======================
export const ITEM_CONDITIONS = ['nuevo', 'bueno', 'regular', 'malo', 'fuera_de_uso'] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];
export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  nuevo: 'Nuevo',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
  fuera_de_uso: 'Fuera de uso',
};
/** Estados que disparan la alerta de "bienes en mal estado". */
export const BAD_CONDITIONS: ItemCondition[] = ['malo', 'fuera_de_uso'];

export const LOAN_STATUSES = ['pedido', 'autorizado', 'entregado', 'devuelto', 'cancelado'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  pedido: 'Pedido',
  autorizado: 'Autorizado',
  entregado: 'Entregado',
  devuelto: 'Devuelto',
  cancelado: 'Cancelado',
};
/** Préstamos que ocupan stock (lo reservado y lo que está afuera). */
export const ACTIVE_LOAN_STATUSES: LoanStatus[] = ['autorizado', 'entregado'];

/** Vencido: no se devolvió y ya pasó la fecha prevista. */
export function isLoanOverdue(loan: { status: string; dueDate: string | null }, todayIso: string): boolean {
  return (loan.status === 'autorizado' || loan.status === 'entregado') && !!loan.dueDate && loan.dueDate < todayIso;
}

const optUrl = z
  .union([z.literal(''), z.string().trim().url('Enlace inválido (tiene que empezar con https://)').max(500)])
  .nullish()
  .transform((v) => (v ? v : null));
const optMoney = z
  .union([z.literal(''), z.coerce.number().min(0, 'No puede ser negativo').max(1_000_000_000)])
  .nullish()
  .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)));

export const itemCategorySchema = z.object({
  name: reqStr(80),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});
export const itemLocationSchema = z.object({
  name: reqStr(80),
  description: optStr(300),
  active: z.boolean().default(true),
});
export const itemSchema = z.object({
  name: reqStr(160),
  categoryId: z.string({ required_error: 'Elegí una categoría' }).uuid('Elegí una categoría'),
  quantity: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).int('Tiene que ser un número entero').min(0).max(100000),
  condition: z.enum(ITEM_CONDITIONS).default('bueno'),
  locationId: optUuid,
  unitId: optUuid,
  photoUrl: optUrl,
  purchaseDate: optDate,
  purchaseValue: optMoney,
  notes: optStr(2000),
});

export const loanSchema = z
  .object({
    borrowerAdultId: optUuid,
    borrowerName: optStr(160),
    purpose: reqStr(300),
    unitId: optUuid,
    activitySheetId: optUuid,
    campId: optUuid,
    outDate: reqDate,
    dueDate: reqDate,
    notes: optStr(2000),
    items: z
      .array(z.object({ itemId: z.string().uuid(), quantity: z.coerce.number().int().min(1, 'Mínimo 1').max(100000) }))
      .min(1, 'Agregá al menos un bien'),
  })
  .refine((d) => d.borrowerAdultId || d.borrowerName, { path: ['borrowerName'], message: 'Indicá quién lo retira' })
  .refine((d) => d.dueDate >= d.outDate, { path: ['dueDate'], message: 'La devolución tiene que ser después del retiro' });

export const loanReturnSchema = z.object({
  returnedAt: reqDate,
  returnNotes: optStr(2000),
  /** Si es true, el estado al devolver de cada ítem actualiza el estado del bien. */
  updateItemCondition: z.boolean().default(true),
  items: z.array(
    z.object({
      loanItemId: z.string().uuid(),
      returnCondition: z.enum(ITEM_CONDITIONS),
      returnNotes: optStr(300),
    }),
  ),
});

// ======================= Calendario =======================
export const CALENDAR_TYPES = ['reunion', 'servicio', 'consejo', 'evento', 'campamento', 'formacion', 'feriado', 'otro'] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];
export const CALENDAR_TYPE_LABELS: Record<CalendarType, string> = {
  reunion: 'Reunión de sábado',
  servicio: 'Servicio rotativo',
  consejo: 'Consejo de Grupo',
  evento: 'Evento',
  campamento: 'Campamento / salida',
  formacion: 'Formación',
  feriado: 'Feriado',
  otro: 'Otro',
};

const timeStr = z
  .union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)')])
  .nullish()
  .transform((v) => (v ? v : null));

export const calendarEventSchema = z
  .object({
    title: reqStr(160),
    type: z.enum(CALENDAR_TYPES).default('otro'),
    unitId: optUuid,
    startDate: reqDate,
    endDate: optDate,
    allDay: z.boolean().default(true),
    startTime: timeStr,
    endTime: timeStr,
    place: optStr(200),
    description: optStr(2000),
  })
  .transform((d) => ({
    ...d,
    endDate: d.endDate ?? d.startDate,
    startTime: d.allDay ? null : d.startTime,
    endTime: d.allDay ? null : d.endTime,
  }))
  .refine((d) => d.endDate >= d.startDate, { path: ['endDate'], message: 'El fin no puede ser antes del inicio' })
  .refine((d) => d.allDay || d.startTime, { path: ['startTime'], message: 'Indicá la hora o marcá "Todo el día"' });

export const rotationSchema = z
  .object({
    from: reqDate,
    to: reqDate,
    unitIds: z.array(z.string().uuid()).min(1, 'Elegí al menos una unidad'),
    /** 0 = domingo … 6 = sábado */
    weekday: z.coerce.number().int().min(0).max(6).default(6),
    startTime: timeStr,
    endTime: timeStr,
    place: optStr(200),
    /** Si hay un servicio ya cargado ese día, se saltea la fecha. */
    skipExisting: z.boolean().default(true),
  })
  .refine((d) => d.to >= d.from, { path: ['to'], message: 'La fecha final tiene que ser después de la inicial' });

// ======================= Actas y documentos =======================
export const MINUTE_KINDS = ['ordinaria', 'extraordinaria'] as const;
export type MinuteKind = (typeof MINUTE_KINDS)[number];
export const MINUTE_KIND_LABELS: Record<MinuteKind, string> = { ordinaria: 'Ordinaria', extraordinaria: 'Extraordinaria' };
export const MINUTE_STATUSES = ['borrador', 'aprobada'] as const;
export type MinuteStatus = (typeof MINUTE_STATUSES)[number];
export const MINUTE_STATUS_LABELS: Record<MinuteStatus, string> = { borrador: 'Borrador', aprobada: 'Aprobada' };

export const minuteSchema = z.object({
  date: reqDate,
  kind: z.enum(MINUTE_KINDS).default('ordinaria'),
  title: reqStr(200),
  attendees: optStr(4000),
  agenda: optStr(8000),
  content: optStr(50000),
  driveUrl: optUrl,
  status: z.enum(MINUTE_STATUSES).default('borrador'),
});

export const DOCUMENT_CATEGORIES = ['reglamentos', 'planillas', 'formularios', 'guias_saac', 'comunicaciones', 'otros'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  reglamentos: 'Reglamentos y políticas',
  planillas: 'Planillas',
  formularios: 'Formularios y autorizaciones',
  guias_saac: 'Guías SAAC',
  comunicaciones: 'Comunicaciones',
  otros: 'Otros',
};

export const documentLinkSchema = z.object({
  title: reqStr(200),
  category: z.enum(DOCUMENT_CATEGORIES).default('otros'),
  url: z.string({ required_error: 'Requerido' }).trim().url('Enlace inválido (tiene que empezar con https://)').max(500),
  description: optStr(2000),
  unitId: optUuid,
});

export type ItemInput = z.input<typeof itemSchema>;
export type LoanInput = z.input<typeof loanSchema>;
export type CalendarEventInput = z.input<typeof calendarEventSchema>;
export type MinuteInput = z.input<typeof minuteSchema>;
export type DocumentLinkInput = z.input<typeof documentLinkSchema>;

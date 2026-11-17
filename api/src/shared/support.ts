// "Reportar un problema": categorías, estados y validación (compartido entre API y client).
import { z } from 'zod';

export const REPORT_CATEGORIES = ['ERROR', 'SUGERENCIA', 'CONSULTA'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  ERROR: 'Algo no funciona',
  SUGERENCIA: 'Sugerencia',
  CONSULTA: 'Consulta',
};

export const REPORT_STATUSES = ['ABIERTO', 'EN_PROCESO', 'RESUELTO', 'DESCARTADO'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  ABIERTO: 'Recibido',
  EN_PROCESO: 'En revisión',
  RESUELTO: 'Resuelto',
  DESCARTADO: 'Cerrado',
};

export const reportCreateSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  description: z.string().trim().min(10, 'Contanos un poco más (mínimo 10 caracteres)').max(4000),
  pageUrl: z.string().max(300).nullish(),
  appVersion: z.string().max(40).nullish(),
  clientErrors: z
    .array(z.object({ message: z.string().max(500), source: z.string().max(300).nullish(), time: z.string().max(40) }))
    .max(10)
    .default([]),
});
export const reportUpdateSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  response: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => (v ? v : null)),
});

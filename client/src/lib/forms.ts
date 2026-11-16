import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/** Pasa los errores por campo que devuelve la API al formulario. Devuelve true si aplicó alguno. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  if (!(err instanceof ApiError) || !err.details) return false;
  let applied = false;
  for (const [field, message] of Object.entries(err.details)) {
    setError(field as Path<T>, { type: 'server', message });
    applied = true;
  }
  return applied;
}

/** Convierte null/undefined a '' para inputs controlados por RHF. */
export function toFormValues<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: T[K] extends null ? string : T[K] } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === null || v === undefined ? '' : v;
  return out as never;
}

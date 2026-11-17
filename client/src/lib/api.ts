import { recordClientError } from './clientErrors';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, string>,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;
let onSessionLost: (() => void) | null = null;
export function setSessionLostHandler(fn: () => void) {
  onSessionLost = fn;
}

/**
 * Renueva el token de acceso con el token de renovación (cookie). Un solo pedido aunque fallen varios a la vez
 * (si dos pedidos usaran el mismo token, el segundo podía cerrar la sesión). Cada renovación suma otros 30 días.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const doFetch = () => fetch(`/api/v1${path}`, { ...init, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.code === 'token_expired' && (await refreshSession())) res = await doFetch();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith('/auth/')) onSessionLost?.();
    // Errores del servidor: quedan para adjuntarlos si la persona reporta el problema
    if (res.status >= 500) recordClientError(`API ${res.status} ${init.method ?? 'GET'} ${path}: ${body.error ?? ''}`, 'api');
    throw new ApiError(res.status, body.error ?? `Error ${res.status}`, body.code, body.details);
  }
  return res;
}

async function json<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => json<T>('GET', path),
  post: <T>(path: string, body?: unknown) => json<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => json<T>('PUT', path, body ?? {}),
  del: <T>(path: string) => json<T>('DELETE', path),
  /** Descarga un archivo (CSV) respetando la sesión. */
  async download(path: string, fallbackName: string) {
    const res = await request(path, { method: 'GET' });
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') ?? '';
    const name = cd.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/** Construye querystring ignorando vacíos. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error';
}

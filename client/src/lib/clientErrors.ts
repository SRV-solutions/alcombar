/**
 * Guarda en memoria los últimos errores del navegador (no se envían solos): se adjuntan a "Reportar un problema"
 * para que quien lo revise vea qué falló sin pedirle detalles técnicos a la persona.
 */
export interface ClientError {
  message: string;
  source?: string | null;
  time: string;
}

const MAX = 10;
const errors: ClientError[] = [];

function push(message: string, source?: string | null) {
  errors.push({ message: message.slice(0, 500), source: source?.slice(0, 300) ?? null, time: new Date().toISOString() });
  if (errors.length > MAX) errors.shift();
}

let installed = false;
export function installClientErrorCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => push(e.message || String(e.error ?? 'Error'), e.filename ? `${e.filename}:${e.lineno}` : null));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    push(typeof r === 'string' ? r : r?.message ?? 'Promesa rechazada', null);
  });
}

/** Registra un error de la app (por ejemplo, una respuesta 500 de la API). */
export const recordClientError = (message: string, source?: string) => push(message, source ?? null);

export const recentClientErrors = (): ClientError[] => [...errors];

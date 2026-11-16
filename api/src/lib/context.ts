import { AsyncLocalStorage } from 'node:async_hooks';

/** Quién está haciendo la operación actual (para la auditoría). */
export interface RequestContext {
  userId: string | null;
  ip: string | null;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentContext(): RequestContext {
  return requestContext.getStore() ?? { userId: null, ip: null };
}

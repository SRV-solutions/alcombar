import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { can, type Action, type ModuleKey, type PermissionSubject } from '../shared';
import { config } from '../config';
import { Session, User } from '../models';
import { loadSubject } from '../lib/access';
import { currentContext } from '../lib/context';
import { ah, forbidden, notFound, unauthorized } from '../lib/errors';
import { ACCESS_COOKIE, type AccessPayload } from '../lib/session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      auth?: PermissionSubject & { roles: { name: string; unitId: string | null }[] };
    }
  }
}

/** Verifica el token de acceso (cookie httpOnly) y carga usuario y permisos. */
export const authenticate = ah(async (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw unauthorized('Tenés que iniciar sesión', 'token_expired');
  let payload: AccessPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as AccessPayload;
  } catch {
    throw unauthorized('Sesión vencida', 'token_expired');
  }
  const [user, session] = await Promise.all([User.findByPk(payload.sub), Session.findByPk(payload.sid)]);
  if (!session || (session.revokedAt && !session.replacedById)) throw unauthorized('Sesión cerrada', 'session_expired');
  if (!user || !user.active) throw unauthorized('Usuario inactivo', 'session_expired');
  req.user = user;
  req.sessionId = session.id;
  req.auth = await loadSubject(user.id);
  currentContext().userId = user.id;
  next();
});

type UnitResolver = (req: Request) => Promise<string | null | undefined>;

/**
 * Middleware de autorización único (informe §6.1): recibe módulo, acción y, si corresponde,
 * cómo obtener la unidad del recurso. Si el resolver devuelve undefined, el recurso no existe (404).
 */
export function authorize(module: ModuleKey, action: Action, resolveUnit?: UnitResolver) {
  return ah(async (req, _res, next) => {
    let unitId: string | null | undefined;
    if (resolveUnit) {
      unitId = await resolveUnit(req);
      if (unitId === undefined) throw notFound();
    }
    if (!can(req.auth, module, action, unitId)) throw forbidden();
    next();
  });
}

/** Chequeo puntual dentro de un handler. */
export function assertCan(req: Request, module: ModuleKey, action: Action, unitId?: string | null) {
  if (!can(req.auth, module, action, unitId)) throw forbidden();
}

export const canReq = (req: Request, module: ModuleKey, action: Action, unitId?: string | null) => can(req.auth, module, action, unitId);

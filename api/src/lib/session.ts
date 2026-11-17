import type { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { config } from '../config';
import { Session, User } from '../models';
import { unauthorized } from './errors';
import { randomToken, sha256 } from './security';

export const ACCESS_COOKIE = 'alc_at';
export const REFRESH_COOKIE = 'alc_rt';
const REFRESH_PATH = '/api/v1/auth';

const base: CookieOptions = { httpOnly: true, secure: config.isProd, sameSite: 'lax' };

export interface AccessPayload {
  sub: string;
  sid: string;
}

function setAccessCookie(res: Response, userId: string, sessionId: string) {
  const access = jwt.sign({ sub: userId, sid: sessionId } satisfies AccessPayload, config.jwtSecret, {
    expiresIn: `${config.accessTokenMinutes}m`,
  });
  res.cookie(ACCESS_COOKIE, access, { ...base, path: '/', maxAge: config.accessTokenMinutes * 60_000 });
}

function setCookies(res: Response, userId: string, sessionId: string, refreshToken: string) {
  setAccessCookie(res, userId, sessionId);
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, path: REFRESH_PATH, maxAge: config.refreshTokenDays * 86_400_000 });
}

export function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}

function clientIp(req: Request) {
  return (req.ip ?? '').slice(0, 60) || null;
}

export async function startSession(req: Request, res: Response, user: User) {
  const token = randomToken(48);
  const session = await Session.create({
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + config.refreshTokenDays * 86_400_000),
    revokedAt: null,
    replacedById: null,
    userAgent: (req.get('user-agent') ?? '').slice(0, 300) || null,
    ip: clientIp(req),
  });
  setCookies(res, user.id, session.id, token);
  return session;
}

/**
 * Token de renovación rotativo: cada uso emite uno nuevo con otros 30 días, así la sesión solo se cierra si pasan
 * 30 días seguidos sin usar la app. Si se reusa uno ya rotado (fuera del margen), se cierran todas las sesiones.
 */
export async function rotateSession(req: Request, res: Response): Promise<User> {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('Sesión vencida', 'session_expired');
  const session = await Session.findOne({ where: { tokenHash: sha256(token) } });
  if (!session) {
    clearCookies(res);
    throw unauthorized('Sesión vencida', 'session_expired');
  }
  if (session.revokedAt) {
    // Rotado hace instantes por otro pedido simultáneo (otra pestaña, o la app volviendo del segundo plano):
    // no es un robo. El navegador ya recibió el token nuevo, así que solo se le da un acceso de la sesión
    // que lo reemplazó, sin tocar la cookie de renovación (borrarla acá cerraba la sesión sin motivo).
    const graceMs = 60_000;
    if (session.replacedById && Date.now() - session.revokedAt.getTime() < graceMs) {
      const next = await Session.findByPk(session.replacedById);
      const user = await User.findByPk(session.userId);
      if (next && !(next.revokedAt && !next.replacedById) && next.expiresAt.getTime() > Date.now() && user?.active) {
        setAccessCookie(res, user.id, next.id);
        return user;
      }
      throw unauthorized('Sesión vencida', 'session_expired');
    }
    await Session.update({ revokedAt: new Date() }, { where: { userId: session.userId, revokedAt: null } });
    clearCookies(res);
    throw unauthorized('Sesión vencida', 'session_expired');
  }
  if (session.expiresAt.getTime() < Date.now()) {
    clearCookies(res);
    throw unauthorized('Sesión vencida', 'session_expired');
  }
  const user = await User.findByPk(session.userId);
  if (!user || !user.active) {
    clearCookies(res);
    throw unauthorized('Usuario inactivo', 'session_expired');
  }
  const next = await startSession(req, res, user);
  session.revokedAt = new Date();
  session.replacedById = next.id;
  await session.save();
  return user;
}

/** Limpieza: borra las sesiones vencidas o cerradas hace más de 30 días (ya no sirven ni para detectar reúsos). */
export async function pruneSessions(userId: string) {
  const cutoff = new Date(Date.now() - config.refreshTokenDays * 86_400_000);
  await Session.destroy({ where: { userId, [Op.or]: [{ expiresAt: { [Op.lt]: new Date() } }, { revokedAt: { [Op.lt]: cutoff } }] } });
}

export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await Session.update({ revokedAt: new Date() }, { where: { tokenHash: sha256(token), revokedAt: null } });
  clearCookies(res);
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await Session.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { [Op.ne]: exceptSessionId } } : {}) } },
  );
}

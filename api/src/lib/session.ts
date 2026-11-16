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

function setCookies(res: Response, userId: string, sessionId: string, refreshToken: string) {
  const access = jwt.sign({ sub: userId, sid: sessionId } satisfies AccessPayload, config.jwtSecret, {
    expiresIn: `${config.accessTokenMinutes}m`,
  });
  res.cookie(ACCESS_COOKIE, access, { ...base, path: '/', maxAge: config.accessTokenMinutes * 60_000 });
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

/** Token de renovación rotativo: cada uso emite uno nuevo. Si se reusa uno ya rotado, se cierran todas las sesiones. */
export async function rotateSession(req: Request, res: Response): Promise<User> {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('Sesión vencida', 'session_expired');
  const session = await Session.findOne({ where: { tokenHash: sha256(token) } });
  if (!session) {
    clearCookies(res);
    throw unauthorized('Sesión vencida', 'session_expired');
  }
  if (session.revokedAt) {
    // Si fue rotado hace instantes (pedidos simultáneos del navegador), no es un robo: se rechaza sin cerrar todo.
    const graceMs = 10_000;
    if (!(session.replacedById && Date.now() - session.revokedAt.getTime() < graceMs)) {
      await Session.update({ revokedAt: new Date() }, { where: { userId: session.userId, revokedAt: null } });
    }
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

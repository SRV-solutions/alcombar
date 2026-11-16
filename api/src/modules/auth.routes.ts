import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema, setPasswordSchema } from '../shared';
import { config } from '../config';
import { Adult, PasswordToken, Unit, User } from '../models';
import { writeAudit } from '../lib/audit';
import { currentContext } from '../lib/context';
import { ah, badRequest, HttpError, parse, unauthorized } from '../lib/errors';
import { createPasswordLink, findValidToken, sendReset } from '../lib/passwordTokens';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../lib/security';
import { endSession, revokeAllSessions, rotateSession, startSession } from '../lib/session';
import { authenticate } from '../middlewares/auth';
import { sequelize } from '../db';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

authRouter.post(
  '/login',
  loginLimiter,
  ah(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ where: { email } });
    if (!user || !user.passwordHash || !user.active) {
      await verifyPassword(password, DUMMY_HASH);
      throw unauthorized('Email o contraseña incorrectos', 'invalid_credentials');
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpError(423, `Usuario bloqueado por intentos fallidos. Probá de nuevo en ${mins} min.`, 'locked');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      user.failedLogins += 1;
      if (user.failedLogins >= config.maxFailedLogins) {
        user.lockedUntil = new Date(Date.now() + config.lockMinutes * 60_000);
        user.failedLogins = 0;
      }
      await user.save();
      throw unauthorized('Email o contraseña incorrectos', 'invalid_credentials');
    }
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
    await startSession(req, res, user);
    currentContext().userId = user.id;
    await writeAudit({ action: 'login', entity: 'User', entityId: user.id, summary: user.email });
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/refresh',
  ah(async (req, res) => {
    await rotateSession(req, res);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/logout',
  ah(async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  ah(async (req, res) => {
    const user = req.user!;
    const adult = user.adultId ? await Adult.findByPk(user.adultId, { attributes: ['id', 'firstName', 'lastName', 'totem'] }) : null;
    const unitIds = [...new Set(req.auth!.roles.map((r) => r.unitId).filter(Boolean))] as string[];
    const units = unitIds.length ? await Unit.findAll({ where: { id: unitIds }, attributes: ['id', 'name', 'code'] }) : [];
    res.json({
      user: { id: user.id, email: user.email, name: user.name, adultId: user.adultId, adult },
      isSuperadmin: req.auth!.isSuperadmin,
      grants: req.auth!.grants,
      roles: req.auth!.roles.map((r) => ({ name: r.name, unit: units.find((u) => u.id === r.unitId) ?? null })),
    });
  }),
);

// ---- Mi perfil: cada uno edita sus propios datos ----
authRouter.get(
  '/me/profile',
  authenticate,
  ah(async (req, res) => {
    const u = req.user!;
    const adult = u.adultId
      ? await Adult.findByPk(u.adultId, { attributes: ['id', 'firstName', 'lastName', 'totem', 'dni', 'birthDate', 'phone', 'address', 'email'] })
      : null;
    res.json({ name: u.name, email: u.email, hasPassword: Boolean(u.passwordHash), adult });
  }),
);

authRouter.put(
  '/me/profile',
  authenticate,
  ah(async (req, res) => {
    const data = parse(profileSchema, req.body);
    const user = req.user!;
    const emailChanged = data.email !== user.email;
    if (emailChanged) {
      // El email es con lo que se entra: para cambiarlo hay que confirmar la contraseña
      if (user.passwordHash && !(await verifyPassword(data.currentPassword ?? '', user.passwordHash))) {
        throw badRequest('Revisá los datos ingresados', { currentPassword: 'Para cambiar el email confirmá tu contraseña actual' });
      }
      const dup = await User.findOne({ where: { email: data.email }, paranoid: false });
      if (dup && dup.id !== user.id) throw badRequest('Revisá los datos ingresados', { email: 'Ese email ya lo usa otro usuario' });
    }
    await sequelize.transaction(async (transaction) => {
      user.name = data.name;
      user.email = data.email;
      await user.save({ transaction });
      if (user.adultId && data.adult) {
        const adult = await Adult.findByPk(user.adultId, { transaction });
        if (adult) {
          // El email de contacto de la ficha acompaña al del usuario
          await adult.update({ ...data.adult, ...(emailChanged || !adult.email ? { email: data.email } : {}) }, { transaction });
        }
      }
    });
    res.json({ ok: true });
  }),
);

// ---- Avance de los tutoriales (se guarda en la cuenta: sirve en cualquier dispositivo) ----
const tutorialsSchema = z.object({
  done: z.array(z.string().max(60)).max(200),
  skipped: z.array(z.string().max(60)).max(200),
});

authRouter.get(
  '/me/tutorials',
  authenticate,
  ah(async (req, res) => {
    res.json(req.user!.tutorials ?? { done: [], skipped: [] });
  }),
);

authRouter.put(
  '/me/tutorials',
  authenticate,
  ah(async (req, res) => {
    const data = parse(tutorialsSchema, req.body);
    const value = { done: [...new Set(data.done)], skipped: [...new Set(data.skipped)] };
    req.user!.tutorials = value;
    await req.user!.save();
    res.json(value);
  }),
);

authRouter.post(
  '/forgot',
  loginLimiter,
  ah(async (req, res) => {
    const { email } = parse(forgotPasswordSchema, req.body);
    const user = await User.findOne({ where: { email, active: true } });
    if (user) {
      const url = await createPasswordLink(user, 'reset');
      await sendReset(user, url);
    }
    // Siempre la misma respuesta, exista o no el email.
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/token/:token',
  ah(async (req, res) => {
    const pt = await findValidToken(req.params.token);
    if (!pt) return res.json({ valid: false });
    const user = await User.findByPk(pt.userId);
    res.json({ valid: Boolean(user?.active), purpose: pt.purpose, email: user?.email, name: user?.name });
  }),
);

authRouter.post(
  '/set-password',
  loginLimiter,
  ah(async (req, res) => {
    const { token, password } = parse(setPasswordSchema, req.body);
    const valid = await findValidToken(token);
    if (!valid) throw badRequest('El enlace venció o ya se usó. Pedí uno nuevo.');
    const user = await sequelize.transaction(async (transaction) => {
      const pt = await PasswordToken.findByPk(valid.id, { transaction, lock: true });
      if (!pt || pt.usedAt) throw badRequest('El enlace venció o ya se usó. Pedí uno nuevo.');
      const u = await User.findByPk(pt.userId, { transaction });
      if (!u || !u.active) throw badRequest('Usuario inactivo');
      pt.usedAt = new Date();
      await pt.save({ transaction });
      u.passwordHash = await hashPassword(password);
      u.failedLogins = 0;
      u.lockedUntil = null;
      u.lastLoginAt = new Date();
      await u.save({ transaction });
      return u;
    });
    await revokeAllSessions(user.id);
    await startSession(req, res, user);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/change-password',
  authenticate,
  ah(async (req, res) => {
    const { currentPassword, password } = parse(changePasswordSchema, req.body);
    const user = req.user!;
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw badRequest('Revisá los datos ingresados', { currentPassword: 'La contraseña actual no es correcta' });
    }
    user.passwordHash = await hashPassword(password);
    await user.save();
    await revokeAllSessions(user.id, req.sessionId);
    res.json({ ok: true });
  }),
);

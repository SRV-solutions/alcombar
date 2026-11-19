import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  changePasswordSchema,
  emailConfirmSchema,
  emailRequestSchema,
  forgotPasswordSchema,
  loginIdentifier,
  loginSchema,
  profileSchema,
  setPasswordSchema,
  TOTEM_ANIMAL_KEYS,
} from '../shared';
import { config } from '../config';
import { Adult, Member, PasswordToken, Unit, User } from '../models';
import { writeAudit } from '../lib/audit';
import { currentContext } from '../lib/context';
import { ah, badRequest, HttpError, notFound, parse, unauthorized } from '../lib/errors';
import { createPasswordLink, createQrLogin, findValidToken, QR_LOGIN_MINUTES, sendReset } from '../lib/passwordTokens';
import { DUMMY_HASH, hashPassword, numericCode, sha256, verifyPassword } from '../lib/security';
import { emailLayout, sendMail } from '../lib/mailer';
import { endSession, pruneSessions, revokeAllSessions, rotateSession, startSession } from '../lib/session';
import { authenticate } from '../middlewares/auth';
import { isJefaturaUser } from '../lib/notify';
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
    const { email: typed, password } = parse(loginSchema, req.body);
    // Se entra con el email o con el DNI (los rovers, que todavía no tienen mail cargado)
    const idn = loginIdentifier(typed);
    let user: User | null = null;
    if ('dni' in idn) {
      const member = await Member.findOne({ where: { dni: idn.dni }, attributes: ['id'] });
      if (member) user = await User.findOne({ where: { memberId: member.id } });
      if (!user) {
        const adult = await Adult.findOne({ where: { dni: idn.dni }, attributes: ['id'] });
        if (adult) user = await User.findOne({ where: { adultId: adult.id } });
      }
    } else {
      user = await User.findOne({ where: { email: idn.email } });
    }
    const WRONG = 'Usuario o contraseña incorrectos';
    if (!user || !user.passwordHash || !user.active) {
      await verifyPassword(password, DUMMY_HASH);
      throw unauthorized(WRONG, 'invalid_credentials');
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
      throw unauthorized(WRONG, 'invalid_credentials');
    }
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
    await startSession(req, res, user);
    void pruneSessions(user.id).catch(() => undefined);
    currentContext().userId = user.id;
    await writeAudit({ action: 'login', entity: 'User', entityId: user.id, summary: user.email ?? user.name });
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
    const adult = user.adultId ? await Adult.findByPk(user.adultId, { attributes: ['id', 'firstName', 'lastName', 'totem', 'avatar'] }) : null;
    const unitIds = [...new Set(req.auth!.roles.map((r) => r.unitId).filter(Boolean))] as string[];
    const units = unitIds.length ? await Unit.findAll({ where: { id: unitIds }, attributes: ['id', 'name', 'code'] }) : [];
    const member = user.memberId
      ? await Member.findByPk(user.memberId, { attributes: ['id', 'firstName', 'lastName', 'unitId', 'branch', 'status'] })
      : null;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        adultId: user.adultId,
        adult,
        memberId: user.memberId ?? null,
        member,
        mustChangePassword: user.mustChangePassword,
        pendingEmail: user.pendingEmail ?? null,
        // Las cuentas de adultos nacen de una invitación por mail: su casilla ya está probada
        emailVerified: Boolean(user.email) && (Boolean(user.emailVerifiedAt) || !user.memberId),
      },
      isSuperadmin: req.auth!.isSuperadmin,
      isJefatura: await isJefaturaUser(user.id, req.auth!.isSuperadmin),
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
    res.json({ name: u.name, email: u.email, hasPassword: Boolean(u.passwordHash), adult, memberAccount: Boolean(u.memberId), pendingEmail: u.pendingEmail ?? null });
  }),
);

/** Foto de perfil: quien tiene tótem elige el dibujo de su animal (o ninguno). */
authRouter.put(
  '/me/avatar',
  authenticate,
  ah(async (req, res) => {
    const { avatar } = parse(z.object({ avatar: z.enum(TOTEM_ANIMAL_KEYS).nullable() }), req.body);
    const adult = req.user!.adultId ? await Adult.findByPk(req.user!.adultId) : null;
    if (!adult?.totem?.trim()) throw badRequest('La foto de perfil es el animal de tu tótem: todavía no tenés tótem cargado');
    await adult.update({ avatar });
    res.json({ ok: true, avatar: adult.avatar });
  }),
);

authRouter.put(
  '/me/profile',
  authenticate,
  ah(async (req, res) => {
    const user = req.user!;
    // La cuenta de un rover: el nombre sale de su ficha y el mail se confirma con un código
    if (user.memberId) throw badRequest('En tu cuenta el mail se carga con un código de verificación, y tus datos los actualiza tu educador');
    const data = parse(profileSchema, req.body);
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
      u.mustChangePassword = false;
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

// ---- Abrir en el celular: código QR de un solo uso (vence en pocos minutos) que inicia sesión en el celu ----
const qrLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Generaste demasiados códigos. Probá de nuevo en unos minutos.' },
});

authRouter.post(
  '/qr',
  authenticate,
  qrLimiter,
  ah(async (req, res) => {
    res.json({ ...(await createQrLogin(req.user!)), minutes: QR_LOGIN_MINUTES });
  }),
);

/** La computadora pregunta si el código ya se usó (para avisar "¡Listo!"). */
authRouter.get(
  '/qr/:id',
  authenticate,
  ah(async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const pt = await PasswordToken.findOne({ where: { id, userId: req.user!.id, purpose: 'qr_login' } });
    if (!pt) throw notFound();
    res.json({ used: Boolean(pt.usedAt), expired: !pt.usedAt && pt.expiresAt.getTime() <= Date.now() });
  }),
);

authRouter.post(
  '/qr-login',
  loginLimiter,
  ah(async (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(20).max(200) }), req.body);
    const invalid = 'El código venció o ya se usó. Generá otro desde la computadora.';
    const user = await sequelize.transaction(async (transaction) => {
      const pt = await PasswordToken.findOne({ where: { tokenHash: sha256(token), purpose: 'qr_login' }, transaction, lock: true });
      if (!pt || pt.usedAt || pt.expiresAt.getTime() <= Date.now()) throw badRequest(invalid);
      const u = await User.findByPk(pt.userId, { transaction });
      if (!u || !u.active) throw badRequest(invalid);
      pt.usedAt = new Date();
      await pt.save({ transaction });
      u.lastLoginAt = new Date();
      await u.save({ transaction });
      return u;
    });
    await startSession(req, res, user);
    currentContext().userId = user.id;
    await writeAudit({ action: 'login', entity: 'User', entityId: user.id, summary: `${user.email ?? user.name} (con código QR)` });
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
    if (await verifyPassword(password, user.passwordHash)) throw badRequest('Revisá los datos ingresados', { password: 'Elegí una contraseña distinta de la actual' });
    user.passwordHash = await hashPassword(password);
    user.mustChangePassword = false;
    await user.save();
    await revokeAllSessions(user.id, req.sessionId);
    res.json({ ok: true });
  }),
);

// ---- Mi mail: se carga (o se cambia) confirmando un código que llega a esa casilla ----
const EMAIL_CODE_MINUTES = 15;
const EMAIL_CODE_TRIES = 5;
const emailCodeHash = (userId: string, code: string) => sha256(`email:${userId}:${code}`);
const emailCodeLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Pediste demasiados códigos. Probá de nuevo en un rato.' },
});

authRouter.post(
  '/me/email',
  authenticate,
  emailCodeLimiter,
  ah(async (req, res) => {
    const { email } = parse(emailRequestSchema, req.body);
    const user = req.user!;
    if (email === user.email) throw badRequest('Revisá los datos ingresados', { email: 'Ese ya es tu mail' });
    const dup = await User.findOne({ where: { email }, paranoid: false });
    if (dup && dup.id !== user.id) throw badRequest('Revisá los datos ingresados', { email: 'Ese mail ya lo usa otra cuenta' });
    const code = numericCode();
    await sequelize.transaction(async (transaction) => {
      // El código anterior deja de servir
      await PasswordToken.update({ usedAt: new Date() }, { where: { userId: user.id, purpose: 'email', usedAt: null }, transaction });
      await PasswordToken.create(
        { userId: user.id, tokenHash: emailCodeHash(user.id, code), purpose: 'email', expiresAt: new Date(Date.now() + EMAIL_CODE_MINUTES * 60_000), usedAt: null },
        { transaction },
      );
      user.pendingEmail = email;
      await user.save({ transaction });
    });
    const intro = `Hola ${user.name}:`;
    const ask = 'Para confirmar que esta casilla es tuya, escribí este código en ALCONBAR Gestión:';
    const note = `Vence en ${EMAIL_CODE_MINUTES} minutos. Si no lo pediste vos, ignorá este mensaje.`;
    const sent = await sendMail(
      email,
      'Tu código para confirmar el mail en ALCONBAR Gestión',
      `${intro}\n\n${ask}\n\n    ${code}\n\n${note}`,
      emailLayout({ title: 'Confirmá tu mail', paragraphs: [intro, ask, code], footnote: note }),
    );
    res.json({ ok: true, sent, email, minutes: EMAIL_CODE_MINUTES });
  }),
);

authRouter.post(
  '/me/email/confirm',
  authenticate,
  loginLimiter,
  ah(async (req, res) => {
    const { code } = parse(emailConfirmSchema, req.body);
    const user = req.user!;
    const expired = 'El código venció. Pedí uno nuevo.';
    const pt = await PasswordToken.findOne({ where: { userId: user.id, purpose: 'email', usedAt: null }, order: [['createdAt', 'DESC']] });
    if (!pt || !user.pendingEmail || pt.expiresAt.getTime() <= Date.now()) throw badRequest(expired, { code: expired });
    if (pt.tokenHash !== emailCodeHash(user.id, code)) {
      pt.attempts += 1;
      if (pt.attempts >= EMAIL_CODE_TRIES) pt.usedAt = new Date();
      await pt.save();
      const left = EMAIL_CODE_TRIES - pt.attempts;
      const msg = left > 0 ? `El código no es correcto. Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}.` : 'Demasiados intentos. Pedí un código nuevo.';
      throw badRequest(msg, { code: msg });
    }
    const email = user.pendingEmail;
    const dup = await User.findOne({ where: { email }, paranoid: false });
    if (dup && dup.id !== user.id) throw badRequest('Ese mail ya lo usa otra cuenta', { code: 'Ese mail ya lo usa otra cuenta' });
    await sequelize.transaction(async (transaction) => {
      pt.usedAt = new Date();
      await pt.save({ transaction });
      user.email = email;
      user.pendingEmail = null;
      user.emailVerifiedAt = new Date();
      await user.save({ transaction });
      // El mail de contacto de su ficha acompaña al de la cuenta, si no tenía ninguno
      if (user.memberId) {
        const member = await Member.findByPk(user.memberId, { transaction });
        if (member && !member.email) await member.update({ email }, { transaction });
      }
    });
    res.json({ ok: true, email });
  }),
);

/** Se arrepintió del mail que estaba por confirmar. */
authRouter.delete(
  '/me/email',
  authenticate,
  ah(async (req, res) => {
    const user = req.user!;
    await PasswordToken.update({ usedAt: new Date() }, { where: { userId: user.id, purpose: 'email', usedAt: null } });
    user.pendingEmail = null;
    await user.save();
    res.json({ ok: true });
  }),
);

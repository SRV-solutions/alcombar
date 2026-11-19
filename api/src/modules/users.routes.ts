import { Router } from 'express';
import { Op } from 'sequelize';
import { userCreateSchema, userUpdateSchema } from '../shared';
import { sequelize } from '../db';
import { Adult, PasswordToken, Role, Unit, User, UserRole } from '../models';
import { ah, badRequest, conflict, forbidden, notFound, parse } from '../lib/errors';
import { createPasswordLink, sendInvite, sendReset } from '../lib/passwordTokens';
import { revokeAllSessions } from '../lib/session';
import { authorize } from '../middlewares/auth';

export const usersRouter = Router();

const include = [
  { model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName', 'totem'] },
  {
    model: UserRole,
    as: 'userRoles',
    include: [
      { model: Role, as: 'role', attributes: ['id', 'key', 'name', 'scope'] },
      { model: Unit, as: 'unit', attributes: ['id', 'name', 'code'] },
    ],
  },
];

async function validateRoles(roles: { roleId: string; unitId: string | null }[], actorIsSuperadmin: boolean) {
  const ids = [...new Set(roles.map((r) => r.roleId))];
  const found = await Role.findAll({ where: { id: ids } });
  for (const r of roles) {
    const role = found.find((f) => f.id === r.roleId);
    if (!role) throw badRequest('Rol inexistente');
    if (role.key === 'superadmin' && !actorIsSuperadmin) throw forbidden('Solo un superadmin puede asignar el rol Superadmin');
    if (role.scope === 'unit' && !r.unitId) throw badRequest(`El rol "${role.name}" necesita una unidad`);
    if (role.scope === 'group') r.unitId = null;
  }
  return found;
}

async function activeSuperadminCount(excludeUserId?: string) {
  const sa = await Role.findOne({ where: { key: 'superadmin' } });
  if (!sa) return 0;
  return UserRole.count({
    where: { roleId: sa.id, ...(excludeUserId ? { userId: { [Op.ne]: excludeUserId } } : {}) },
    include: [{ model: User, as: 'user', where: { active: true }, required: true }],
    distinct: true,
    col: 'user_id',
  });
}

usersRouter.get(
  '/',
  authorize('users', 'view'),
  ah(async (_req, res) => {
    const users = await User.findAll({ include, order: [['name', 'ASC']] });
    res.json(users);
  }),
);

usersRouter.post(
  '/',
  authorize('users', 'create'),
  ah(async (req, res) => {
    const data = parse(userCreateSchema, req.body);
    if (await User.findOne({ where: { email: data.email } })) throw conflict('Ya existe un usuario con ese email');
    await validateRoles(data.roles, req.auth!.isSuperadmin);
    const user = await sequelize.transaction(async (transaction) => {
      const u = await User.create(
        { email: data.email, name: data.name, adultId: data.adultId, passwordHash: null, lastLoginAt: null, lockedUntil: null },
        { transaction },
      );
      for (const r of data.roles) await UserRole.create({ userId: u.id, roleId: r.roleId, unitId: r.unitId }, { transaction });
      return u;
    });
    const inviteUrl = await createPasswordLink(user, 'invite');
    const emailSent = await sendInvite(user, inviteUrl);
    res.status(201).json({ user: await User.findByPk(user.id, { include }), inviteUrl, emailSent });
  }),
);

usersRouter.put(
  '/:id',
  authorize('users', 'edit'),
  ah(async (req, res) => {
    const data = parse(userUpdateSchema, req.body);
    const user = await User.findByPk(req.params.id, { include });
    if (!user) throw notFound();
    const targetIsSuperadmin = user.userRoles?.some((ur) => ur.role?.key === 'superadmin');
    if (targetIsSuperadmin && !req.auth!.isSuperadmin) throw forbidden('Solo un superadmin puede editar a otro superadmin');
    const roles = await validateRoles(data.roles, req.auth!.isSuperadmin);
    const keepsSuperadmin = data.active && data.roles.some((r) => roles.find((x) => x.id === r.roleId)?.key === 'superadmin');
    if (targetIsSuperadmin && !keepsSuperadmin && (await activeSuperadminCount(user.id)) === 0) {
      throw badRequest('No se puede quitar o desactivar al último superadmin');
    }
    if (user.id === req.user!.id && !data.active) throw badRequest('No podés desactivar tu propio usuario');
    const emailChanged = !!data.email && data.email !== user.email;
    if (emailChanged && (await User.findOne({ where: { email: data.email, id: { [Op.ne]: user.id } }, paranoid: false }))) {
      throw conflict('Ya existe un usuario con ese email');
    }

    await sequelize.transaction(async (transaction) => {
      if (emailChanged) user.email = data.email!;
      user.name = data.name;
      user.adultId = data.adultId;
      user.active = data.active;
      await user.save({ transaction });
      // Reemplaza las asignaciones de rol (se auditan una por una)
      const current = await UserRole.findAll({ where: { userId: user.id }, transaction });
      const key = (r: { roleId: string; unitId: string | null }) => `${r.roleId}|${r.unitId ?? ''}`;
      const wanted = new Set(data.roles.map(key));
      for (const ur of current) if (!wanted.has(key({ roleId: ur.roleId, unitId: ur.unitId }))) await ur.destroy({ transaction });
      const have = new Set(current.map((ur) => key({ roleId: ur.roleId, unitId: ur.unitId })));
      for (const r of data.roles) if (!have.has(key(r))) await UserRole.create({ userId: user.id, roleId: r.roleId, unitId: r.unitId }, { transaction });
    });
    if (!data.active) await revokeAllSessions(user.id);
    // Email corregido: los enlaces que salieron a la dirección anterior dejan de servir. Si todavía no había elegido
    // contraseña, la invitación sale de nuevo a la dirección correcta.
    let invite: { url: string; emailSent: boolean } | null = null;
    if (emailChanged) {
      await PasswordToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null, purpose: ['invite', 'reset'] } });
      if (data.active && !user.passwordHash) {
        const url = await createPasswordLink(user, 'invite');
        invite = { url, emailSent: await sendInvite(user, url) };
      }
    }
    const saved = await User.findByPk(user.id, { include });
    res.json({ ...(saved!.toJSON() as object), invite });
  }),
);

/** Genera un nuevo enlace: invitación si nunca definió contraseña, o restablecimiento si ya tenía. */
usersRouter.post(
  '/:id/link',
  authorize('users', 'edit'),
  ah(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    if (!user.active) throw badRequest('El usuario está desactivado');
    const purpose = user.passwordHash ? 'reset' : 'invite';
    const url = await createPasswordLink(user, purpose);
    const emailSent = purpose === 'invite' ? await sendInvite(user, url) : await sendReset(user, url);
    res.json({ url, purpose, emailSent });
  }),
);

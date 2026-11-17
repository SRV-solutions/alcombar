import { Router, type Request } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { canGroupWide } from '../shared';
import { Unit, User } from '../models';
import { Notification, RegistryTask } from '../models/notifications';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { isRegistryTeamMember, registryRecipients } from '../lib/notify';

// ---------------- Campanita ----------------
export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  ah(async (req, res) => {
    const userId = req.user!.id;
    const [items, unread] = await Promise.all([
      Notification.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 40 }),
      Notification.count({ where: { userId, readAt: null } }),
    ]);
    res.json({ items, unread });
  }),
);

notificationsRouter.get(
  '/count',
  ah(async (req, res) => {
    res.json({ unread: await Notification.count({ where: { userId: req.user!.id, readAt: null } }) });
  }),
);

notificationsRouter.post(
  '/read-all',
  ah(async (req, res) => {
    await Notification.update({ readAt: new Date() }, { where: { userId: req.user!.id, readAt: null } });
    res.json({ ok: true });
  }),
);

notificationsRouter.post(
  '/:id/read',
  ah(async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const n = await Notification.findOne({ where: { id, userId: req.user!.id } });
    if (!n) throw notFound();
    if (!n.readAt) await n.update({ readAt: new Date() });
    res.json({ ok: true });
  }),
);

// ---------------- Altas y bajas para Cruz del Sur ----------------
export const registryRouter = Router();

/** Ven y resuelven los pendientes: el equipo que recibe los avisos, superadmins y quien edita protagonistas o adultos de todo el Grupo. */
async function canHandleRegistry(req: Request) {
  const a = req.auth!;
  if (a.isSuperadmin || canGroupWide(a, 'members', 'edit') || canGroupWide(a, 'adults', 'edit')) return true;
  return isRegistryTeamMember(req.user!);
}

const userAttrs = ['id', 'name'];

registryRouter.get(
  '/summary',
  ah(async (req, res) => {
    if (!(await canHandleRegistry(req))) return res.json({ canSee: false, pending: 0 });
    res.json({ canSee: true, pending: await RegistryTask.count({ where: { status: 'pendiente' } }) });
  }),
);

registryRouter.get(
  '/',
  ah(async (req, res) => {
    if (!(await canHandleRegistry(req))) throw forbidden();
    const showDone = req.query.status === 'resueltas';
    const tasks = await RegistryTask.findAll({
      where: showDone ? { status: { [Op.ne]: 'pendiente' } } : { status: 'pendiente' },
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'branch'] },
        { model: User, as: 'createdBy', attributes: userAttrs },
        { model: User, as: 'resolvedBy', attributes: userAttrs },
      ],
      order: showDone ? [['resolvedAt', 'DESC']] : [['createdAt', 'ASC']],
      limit: showDone ? 200 : 1000,
    });
    const { teams, userIds, emails } = await registryRecipients();
    res.json({
      tasks,
      teams: teams.map((t) => ({ id: t.id, name: t.name })),
      recipients: { users: userIds.length, emails: emails.length },
    });
  }),
);

const resolveSchema = z.object({
  status: z.enum(['hecha', 'anulada', 'pendiente']),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null),
});

registryRouter.post(
  '/:id/resolve',
  ah(async (req, res) => {
    if (!(await canHandleRegistry(req))) throw forbidden();
    const id = parse(z.string().uuid(), req.params.id);
    const d = parse(resolveSchema, req.body);
    const task = await RegistryTask.findByPk(id);
    if (!task) throw notFound();
    if (d.status === 'pendiente') {
      if (task.status === 'pendiente') throw badRequest('Ya está pendiente');
      await task.update({ status: 'pendiente', resolvedAt: null, resolvedByUserId: null, resolutionNote: null });
    } else {
      await task.update({ status: d.status, resolvedAt: new Date(), resolvedByUserId: req.user!.id, resolutionNote: d.note });
    }
    res.json(task);
  }),
);

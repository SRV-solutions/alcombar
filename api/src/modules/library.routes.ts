import { Router } from 'express';
import { Op } from 'sequelize';
import { documentLinkSchema, minuteSchema } from '../shared';
import { sequelize } from '../db';
import { Unit, User } from '../models';
import { CouncilMinute, DocumentLink } from '../models/operations';
import { z } from 'zod';
import { formatDate } from '../shared';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';
import { councilRecipients, isJefaturaUser, notify } from '../lib/notify';
import { authorize } from '../middlewares/auth';

/** Etapa 8: actas del Consejo de Grupo y repositorio de documentos (enlaces al Drive). */
export const libraryRouter = Router();

const unitAttrs = ['id', 'name', 'code', 'branch'];

// ---------------- Actas del Consejo de Grupo ----------------
libraryRouter.get(
  '/minutes',
  authorize('documents', 'view'),
  ah(async (req, res) => {
    const where: Record<string | symbol, unknown> = {};
    const q = String(req.query.q ?? '').trim();
    if (q) {
      const like = `%${q}%`;
      where[Op.or] = [{ title: { [Op.iLike]: like } }, { agenda: { [Op.iLike]: like } }, { content: { [Op.iLike]: like } }, { attendees: { [Op.iLike]: like } }];
    }
    if (req.query.year) where.year = Number(req.query.year);
    if (req.query.status) where.status = String(req.query.status);
    const list = await CouncilMinute.findAll({
      where,
      attributes: ['id', 'number', 'year', 'date', 'kind', 'title', 'status', 'driveUrl', 'approvedAt', 'createdAt'],
      order: [['date', 'DESC'], ['number', 'DESC']],
    });
    res.json(list);
  }),
);

libraryRouter.get(
  '/minutes/:id',
  authorize('documents', 'view'),
  ah(async (req, res) => {
    const m = await CouncilMinute.findByPk(req.params.id, { include: [{ model: User, as: 'createdBy', attributes: ['id', 'name'] }] });
    if (!m) throw notFound();
    const sentBy = m.agendaSentByUserId ? await User.findByPk(m.agendaSentByUserId, { attributes: ['id', 'name'] }) : null;
    res.json({ ...m.toJSON(), agendaSentBy: sentBy, canSendAgenda: await isJefaturaUser(req.user!.id, req.auth!.isSuperadmin) });
  }),
);

libraryRouter.post(
  '/minutes',
  authorize('documents', 'create'),
  ah(async (req, res) => {
    const data = parse(minuteSchema, req.body);
    const year = Number(data.date.slice(0, 4));
    const m = await sequelize.transaction(async (transaction) => {
      // Numeración correlativa por año: Acta N° 1/2026, 2/2026…
      const last = (await CouncilMinute.max('number', { where: { year }, transaction, paranoid: false })) as number | null;
      return CouncilMinute.create(
        {
          ...data,
          number: (last ?? 0) + 1,
          year,
          approvedAt: data.status === 'aprobada' ? new Date() : null,
          createdByUserId: req.user!.id,
        },
        { transaction },
      );
    });
    res.status(201).json(m);
  }),
);

libraryRouter.put(
  '/minutes/:id',
  authorize('documents', 'edit'),
  ah(async (req, res) => {
    const m = await CouncilMinute.findByPk(req.params.id);
    if (!m) throw notFound();
    const data = parse(minuteSchema, req.body);
    if (Number(data.date.slice(0, 4)) !== m.year) {
      throw badRequest('Revisá los datos', { date: `El acta es del ${m.year}: para otro año creá una nueva` });
    }
    const approvedAt = data.status === 'aprobada' ? m.approvedAt ?? new Date() : null;
    await m.update({ ...data, approvedAt });
    res.json(m);
  }),
);

// ---- Temario del Consejo: la Jefatura lo manda como aviso unos días antes ----
const agendaSchema = z.object({
  audience: z.enum(['educadores', 'todos']).default('educadores'),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => v || null),
});

libraryRouter.get(
  '/minutes/:id/agenda-recipients',
  authorize('documents', 'view'),
  ah(async (req, res) => {
    if (!(await isJefaturaUser(req.user!.id, req.auth!.isSuperadmin))) throw forbidden();
    const [educadores, todos] = await Promise.all([councilRecipients('educadores', req.user!.id), councilRecipients('todos', req.user!.id)]);
    res.json({
      educadores: { users: educadores.userIds.length, emails: educadores.emails.length },
      todos: { users: todos.userIds.length, emails: todos.emails.length },
    });
  }),
);

libraryRouter.post(
  '/minutes/:id/send-agenda',
  authorize('documents', 'view'),
  ah(async (req, res) => {
    if (!(await isJefaturaUser(req.user!.id, req.auth!.isSuperadmin))) throw forbidden('El temario del Consejo lo manda la Jefatura de Grupo');
    const m = await CouncilMinute.findByPk(req.params.id);
    if (!m) throw notFound();
    if (!m.agenda?.trim()) throw badRequest('Primero cargá el orden del día (temario) en el acta');
    const d = parse(agendaSchema, req.body);
    const actor = req.user!;
    const recipients = await councilRecipients(d.audience, actor.id);
    if (!recipients.userIds.length && !recipients.emails.length) throw badRequest('No hay a quién mandarle el temario (adultos con cargo este año)');
    const topics = m.agenda
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const title = `Temario del Consejo del ${formatDate(m.date)}: ${m.title}`;
    await notify({
      recipients,
      kind: 'consejo',
      title,
      body: [d.message, topics.slice(0, 4).join(' · ') + (topics.length > 4 ? ' …' : '')].filter(Boolean).join(' — '),
      link: `/actas/${m.id}`,
      email: {
        subject: title,
        paragraphs: [
          `${actor.name}, de la Jefatura de Grupo, comparte el temario del Consejo de Grupo del ${formatDate(m.date)}.`,
          ...(d.message ? [d.message] : []),
          'Orden del día:',
          ...topics.map((t) => (/^[-•*\d]/.test(t) ? t : `• ${t}`)),
          'Si querés sumar un tema, avisale a la Jefatura antes del Consejo.',
        ],
        button: 'Ver el temario en ALCOMBAR',
        footnote: 'Te llega porque sos parte del Consejo de Grupo.',
      },
    });
    await m.update({ agendaSentAt: new Date(), agendaSentByUserId: actor.id, agendaMessage: d.message });
    res.json({ ok: true, users: recipients.userIds.length, emails: recipients.emails.length });
  }),
);

libraryRouter.delete(
  '/minutes/:id',
  authorize('documents', 'delete'),
  ah(async (req, res) => {
    const m = await CouncilMinute.findByPk(req.params.id);
    if (!m) throw notFound();
    if (m.status === 'aprobada') throw badRequest('Un acta aprobada no se elimina. Si hay un error, dejá constancia en la próxima acta.');
    await m.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Documentos ----------------
libraryRouter.get(
  '/documents',
  authorize('documents', 'view'),
  ah(async (req, res) => {
    const where: Record<string | symbol, unknown> = {};
    const q = String(req.query.q ?? '').trim();
    if (q) {
      const like = `%${q}%`;
      where[Op.or] = [{ title: { [Op.iLike]: like } }, { description: { [Op.iLike]: like } }];
    }
    if (req.query.category) where.category = String(req.query.category);
    const unit = String(req.query.unitId ?? '');
    if (unit === 'grupo') where.unitId = null;
    else if (unit) where.unitId = unit;
    const list = await DocumentLink.findAll({
      where,
      include: [{ model: Unit, as: 'unit', attributes: unitAttrs }],
      order: [['category', 'ASC'], ['title', 'ASC']],
    });
    res.json(list);
  }),
);

async function checkUnit(unitId: string | null) {
  if (unitId && !(await Unit.findByPk(unitId))) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
}

libraryRouter.post(
  '/documents',
  authorize('documents', 'create'),
  ah(async (req, res) => {
    const data = parse(documentLinkSchema, req.body);
    await checkUnit(data.unitId);
    res.status(201).json(await DocumentLink.create({ ...data, createdByUserId: req.user!.id }));
  }),
);

libraryRouter.put(
  '/documents/:id',
  authorize('documents', 'edit'),
  ah(async (req, res) => {
    const d = await DocumentLink.findByPk(req.params.id);
    if (!d) throw notFound();
    const data = parse(documentLinkSchema, req.body);
    await checkUnit(data.unitId);
    await d.update(data);
    res.json(d);
  }),
);

libraryRouter.delete(
  '/documents/:id',
  authorize('documents', 'delete'),
  ah(async (req, res) => {
    const d = await DocumentLink.findByPk(req.params.id);
    if (!d) throw notFound();
    await d.destroy();
    res.json({ ok: true });
  }),
);

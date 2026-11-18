/**
 * Etapa 6: eventos del Grupo (fogón, aniversario, recaudación): presupuesto, tareas y compras, movimientos y rendición.
 * Lo real sale de los movimientos de contabilidad vinculados al evento.
 */
import { Router } from 'express';
import { accountIdsFor } from '../lib/accountAccess';
import { Op, QueryTypes } from 'sequelize';
import { eventBudgetLineSchema, eventSchema, eventTaskSchema, renderSchema, round2 } from '../shared';
import { sequelize } from '../db';
import { Adult, User } from '../models';
import { Account, Category, EventBudgetLine, EventTask, GroupEvent, Movement, NATURE, SIGNED } from '../models/treasury';
import { ah, badRequest, notFound, parse } from '../lib/errors';
import { authorize } from '../middlewares/auth';
import { can } from '../shared';

export const eventsRouter = Router();

const adultAttrs = ['id', 'firstName', 'lastName', 'totem'];

async function realTotals(eventIds: string[]) {
  if (!eventIds.length) return () => ({ ingresos: 0, egresos: 0 });
  const rows = await sequelize.query<{ event_id: string; kind: string; total: string }>(
    // Las anulaciones (contra-asientos) restan de la naturaleza original: anular un gasto baja los gastos, no suma ingresos
    `SELECT event_id, ${NATURE} AS kind, SUM(${SIGNED}) AS total FROM transactions WHERE deleted_at IS NULL AND event_id IN (:ids) GROUP BY 1, 2`,
    { type: QueryTypes.SELECT, replacements: { ids: eventIds } },
  );
  return (id: string) => ({
    ingresos: round2(Number(rows.find((r) => r.event_id === id && r.kind === 'ingreso')?.total ?? 0)),
    egresos: round2(Number(rows.find((r) => r.event_id === id && r.kind === 'egreso')?.total ?? 0)),
  });
}

eventsRouter.get(
  '/',
  authorize('events', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || 0;
    const where: Record<string | symbol, unknown> = {};
    if (year) where[Op.or as unknown as string] = [{ date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } }, { date: null }];
    if (req.query.status) where.status = String(req.query.status);
    const events = await GroupEvent.findAll({
      where,
      include: [
        { model: Adult, as: 'responsible', attributes: adultAttrs },
        { model: EventBudgetLine, as: 'budgetLines', attributes: ['kind', 'planned'] },
        { model: EventTask, as: 'tasks', attributes: ['id', 'done'] },
      ],
      order: [['date', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
    });
    const real = await realTotals(events.map((e) => e.id));
    res.json(
      events.map((e) => {
        const r = real(e.id);
        const lines = e.budgetLines ?? [];
        const tasks = e.tasks ?? [];
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          date: e.date,
          place: e.place,
          status: e.status,
          responsible: e.responsible,
          plannedIncome: round2(lines.filter((l) => l.kind === 'ingreso').reduce((s, l) => s + l.planned, 0)),
          plannedExpense: round2(lines.filter((l) => l.kind === 'egreso').reduce((s, l) => s + l.planned, 0)),
          ...r,
          resultado: round2(r.ingresos - r.egresos),
          tasks: { total: tasks.length, done: tasks.filter((t) => t.done).length },
        };
      }),
    );
  }),
);

eventsRouter.post(
  '/',
  authorize('events', 'create'),
  ah(async (req, res) => {
    res.status(201).json(await GroupEvent.create(parse(eventSchema, req.body)));
  }),
);

eventsRouter.get(
  '/:id',
  authorize('events', 'view'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id, {
      include: [
        { model: Adult, as: 'responsible', attributes: adultAttrs },
        { model: EventTask, as: 'tasks', include: [{ model: Adult, as: 'responsible', attributes: adultAttrs }] },
        { model: EventBudgetLine, as: 'budgetLines' },
      ],
      order: [
        [{ model: EventTask, as: 'tasks' }, 'done', 'ASC'],
        [{ model: EventTask, as: 'tasks' }, 'dueDate', 'ASC'],
        [{ model: EventBudgetLine, as: 'budgetLines' }, 'kind', 'DESC'],
      ],
    });
    if (!e) throw notFound();
    // Solo los movimientos de las cuentas que puede ver (todas, o las de su unidad)
    const visible = await accountIdsFor(req.auth, 'view');
    const movements = can(req.auth, 'accounting', 'view')
      ? await Movement.findAll({
          where: { eventId: e.id, ...(visible ? { accountId: visible } : {}) },
          include: [
            { model: Account, as: 'account', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: User, as: 'createdBy', attributes: ['id', 'name'] },
          ],
          order: [['date', 'ASC'], ['createdAt', 'ASC']],
        })
      : [];
    const r = (await realTotals([e.id]))(e.id);
    const lines = e.budgetLines ?? [];
    res.json({
      ...e.toJSON(),
      movements,
      totals: {
        plannedIncome: round2(lines.filter((l) => l.kind === 'ingreso').reduce((s, l) => s + l.planned, 0)),
        plannedExpense: round2(lines.filter((l) => l.kind === 'egreso').reduce((s, l) => s + l.planned, 0)),
        ...r,
        resultado: round2(r.ingresos - r.egresos),
      },
      canEdit: can(req.auth, 'events', 'edit'),
      canDelete: can(req.auth, 'events', 'delete'),
      canApprove: can(req.auth, 'events', 'approve'),
      canRecord: can(req.auth, 'accounting', 'create'),
    });
  }),
);

eventsRouter.put(
  '/:id',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    const data = parse(eventSchema, req.body);
    if (e.status === 'rendido') throw badRequest('El evento ya está rendido');
    await e.update(data);
    res.json(e);
  }),
);

eventsRouter.delete(
  '/:id',
  authorize('events', 'delete'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    if (await Movement.count({ where: { eventId: e.id } })) throw badRequest('El evento tiene movimientos en contabilidad: no se puede eliminar');
    await e.destroy();
    res.json({ ok: true });
  }),
);

/** Rendición final: resultado, sobrantes y evaluación. Rendir (y reabrir) lo hace quien aprueba eventos. */
eventsRouter.post(
  '/:id/render',
  authorize('events', 'approve'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    const data = parse(renderSchema, req.body);
    await e.update({ ...data, status: 'rendido', renderedAt: new Date() });
    res.json(e);
  }),
);
eventsRouter.post(
  '/:id/reopen',
  authorize('events', 'approve'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    await e.update({ status: 'en_curso', renderedAt: null });
    res.json(e);
  }),
);

// ---- Tareas y compras ----
eventsRouter.post(
  '/:id/tasks',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    res.status(201).json(await EventTask.create({ ...parse(eventTaskSchema, req.body), eventId: e.id }));
  }),
);
eventsRouter.put(
  '/tasks/:tid',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const t = await EventTask.findByPk(req.params.tid);
    if (!t) throw notFound();
    await t.update(parse(eventTaskSchema, req.body));
    res.json(t);
  }),
);
eventsRouter.delete(
  '/tasks/:tid',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const t = await EventTask.findByPk(req.params.tid);
    if (!t) throw notFound();
    await t.destroy();
    res.json({ ok: true });
  }),
);

// ---- Presupuesto ----
eventsRouter.post(
  '/:id/budget',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const e = await GroupEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    res.status(201).json(await EventBudgetLine.create({ ...parse(eventBudgetLineSchema, req.body), eventId: e.id }));
  }),
);
eventsRouter.put(
  '/budget/:lid',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const l = await EventBudgetLine.findByPk(req.params.lid);
    if (!l) throw notFound();
    await l.update(parse(eventBudgetLineSchema, req.body));
    res.json(l);
  }),
);
eventsRouter.delete(
  '/budget/:lid',
  authorize('events', 'edit'),
  ah(async (req, res) => {
    const l = await EventBudgetLine.findByPk(req.params.lid);
    if (!l) throw notFound();
    await l.destroy();
    res.json({ ok: true });
  }),
);

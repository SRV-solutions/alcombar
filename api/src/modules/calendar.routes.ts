import { Router, type Request } from 'express';
import { Op } from 'sequelize';
import { calendarEventSchema, can, canGroupWide, rotationSchema, unitsWith, type CalendarType } from '../shared';
import { sequelize } from '../db';
import { Unit } from '../models';
import { CalendarEvent } from '../models/operations';
import { writeAudit } from '../lib/audit';
import { ah, badRequest, notFound, parse } from '../lib/errors';
import { assertCan, authorize } from '../middlewares/auth';

/** Etapa 8: calendario del Grupo y de cada unidad. */
export const calendarRouter = Router();

export interface CalendarItem {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' (todo el día) o 'YYYY-MM-DDTHH:MM' */
  start: string;
  end: string;
  allDay: boolean;
  unit: { id: string; name: string; code: string; branch: string } | null;
  type: CalendarType | string;
  place: string | null;
  description?: string | null;
  /** De dónde viene: 'calendar' (cargado acá) o el módulo que lo aporta (campamentos, eventos, fichas…). */
  source: string;
  /** Pantalla de la app para ver el detalle (para los que vienen de otros módulos). */
  link: string | null;
  editable: boolean;
}

/**
 * Fuentes extra de eventos (campamentos, eventos del Grupo, fichas…). Cada módulo registra una función con
 * calendarSources.push(...). Si una fuente falla, el calendario sigue funcionando con las demás.
 */
export type CalendarSource = (req: Request, from: string, to: string) => Promise<CalendarItem[]>;
export const calendarSources: CalendarSource[] = [];

const unitAttrs = ['id', 'name', 'code', 'branch'];
const isoDate = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function toItem(req: Request, e: CalendarEvent): CalendarItem {
  return {
    id: e.id,
    title: e.title,
    start: e.allDay || !e.startTime ? e.startDate : `${e.startDate}T${e.startTime}`,
    end: e.allDay || !e.endTime ? e.endDate : `${e.endDate}T${e.endTime}`,
    allDay: e.allDay,
    unit: e.unit ? { id: e.unit.id, name: e.unit.name, code: e.unit.code, branch: e.unit.branch } : null,
    type: e.type,
    place: e.place,
    description: e.description,
    source: 'calendar',
    link: null,
    editable: can(req.auth, 'calendar', 'edit', e.unitId),
  };
}

calendarRouter.get(
  '/',
  authorize('calendar', 'view'),
  ah(async (req, res) => {
    const now = new Date();
    const from = isoDate(req.query.from) ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = isoDate(req.query.to) ?? addDays(from, 41);
    if (to < from) throw badRequest('El rango de fechas es inválido');

    // Quien ve solo su unidad ve también lo del Grupo
    const allowed = unitsWith(req.auth, 'calendar', 'view');
    const where: Record<string | symbol, unknown> = { startDate: { [Op.lte]: to }, endDate: { [Op.gte]: from } };
    if (allowed !== 'all') where[Op.or] = [{ unitId: null }, { unitId: allowed }];
    const events = await CalendarEvent.findAll({ where, include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] });
    let items = events.map((e) => toItem(req, e));

    for (const source of calendarSources) {
      try {
        items = items.concat(await source(req, from, to));
      } catch (e) {
        console.error('[calendario] una fuente falló:', (e as Error).message);
      }
    }

    const unitId = String(req.query.unitId ?? '');
    if (unitId === 'grupo') items = items.filter((i) => !i.unit);
    else if (unitId) items = items.filter((i) => !i.unit || i.unit.id === unitId); // lo del Grupo también le corresponde a la unidad
    if (req.query.type) items = items.filter((i) => i.type === String(req.query.type));
    if (allowed !== 'all') items = items.filter((i) => !i.unit || allowed.includes(i.unit.id));
    items.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
    res.json({ from, to, items });
  }),
);

calendarRouter.get(
  '/:id',
  authorize('calendar', 'view'),
  ah(async (req, res) => {
    const e = await CalendarEvent.findByPk(req.params.id, { include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] });
    if (!e) throw notFound();
    res.json({ ...e.toJSON(), editable: can(req.auth, 'calendar', 'edit', e.unitId), deletable: can(req.auth, 'calendar', 'delete', e.unitId) });
  }),
);

async function checkUnit(unitId: string | null) {
  if (unitId && !(await Unit.findByPk(unitId))) throw badRequest('Revisá los datos', { unitId: 'Unidad inexistente' });
}

calendarRouter.post(
  '/',
  ah(async (req, res) => {
    const data = parse(calendarEventSchema, req.body);
    // Evento de una unidad: su unidad; evento del Grupo: permiso para todo el Grupo
    assertCan(req, 'calendar', 'create', data.unitId);
    await checkUnit(data.unitId);
    const e = await CalendarEvent.create({ ...data, createdByUserId: req.user!.id });
    res.status(201).json(e);
  }),
);

calendarRouter.put(
  '/:id',
  ah(async (req, res) => {
    const e = await CalendarEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    assertCan(req, 'calendar', 'edit', e.unitId);
    const data = parse(calendarEventSchema, req.body);
    if (data.unitId !== e.unitId) assertCan(req, 'calendar', 'create', data.unitId);
    await checkUnit(data.unitId);
    await e.update(data);
    res.json(e);
  }),
);

calendarRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const e = await CalendarEvent.findByPk(req.params.id);
    if (!e) throw notFound();
    assertCan(req, 'calendar', 'delete', e.unitId);
    await e.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Servicio rotativo ----------------
/** Asigna las unidades por turno (en el orden elegido) a cada día de la semana indicado entre dos fechas. */
async function planRotation(data: { from: string; to: string; unitIds: string[]; weekday: number; skipExisting: boolean }) {
  const units = await Unit.findAll({ where: { id: data.unitIds } });
  if (units.length !== data.unitIds.length) throw badRequest('Revisá los datos', { unitIds: 'Hay una unidad que no existe' });
  const ordered = data.unitIds.map((id) => units.find((u) => u.id === id)!);
  const dates: string[] = [];
  let d = data.from;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== data.weekday) d = addDays(d, 1);
  for (; d <= data.to; d = addDays(d, 7)) dates.push(d);
  if (dates.length > 120) throw badRequest('Revisá los datos', { to: 'El rango es demasiado largo (máximo 120 fechas)' });
  const existing = dates.length
    ? await CalendarEvent.findAll({ where: { type: 'servicio', startDate: dates }, include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] })
    : [];
  let turn = 0;
  const plan = dates.map((date) => {
    const already = existing.filter((e) => e.startDate === date);
    if (already.length && data.skipExisting) {
      return { date, unit: null, skipped: true, existing: already.map((e) => e.unit?.name ?? e.title) };
    }
    const unit = ordered[turn % ordered.length];
    turn++;
    return {
      date,
      unit: { id: unit.id, name: unit.name, code: unit.code, branch: unit.branch },
      skipped: false,
      existing: already.map((e) => e.unit?.name ?? e.title),
    };
  });
  return plan;
}

calendarRouter.post(
  '/rotation/preview',
  ah(async (req, res) => {
    assertCan(req, 'calendar', 'create', null);
    const data = parse(rotationSchema, req.body);
    res.json({ plan: await planRotation(data) });
  }),
);

calendarRouter.post(
  '/rotation',
  ah(async (req, res) => {
    assertCan(req, 'calendar', 'create', null);
    if (!canGroupWide(req.auth, 'calendar', 'create')) throw badRequest('Solo quien gestiona el calendario del Grupo puede armar el servicio rotativo');
    const data = parse(rotationSchema, req.body);
    const plan = (await planRotation(data)).filter((p) => !p.skipped && p.unit);
    await sequelize.transaction(async (transaction) => {
      await CalendarEvent.bulkCreate(
        plan.map((p) => ({
          title: `Servicio rotativo: ${p.unit!.name}`,
          type: 'servicio',
          unitId: p.unit!.id,
          startDate: p.date,
          endDate: p.date,
          allDay: !data.startTime,
          startTime: data.startTime,
          endTime: data.startTime ? data.endTime : null,
          place: data.place,
          description: null,
          createdByUserId: req.user!.id,
        })),
        { transaction },
      );
      await writeAudit(
        {
          action: 'create',
          entity: 'CalendarEvent',
          summary: `Servicio rotativo: ${plan.length} fechas entre ${data.from} y ${data.to}`,
          changes: { fechas: plan.map((p) => `${p.date} ${p.unit!.code}`) },
        },
        transaction,
      );
    });
    res.status(201).json({ created: plan.length });
  }),
);

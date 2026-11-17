/**
 * Sábados del año: el calendario anual del Grupo, con las mismas filas que la planilla (efemérides, formación,
 * servicio/misa, reuniones, actividades y otros).
 * - Lo modifica solo la Jefatura de Grupo.
 * - Los adultos de una unidad que está de servicio pueden cambiar ese día con otro sábado: las unidades de los dos
 *   días se intercambian (por defecto, todas las de cada día, porque el servicio es por rama) y se avisa a los adultos
 *   de todas las unidades que se movieron (campanita + mail).
 * Las unidades de servicio son eventos "servicio" del calendario, así se siguen viendo en el calendario mensual.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { can, formatDate } from '../shared';
import { sequelize } from '../db';
import { Unit } from '../models';
import { CalendarEvent, Saturday } from '../models/operations';
import { writeAudit } from '../lib/audit';
import { ah, badRequest, forbidden, parse } from '../lib/errors';
import { notify, unitTeamRecipients } from '../lib/notify';
import { authorize } from '../middlewares/auth';
import { addDays, calendarSources, isJefatura } from './calendar.routes';

export const saturdaysRouter = Router();

const unitAttrs = ['id', 'name', 'code', 'branch'];
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');
const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
/** "sábado 21/11" */
const dayLabel = (iso: string) => `sábado ${formatDate(iso).slice(0, 5)}`;

function saturdaysOf(year: number) {
  const out: string[] = [];
  let d = `${year}-01-01`;
  while (weekday(d) !== 6) d = addDays(d, 1);
  for (; d.startsWith(String(year)); d = addDays(d, 7)) out.push(d);
  return out;
}

const serviceTitle = (u: { name: string }) => `Servicio: ${u.name}`;

saturdaysRouter.get(
  '/',
  authorize('calendar', 'view'),
  ah(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    if (year < 2000 || year > 2100) throw badRequest('Año inválido');
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const [services, rows, groupEvents, jefatura] = await Promise.all([
      CalendarEvent.findAll({ where: { type: 'servicio', startDate: { [Op.between]: [from, to] } }, include: [{ model: Unit, as: 'unit', attributes: unitAttrs }] }),
      Saturday.findAll({ where: { date: { [Op.between]: [from, to] } } }),
      CalendarEvent.findAll({ where: { type: { [Op.notIn]: ['servicio'] }, unitId: null, startDate: { [Op.lte]: to }, endDate: { [Op.gte]: from } } }),
      isJefatura(req),
    ]);
    // Campamentos y eventos del Grupo (de otros módulos) que caen en sábado
    const extra: { title: string; start: string; end: string; link: string | null; unit: string | null }[] = [];
    for (const source of calendarSources) {
      try {
        for (const it of await source(req, from, to)) {
          if (it.source === 'fichas' || it.source === 'sabados') continue;
          extra.push({ title: it.title, start: it.start.slice(0, 10), end: it.end.slice(0, 10), link: it.link, unit: it.unit?.code ?? null });
        }
      } catch {
        /* si una fuente falla, el resto sigue */
      }
    }
    const saturdays = saturdaysOf(year).map((date) => {
      const r = rows.find((x) => x.date === date);
      return {
        date,
        noActivity: r?.noActivity ?? false,
        ephemeris: r?.ephemeris ?? null,
        training: r?.training ?? null,
        serviceNote: r?.serviceNote ?? null,
        meetings: r?.meetings ?? null,
        activities: r?.activities ?? null,
        others: r?.others ?? null,
        services: services
          .filter((e) => e.startDate === date && e.unit)
          .map((e) => ({ eventId: e.id, unit: { id: e.unit!.id, name: e.unit!.name, code: e.unit!.code, branch: e.unit!.branch } })),
        linked: [
          ...groupEvents.filter((e) => e.startDate <= date && e.endDate >= date).map((e) => ({ title: e.title, link: null, unit: null })),
          ...extra.filter((e) => e.start <= date && e.end >= date).map((e) => ({ title: e.title, link: e.link, unit: e.unit })),
        ],
        updatedAt: r?.updatedAt ?? null,
      };
    });
    // Servicios cargados en otro día de la semana: se muestran aparte
    const otherDays = services
      .filter((e) => weekday(e.startDate) !== 6 && e.unit)
      .map((e) => ({ date: e.startDate, eventId: e.id, unit: { id: e.unit!.id, name: e.unit!.name, code: e.unit!.code, branch: e.unit!.branch } }));
    const units = await Unit.findAll({ where: { active: true }, attributes: unitAttrs });
    res.json({
      year,
      canEdit: jefatura,
      // Unidades cuyo día de servicio puede cambiar esta persona (las suyas, o todas si es Jefatura)
      myUnitIds: jefatura ? units.map((u) => u.id) : units.filter((u) => can(req.auth, 'calendar', 'edit', u.id)).map((u) => u.id),
      saturdays,
      otherDays,
    });
  }),
);

// ---------------- Edición (solo Jefatura) ----------------
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);
const editSchema = z.object({
  serviceUnitIds: z.array(z.string().uuid()).max(20).default([]),
  serviceNote: optText(200),
  noActivity: z.boolean().default(false),
  ephemeris: optText(1000),
  training: optText(1000),
  meetings: optText(1000),
  activities: optText(1000),
  others: optText(1000),
});

saturdaysRouter.put(
  '/:date',
  ah(async (req, res) => {
    if (!(await isJefatura(req))) throw forbidden('El calendario de sábados lo modifica solo la Jefatura de Grupo');
    const date = parse(isoDate, req.params.date);
    const d = parse(editSchema, req.body);
    const ids = [...new Set(d.serviceUnitIds)];
    const units = ids.length ? await Unit.findAll({ where: { id: ids } }) : [];
    if (units.length !== ids.length) throw badRequest('Revisá los datos', { serviceUnitIds: 'Hay una unidad que no existe' });
    const added: Unit[] = [];
    const removed: Unit[] = [];
    await sequelize.transaction(async (transaction) => {
      const current = await CalendarEvent.findAll({ where: { type: 'servicio', startDate: date }, include: [{ model: Unit, as: 'unit', attributes: unitAttrs }], transaction });
      for (const e of current) {
        if (!e.unitId || !ids.includes(e.unitId)) {
          if (e.unit) removed.push(e.unit);
          await e.destroy({ transaction });
        }
      }
      for (const u of units) {
        if (current.some((e) => e.unitId === u.id)) continue;
        added.push(u);
        await CalendarEvent.create(
          {
            title: serviceTitle(u),
            type: 'servicio',
            unitId: u.id,
            startDate: date,
            endDate: date,
            allDay: true,
            startTime: null,
            endTime: null,
            place: null,
            description: null,
            createdByUserId: req.user!.id,
          },
          { transaction },
        );
      }
      const values = {
        noActivity: d.noActivity,
        serviceNote: d.serviceNote,
        ephemeris: d.ephemeris,
        training: d.training,
        meetings: d.meetings,
        activities: d.activities,
        others: d.others,
        updatedByUserId: req.user!.id,
      };
      const row = await Saturday.findOne({ where: { date }, transaction });
      if (row) await row.update(values, { transaction });
      else await Saturday.create({ date, ...values }, { transaction });
    });
    // Aviso a las unidades que entran o salen del servicio de ese sábado
    const actor = req.user!;
    for (const [list, verb] of [
      [added, 'tiene servicio'],
      [removed, 'ya no tiene servicio'],
    ] as const) {
      for (const u of list) {
        void notify({
          recipients: await unitTeamRecipients([u.id], actor.id),
          kind: 'servicio',
          title: `${u.name} ${verb} el ${dayLabel(date)}`,
          body: `Lo cambió ${actor.name} (Jefatura) en el calendario de sábados.`,
          link: `/calendario/sabados?anio=${date.slice(0, 4)}#s-${date}`,
          email: {
            subject: `Servicio: ${u.name} ${verb} el ${dayLabel(date)}`,
            paragraphs: [`${actor.name}, de la Jefatura de Grupo, modificó el calendario de sábados: ${u.name} ${verb} el ${dayLabel(date)} (${formatDate(date)}).`],
            button: 'Ver el calendario de sábados',
            footnote: `Te llega porque sos adulto de ${u.name}.`,
          },
        });
      }
    }
    res.json({ ok: true, added: added.length, removed: removed.length });
  }),
);

// ---------------- Cambio de día de servicio ----------------
const swapSchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  /** Unidades que pasan del primer sábado al segundo. */
  unitIds: z.array(z.string().uuid()).min(1, 'Elegí al menos una unidad'),
  /** Unidades que pasan del segundo sábado al primero (puede estar vacío si ese día no tenía servicio). */
  withUnitIds: z.array(z.string().uuid()).default([]),
  reason: optText(300),
});

saturdaysRouter.post(
  '/swap',
  ah(async (req, res) => {
    const d = parse(swapSchema, req.body);
    if (d.fromDate === d.toDate) throw badRequest('Revisá los datos', { toDate: 'Elegí otro sábado' });
    const jefatura = await isJefatura(req);
    // Lo hacen los adultos de alguna de las unidades que se mueven (o la Jefatura)
    if (!jefatura && ![...d.unitIds, ...d.withUnitIds].some((u) => can(req.auth, 'calendar', 'edit', u))) {
      throw forbidden('Solo los adultos de las unidades que se cambian (o la Jefatura) pueden cambiar el día de servicio');
    }
    const [fromEvents, toEvents] = await Promise.all([
      CalendarEvent.findAll({ where: { type: 'servicio', startDate: d.fromDate } }),
      CalendarEvent.findAll({ where: { type: 'servicio', startDate: d.toDate } }),
    ]);
    const moving = fromEvents.filter((e) => e.unitId && d.unitIds.includes(e.unitId));
    const back = toEvents.filter((e) => e.unitId && d.withUnitIds.includes(e.unitId));
    if (moving.length !== new Set(d.unitIds).size) throw badRequest('Alguna de las unidades elegidas no tiene servicio ese sábado');
    if (back.length !== new Set(d.withUnitIds).size) throw badRequest('Alguna de las unidades del otro sábado no tiene servicio ese día');
    // Que nadie quede dos veces el mismo día
    const stayingTo = toEvents.filter((e) => !back.includes(e)).map((e) => e.unitId);
    const stayingFrom = fromEvents.filter((e) => !moving.includes(e)).map((e) => e.unitId);
    if (moving.some((e) => stayingTo.includes(e.unitId))) throw badRequest('Una de las unidades ya tiene servicio el otro sábado');
    if (back.some((e) => stayingFrom.includes(e.unitId))) throw badRequest('Una de las unidades del otro sábado ya tiene servicio el primero');

    // Si se cambia el servicio completo de los dos días, también se intercambia la aclaración ("Familia Scout", "ACA"…)
    const wholeDays = moving.length === fromEvents.length && back.length === toEvents.length;
    const unitIds = [...new Set([...d.unitIds, ...d.withUnitIds])];
    const units = await Unit.findAll({ where: { id: unitIds }, attributes: unitAttrs });
    const names = (ids: string[]) => units.filter((u) => ids.includes(u.id)).map((u) => u.name);
    const codes = (ids: string[]) => units.filter((u) => ids.includes(u.id)).map((u) => u.code);

    await sequelize.transaction(async (transaction) => {
      for (const e of moving) await e.update({ startDate: d.toDate, endDate: d.toDate }, { transaction });
      for (const e of back) await e.update({ startDate: d.fromDate, endDate: d.fromDate }, { transaction });
      if (wholeDays) {
        const [a, b] = await Promise.all([Saturday.findOne({ where: { date: d.fromDate }, transaction }), Saturday.findOne({ where: { date: d.toDate }, transaction })]);
        const noteA = a?.serviceNote ?? null;
        const noteB = b?.serviceNote ?? null;
        if (noteA !== noteB) {
          if (a) await a.update({ serviceNote: noteB }, { transaction });
          else if (noteB) await Saturday.create({ date: d.fromDate, serviceNote: noteB, ephemeris: null, training: null, meetings: null, activities: null, others: null, updatedByUserId: req.user!.id }, { transaction });
          if (b) await b.update({ serviceNote: noteA }, { transaction });
          else if (noteA) await Saturday.create({ date: d.toDate, serviceNote: noteA, ephemeris: null, training: null, meetings: null, activities: null, others: null, updatedByUserId: req.user!.id }, { transaction });
        }
      }
      await writeAudit(
        {
          action: 'update',
          entity: 'CalendarEvent',
          summary: `Cambio de servicio: ${codes(d.unitIds).join('+')} ${d.fromDate} ↔ ${codes(d.withUnitIds).join('+') || 'nadie'} ${d.toDate}`,
          changes: { de: d.fromDate, a: d.toDate, pasan: codes(d.unitIds), vuelven: codes(d.withUnitIds), motivo: d.reason },
        },
        transaction,
      );
    });

    const actor = req.user!;
    const goA = names(d.unitIds).join(', ');
    const goB = names(d.withUnitIds).join(', ');
    const summary = goB ? `${goA} pasa al ${dayLabel(d.toDate)} y ${goB} al ${dayLabel(d.fromDate)}` : `${goA} pasa del ${dayLabel(d.fromDate)} al ${dayLabel(d.toDate)}`;
    void notify({
      recipients: await unitTeamRecipients(unitIds, actor.id),
      kind: 'servicio',
      title: `Cambio de servicio: ${summary}`,
      body: `Lo cambió ${actor.name}${d.reason ? ` · ${d.reason}` : ''}`,
      link: `/calendario/sabados?anio=${d.toDate.slice(0, 4)}#s-${d.toDate}`,
      email: {
        subject: `Cambio de servicio: ${summary}`,
        paragraphs: [
          `${actor.name} cambió el día de servicio:`,
          `• ${goA}: del ${dayLabel(d.fromDate)} (${formatDate(d.fromDate)}) al ${dayLabel(d.toDate)} (${formatDate(d.toDate)}).`,
          ...(goB ? [`• ${goB}: del ${dayLabel(d.toDate)} (${formatDate(d.toDate)}) al ${dayLabel(d.fromDate)} (${formatDate(d.fromDate)}).`] : []),
          ...(d.reason ? [`Motivo: ${d.reason}`] : []),
        ],
        button: 'Ver el calendario de sábados',
        footnote: 'Te llega porque sos adulto de una de las unidades que cambiaron su día de servicio.',
      },
    });
    res.json({ ok: true });
  }),
);

/** Para el calendario mensual: lo cargado en cada sábado (actividades, reuniones, receso…) como un ítem del día. */
calendarSources.push(async (_req, from, to) => {
  const rows = await Saturday.findAll({ where: { date: { [Op.between]: [from, to] } } });
  return rows
    .map((r) => {
      const parts = [r.noActivity ? 'Sin actividad' : null, r.activities, r.meetings, r.others].filter((x): x is string => !!x && !!x.trim());
      if (!parts.length) return null;
      const title = parts.map((p) => p.replace(/\s+/g, ' ').trim()).join(' · ');
      return {
        id: r.id,
        title: title.length > 90 ? `${title.slice(0, 87)}…` : title,
        start: r.date,
        end: r.date,
        allDay: true,
        unit: null,
        type: 'otro',
        place: null,
        description: [r.ephemeris, r.training].filter(Boolean).join('\n') || null,
        source: 'sabados',
        link: `/calendario/sabados?anio=${r.date.slice(0, 4)}#s-${r.date}`,
        editable: false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
});


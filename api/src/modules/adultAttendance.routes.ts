/**
 * Asistencia de los educadores (adultos con cargo este año) a las actividades del Grupo. La toma la Jefatura de
 * Grupo (permiso adult_attendance). Mismos estados que la asistencia de los protagonistas.
 */
import { Router } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { adultAttendanceSaveSchema, can, todayIso } from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, AdultAttendance, SupportTeam, Unit } from '../models';
import { writeAudit } from '../lib/audit';
import { ah, badRequest, forbidden, parse } from '../lib/errors';
import { assertCan } from '../middlewares/auth';

export const adultAttendanceRouter = Router();

/** Adultos con cargo en el año de la fecha, con dónde están (unidad, equipo o Grupo) para agruparlos. */
async function educators(year: number) {
  const cargos = await AdultAssignment.findAll({
    where: { year },
    include: [
      { model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName', 'totem', 'status'], required: true, where: { status: { [Op.ne]: 'baja' } } },
      { model: Unit, as: 'unit', attributes: ['id', 'code', 'name', 'branch'] },
      { model: SupportTeam, as: 'supportTeam', attributes: ['id', 'name'] },
    ],
  });
  const byAdult = new Map<string, { id: string; firstName: string; lastName: string; totem: string | null; cargos: string[]; group: string; groupOrder: number }>();
  for (const c of cargos) {
    const a = c.adult!;
    // Dónde se lo agrupa: su unidad si tiene; si no, el Grupo (jefatura) o su equipo
    const where = c.unit ? { group: c.unit.name, order: 1 } : /de grupo/i.test(c.position) || (!c.supportTeam && !c.branch) ? { group: 'Jefatura de Grupo y otros', order: 0 } : { group: 'Equipos de apoyo', order: 2 };
    const label = `${c.position}${c.unit ? ` · ${c.unit.code}` : c.supportTeam ? ` · ${c.supportTeam.name}` : ''}`;
    const cur = byAdult.get(a.id);
    if (!cur) byAdult.set(a.id, { id: a.id, firstName: a.firstName, lastName: a.lastName, totem: a.totem ?? null, cargos: [label], group: where.group, groupOrder: where.order });
    else {
      cur.cargos.push(label);
      // Si además tiene una unidad, se lo agrupa en la unidad
      if (where.order === 1 && cur.groupOrder !== 1) Object.assign(cur, { group: where.group, groupOrder: 1 });
    }
  }
  return [...byAdult.values()].sort((x, y) => x.groupOrder - y.groupOrder || x.group.localeCompare(y.group) || x.lastName.localeCompare(y.lastName));
}

/** Planilla de una fecha. */
adultAttendanceRouter.get(
  '/',
  ah(async (req, res) => {
    assertCan(req, 'adult_attendance', 'view');
    const date = String(req.query.date ?? todayIso());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('Fecha inválida');
    const [list, records] = await Promise.all([educators(Number(date.slice(0, 4))), AdultAttendance.findAll({ where: { date } })]);
    res.json({
      date,
      canEdit: can(req.auth, 'adult_attendance', 'edit'),
      adults: list.map((a) => {
        const r = records.find((x) => x.adultId === a.id);
        return { ...a, status: r?.status ?? null, notes: r?.notes ?? null };
      }),
    });
  }),
);

/** Fechas tomadas en el año y porcentaje de cada adulto. */
adultAttendanceRouter.get(
  '/history',
  ah(async (req, res) => {
    assertCan(req, 'adult_attendance', 'view');
    const year = Number(req.query.year) || new Date().getFullYear();
    const replacements = { from: `${year}-01-01`, to: `${year}-12-31` };
    const dates = await sequelize.query<{ date: string; presentes: number; total: number }>(
      `SELECT date::text AS date, COUNT(*) FILTER (WHERE status IN ('presente','tarde'))::int AS presentes, COUNT(*)::int AS total
       FROM adult_attendances WHERE date BETWEEN :from AND :to GROUP BY date ORDER BY date DESC`,
      { type: QueryTypes.SELECT, replacements },
    );
    const perAdult = await sequelize.query<{ adult_id: string; presentes: number; total: number }>(
      `SELECT adult_id, COUNT(*) FILTER (WHERE status IN ('presente','tarde'))::int AS presentes, COUNT(*)::int AS total
       FROM adult_attendances WHERE date BETWEEN :from AND :to GROUP BY adult_id`,
      { type: QueryTypes.SELECT, replacements },
    );
    res.json({ year, dates, perAdult });
  }),
);

adultAttendanceRouter.put(
  '/',
  ah(async (req, res) => {
    assertCan(req, 'adult_attendance', 'edit');
    const data = parse(adultAttendanceSaveSchema, req.body);
    if (data.date > todayIso()) throw badRequest('No se puede tomar asistencia de una fecha futura');
    const ids = [...new Set(data.records.map((r) => r.adultId))];
    if (ids.length && (await Adult.count({ where: { id: ids } })) !== ids.length) throw forbidden('Hay adultos inexistentes');
    await sequelize.transaction(async (transaction) => {
      if (data.records.length) {
        await AdultAttendance.bulkCreate(
          data.records.map((r) => ({ adultId: r.adultId, date: data.date, status: r.status, notes: r.notes })),
          { transaction, updateOnDuplicate: ['status', 'notes', 'updatedAt'], conflictAttributes: ['adultId', 'date'] },
        );
      }
      const present = data.records.filter((r) => r.status === 'presente' || r.status === 'tarde').length;
      await writeAudit({ action: 'update', entity: 'AdultAttendance', summary: `Asistencia de educadores ${data.date}: ${present}/${data.records.length} presentes` }, transaction);
    });
    res.json({ ok: true });
  }),
);

adultAttendanceRouter.delete(
  '/',
  ah(async (req, res) => {
    assertCan(req, 'adult_attendance', 'edit');
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('Fecha inválida');
    const n = await AdultAttendance.destroy({ where: { date } });
    await writeAudit({ action: 'delete', entity: 'AdultAttendance', summary: `Se borró la asistencia de educadores del ${date} (${n} registros)` });
    res.json({ ok: true });
  }),
);

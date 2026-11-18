import { Router } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { attendanceSaveSchema, can, documentStatus, todayIso } from '../shared';
import { sequelize } from '../db';
import { Attendance, DocumentType, Member, MemberDocument, SmallGroup, Unit } from '../models';
import { writeAudit } from '../lib/audit';
import { ah, badRequest, forbidden, parse } from '../lib/errors';
import { assertCan } from '../middlewares/auth';

export const attendanceRouter = Router();

/** Planilla de asistencia de una unidad para una fecha. */
attendanceRouter.get(
  '/',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    const date = String(req.query.date ?? todayIso());
    if (!unitId) throw badRequest('Falta la unidad');
    assertCan(req, 'attendance', 'view', unitId);
    const [members, records] = await Promise.all([
      Member.findAll({
        where: { unitId, status: 'activo' },
        include: [{ model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name'] }],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      }),
      Attendance.findAll({ where: { unitId, date } }),
    ]);
    res.json({
      unitId,
      date,
      canEdit: can(req.auth, 'attendance', 'edit', unitId),
      members: members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        smallGroup: m.smallGroup,
        status: records.find((r) => r.memberId === m.id)?.status ?? null,
        notes: records.find((r) => r.memberId === m.id)?.notes ?? null,
      })),
    });
  }),
);

/** Historial: fechas con asistencia tomada y porcentaje por protagonista. */
attendanceRouter.get(
  '/history',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    if (!unitId) throw badRequest('Falta la unidad');
    assertCan(req, 'attendance', 'view', unitId);
    const year = Number(req.query.year) || new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const dates = await sequelize.query<{ date: string; presentes: number; total: number }>(
      `SELECT date::text AS date,
              COUNT(*) FILTER (WHERE status IN ('presente','tarde'))::int AS presentes,
              COUNT(*)::int AS total
       FROM attendances WHERE unit_id = :unitId AND date BETWEEN :from AND :to
       GROUP BY date ORDER BY date DESC`,
      { type: QueryTypes.SELECT, replacements: { unitId, from, to } },
    );
    const perMember = await sequelize.query<{ member_id: string; presentes: number; total: number }>(
      `SELECT member_id,
              COUNT(*) FILTER (WHERE status IN ('presente','tarde'))::int AS presentes,
              COUNT(*)::int AS total
       FROM attendances WHERE unit_id = :unitId AND date BETWEEN :from AND :to
       GROUP BY member_id`,
      { type: QueryTypes.SELECT, replacements: { unitId, from, to } },
    );
    res.json({ year, dates, perMember });
  }),
);

attendanceRouter.put(
  '/',
  ah(async (req, res) => {
    const data = parse(attendanceSaveSchema, req.body);
    assertCan(req, 'attendance', 'edit', data.unitId);
    if (data.date > todayIso()) throw badRequest('No se puede tomar asistencia de una fecha futura');
    const ids = data.records.map((r) => r.memberId);
    const valid = await Member.count({ where: { id: ids, unitId: data.unitId } });
    if (valid !== new Set(ids).size) throw forbidden('Hay protagonistas que no son de esta unidad');
    await sequelize.transaction(async (transaction) => {
      if (data.records.length) {
        await Attendance.bulkCreate(
          data.records.map((r) => ({ memberId: r.memberId, unitId: data.unitId, date: data.date, status: r.status, notes: r.notes })),
          { transaction, updateOnDuplicate: ['status', 'notes', 'updatedAt'], conflictAttributes: ['memberId', 'date'] },
        );
      }
      const unit = await Unit.findByPk(data.unitId, { transaction });
      const present = data.records.filter((r) => r.status === 'presente' || r.status === 'tarde').length;
      await writeAudit(
        {
          action: 'update',
          entity: 'Attendance',
          entityId: data.unitId,
          summary: `Asistencia ${unit?.code ?? ''} ${data.date}: ${present}/${data.records.length} presentes`,
        },
        transaction,
      );
    });
    res.json({ ok: true });
  }),
);

attendanceRouter.delete(
  '/',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    const date = String(req.query.date ?? '');
    if (!unitId || !date) throw badRequest('Faltan datos');
    assertCan(req, 'attendance', 'edit', unitId);
    const n = await Attendance.destroy({ where: { unitId, date } });
    await writeAudit({ action: 'delete', entity: 'Attendance', entityId: unitId, summary: `Asistencia borrada ${date} (${n} registros)` });
    res.json({ ok: true });
  }),
);

export const documentsRouter = Router();

/** Tablero de documentación de una unidad: protagonistas × tipos de documento con semáforo. */
documentsRouter.get(
  '/board',
  ah(async (req, res) => {
    const unitId = String(req.query.unitId ?? '');
    if (!unitId) throw badRequest('Falta la unidad');
    assertCan(req, 'member_documents', 'view', unitId);
    const [types, members] = await Promise.all([
      DocumentType.findAll({ where: { active: true }, order: [['sortOrder', 'ASC']] }),
      Member.findAll({
        where: { unitId, status: 'activo' },
        include: [{ model: SmallGroup, as: 'smallGroup', attributes: ['id', 'name'] }],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      }),
    ]);
    const docs = members.length ? await MemberDocument.findAll({ where: { memberId: { [Op.in]: members.map((m) => m.id) } } }) : [];
    const today = todayIso();
    res.json({
      canEdit: can(req.auth, 'member_documents', 'edit', unitId),
      types,
      members: members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        smallGroup: m.smallGroup,
        documents: Object.fromEntries(
          types.map((t) => {
            const d = docs.find((x) => x.memberId === m.id && x.documentTypeId === t.id);
            return [
              t.id,
              {
                presented: d?.presented ?? false,
                notApplicable: (!d?.presented && d?.notApplicable) ?? false,
                presentedAt: d?.presentedAt ?? null,
                expiresAt: d?.expiresAt ?? null,
                notes: d?.notes ?? null,
                status: documentStatus(d, t.hasExpiry, today, t.required),
              },
            ];
          }),
        ),
      })),
    });
  }),
);

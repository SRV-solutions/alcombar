import { Router } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { can, documentStatus, kidsPerAdultOf, requiredAdults, todayIso, unitsWith } from '../shared';
import { sequelize } from '../db';
import { AuditLog, DocumentType, Member, MemberDocument, Unit, User } from '../models';
import { ah } from '../lib/errors';
import { authorize } from '../middlewares/auth';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  ah(async (req, res) => {
    const year = new Date().getFullYear();
    const units = await Unit.findAll({ where: { active: true } });
    const memberCounts = await sequelize.query<{ unit_id: string; n: number }>(
      `SELECT unit_id, COUNT(*)::int AS n FROM members WHERE deleted_at IS NULL AND status='activo' GROUP BY unit_id`,
      { type: QueryTypes.SELECT },
    );
    const adultCounts = await sequelize.query<{ unit_id: string | null; n: number }>(
      `SELECT a.unit_id, COUNT(DISTINCT a.adult_id)::int AS n FROM adult_assignments a
       JOIN adults ad ON ad.id=a.adult_id AND ad.deleted_at IS NULL AND ad.status <> 'baja'
       WHERE a.deleted_at IS NULL AND a.year=:year GROUP BY a.unit_id`,
      { type: QueryTypes.SELECT, replacements: { year } },
    );
    const [totalAdults] = await sequelize.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM adults WHERE deleted_at IS NULL AND status <> 'baja'`,
      { type: QueryTypes.SELECT },
    );
    const [noTraining] = await sequelize.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM adults ad WHERE ad.deleted_at IS NULL AND ad.status <> 'baja'
       AND NOT EXISTS (SELECT 1 FROM adult_courses c WHERE c.adult_id=ad.id AND c.deleted_at IS NULL)`,
      { type: QueryTypes.SELECT },
    );

    // Documentación por unidad (solo las unidades que el usuario puede ver)
    const docUnits = unitsWith(req.auth, 'member_documents', 'view');
    const visibleUnitIds = units.map((u) => u.id).filter((id) => docUnits === 'all' || docUnits.includes(id));
    const docStats = new Map<string, { ok: number; expiring: number; expired: number; missing: number }>();
    if (visibleUnitIds.length) {
      const [types, members] = await Promise.all([
        DocumentType.findAll({ where: { active: true, appliesTo: 'member' } }),
        Member.findAll({ where: { unitId: visibleUnitIds, status: 'activo' }, attributes: ['id', 'unitId'] }),
      ]);
      const docs = members.length ? await MemberDocument.findAll({ where: { memberId: { [Op.in]: members.map((m) => m.id) } } }) : [];
      const today = todayIso();
      for (const m of members) {
        const s = docStats.get(m.unitId!) ?? { ok: 0, expiring: 0, expired: 0, missing: 0 };
        for (const t of types) s[documentStatus(docs.find((d) => d.memberId === m.id && d.documentTypeId === t.id), t.hasExpiry, today, t.required)]++;
        docStats.set(m.unitId!, s);
      }
    }

    // Cumpleaños del mes (solo nombre y día)
    const month = new Date().getMonth() + 1;
    const birthdays = can(req.auth, 'members', 'view')
      ? await sequelize.query<{ id: string; first_name: string; last_name: string; day: number; unit_code: string }>(
          `SELECT m.id, m.first_name, m.last_name, EXTRACT(DAY FROM m.birth_date)::int AS day, COALESCE(u.code, 'Por asignar') AS unit_code
           FROM members m LEFT JOIN units u ON u.id=m.unit_id
           WHERE m.deleted_at IS NULL AND m.status='activo' AND EXTRACT(MONTH FROM m.birth_date)=:month
           ORDER BY day`,
          { type: QueryTypes.SELECT, replacements: { month } },
        )
      : [];

    // Protagonistas y cargos de adultos que todavía no tienen unidad (se sabe la rama)
    const pendingMembers = await sequelize.query<{ branch: string | null; n: number }>(
      `SELECT branch, COUNT(*)::int AS n FROM members WHERE deleted_at IS NULL AND status='activo' AND unit_id IS NULL GROUP BY branch`,
      { type: QueryTypes.SELECT },
    );
    const [pendingAdults] = await sequelize.query<{ n: number }>(
      `SELECT COUNT(DISTINCT a.adult_id)::int AS n FROM adult_assignments a
       JOIN adults ad ON ad.id=a.adult_id AND ad.deleted_at IS NULL AND ad.status <> 'baja'
       WHERE a.deleted_at IS NULL AND a.year=:year AND a.unit_id IS NULL AND a.support_team_id IS NULL AND a.branch IS NOT NULL`,
      { type: QueryTypes.SELECT, replacements: { year } },
    );

    res.json({
      year,
      pending: {
        members: pendingMembers.map((p) => ({ branch: p.branch, count: p.n })),
        adults: pendingAdults?.n ?? 0,
      },
      totals: {
        members: memberCounts.reduce((a, c) => a + c.n, 0),
        adults: totalAdults?.n ?? 0,
        adultsWithoutTraining: noTraining?.n ?? 0,
        users: can(req.auth, 'users', 'view') ? await User.count({ where: { active: true } }) : null,
      },
      units: units.map((u) => {
        const members = memberCounts.find((c) => c.unit_id === u.id)?.n ?? 0;
        const kidsPerAdult = kidsPerAdultOf(u);
        return {
          id: u.id,
          name: u.name,
          code: u.code,
          branch: u.branch,
          kidsPerAdult,
          minAdults: requiredAdults(members, kidsPerAdult),
          members,
          adults: adultCounts.find((c) => c.unit_id === u.id)?.n ?? 0,
          docs: docStats.get(u.id) ?? null,
        };
      }),
      birthdays: birthdays.map((b) => ({ id: b.id, name: `${b.first_name} ${b.last_name}`, day: b.day, unit: b.unit_code })),
    });
  }),
);

export const auditRouter = Router();

// ---- Uso de la app: qué pantalla abre cada usuario (sin identificadores ni lo que hace adentro) ----
const cleanPath = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null;
  const p = raw
    .split(/[?#]/)[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/+$/, '');
  return (p || '/').slice(0, 160);
};
auditRouter.post(
  '/view',
  ah(async (req, res) => {
    const path = cleanPath(req.body?.path);
    // Volver a la misma pantalla en menos de un minuto no cuenta de nuevo
    if (path)
      await sequelize.query(
        `INSERT INTO page_views (user_id, path)
         SELECT :userId, :path WHERE NOT EXISTS (
           SELECT 1 FROM page_views WHERE user_id = :userId AND path = :path AND created_at > now() - interval '1 minute')`,
        { replacements: { userId: req.user!.id, path } },
      );
    res.json({ ok: true });
  }),
);
auditRouter.get(
  '/usage',
  authorize('audit', 'view'),
  ah(async (req, res) => {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
    const since = { replacements: { days }, type: QueryTypes.SELECT as const };
    const [totals] = await sequelize.query<{ users: number; views: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS users, COUNT(*)::int AS views FROM page_views WHERE created_at > now() - make_interval(days => :days)`,
      since,
    );
    const byPath = await sequelize.query<{ path: string; users: number; views: number }>(
      `SELECT path, COUNT(DISTINCT user_id)::int AS users, COUNT(*)::int AS views FROM page_views
       WHERE created_at > now() - make_interval(days => :days) GROUP BY path ORDER BY users DESC, views DESC LIMIT 60`,
      since,
    );
    const byDay = await sequelize.query<{ day: string; users: number }>(
      `SELECT to_char((created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, 'YYYY-MM-DD') AS day, COUNT(DISTINCT user_id)::int AS users
       FROM page_views WHERE created_at > now() - make_interval(days => :days) GROUP BY 1 ORDER BY 1 DESC`,
      since,
    );
    const [people] = await sequelize.query<{ total: number; entered: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE last_login_at IS NOT NULL)::int AS entered FROM users WHERE deleted_at IS NULL AND active`,
      { type: QueryTypes.SELECT },
    );
    res.json({ days, users: totals?.users ?? 0, views: totals?.views ?? 0, totalUsers: people?.total ?? 0, enteredEver: people?.entered ?? 0, byPath, byDay });
  }),
);

auditRouter.get(
  '/',
  authorize('audit', 'view'),
  ah(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 50;
    const where: Record<string, unknown> = {};
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.entityId) where.entityId = String(req.query.entityId);
    if (req.query.userId) where.userId = String(req.query.userId);
    if (req.query.action) where.action = String(req.query.action);
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    res.json({ rows, total: count, page, pageSize });
  }),
);

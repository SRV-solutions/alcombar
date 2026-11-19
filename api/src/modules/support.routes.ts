/**
 * "Reportar un problema": cualquier usuario con sesión reporta errores, sugerencias o consultas sobre la plataforma.
 * Los superadmins los ven en Administración → Reportes, cambian el estado y responden.
 * Si SUPPORT_EMAIL está configurado, avisa por mail de cada reporte nuevo; al responder, le avisa a quien reportó.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS, reportCreateSchema, reportUpdateSchema, type ReportCategory, type ReportStatus } from '../shared';
import { config } from '../config';
import { User } from '../models';
import { SupportReport } from '../models/support';
import { ah, forbidden, HttpError, notFound, parse } from '../lib/errors';
import { emailLayout, sendMail } from '../lib/mailer';

export const supportRouter = Router();

const userAttrs = ['id', 'name', 'email'];

supportRouter.post(
  '/reports',
  ah(async (req, res) => {
    const data = parse(reportCreateSchema, req.body);
    // Límite simple para evitar envíos repetidos: 10 por hora por persona
    const lastHour = await SupportReport.count({ where: { userId: req.user!.id, createdAt: { [Op.gt]: new Date(Date.now() - 3_600_000) } } });
    if (lastHour >= 10) throw new HttpError(429, 'Mandaste muchos reportes seguidos. Probá de nuevo en un rato.');
    const report = await SupportReport.create({
      userId: req.user!.id,
      category: data.category,
      description: data.description,
      pageUrl: data.pageUrl ?? null,
      appVersion: data.appVersion ?? null,
      userAgent: (req.get('user-agent') ?? '').slice(0, 300) || null,
      clientErrors: data.clientErrors,
      response: null,
      respondedBy: null,
      resolvedAt: null,
    });
    if (config.supportEmail) {
      const label = REPORT_CATEGORY_LABELS[data.category as ReportCategory];
      void sendMail(
        config.supportEmail,
        `Nuevo reporte en ALCONBAR: ${label}`,
        `${req.user!.name} <${req.user!.email}> reportó (${label}) en ${data.pageUrl ?? '-'}:\n\n${data.description}\n\nVer: ${config.appUrl}/admin/reportes`,
        emailLayout({
          title: `Nuevo reporte: ${label}`,
          paragraphs: [`${req.user!.name} (${req.user!.email}) en ${data.pageUrl ?? '-'}:`, data.description],
          button: { label: 'Ver los reportes', url: `${config.appUrl}/admin/reportes` },
        }),
      );
    }
    res.status(201).json(report);
  }),
);

supportRouter.get(
  '/reports/mine',
  ah(async (req, res) => {
    res.json(await SupportReport.findAll({ where: { userId: req.user!.id }, order: [['createdAt', 'DESC']], limit: 50 }));
  }),
);

// ---- Superadmin ----
const onlySuperadmin = ah(async (req, _res, next) => {
  if (!req.auth?.isSuperadmin) throw forbidden('Solo los superadmins ven los reportes');
  next();
});

supportRouter.get(
  '/reports/count',
  onlySuperadmin,
  ah(async (_req, res) => {
    res.json({ open: await SupportReport.count({ where: { status: { [Op.in]: ['ABIERTO', 'EN_PROCESO'] } } }) });
  }),
);

supportRouter.get(
  '/reports',
  onlySuperadmin,
  ah(async (req, res) => {
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.category) where.category = String(req.query.category);
    const list = await SupportReport.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: userAttrs },
        { model: User, as: 'responder', attributes: userAttrs },
      ],
      order: [['createdAt', 'DESC']],
      limit: 300,
    });
    res.json(list);
  }),
);

supportRouter.put(
  '/reports/:id',
  onlySuperadmin,
  ah(async (req, res) => {
    const report = await SupportReport.findByPk(req.params.id, { include: [{ model: User, as: 'user', attributes: userAttrs }] });
    if (!report) throw notFound();
    const data = parse(reportUpdateSchema, req.body);
    const newResponse = data.response !== null && data.response !== report.response;
    const closing = (data.status === 'RESUELTO' || data.status === 'DESCARTADO') && report.status !== data.status;
    await report.update({
      status: data.status,
      response: data.response,
      respondedBy: newResponse ? req.user!.id : report.respondedBy,
      resolvedAt: data.status === 'RESUELTO' || data.status === 'DESCARTADO' ? report.resolvedAt ?? new Date() : null,
    });
    // Aviso a quien reportó cuando hay respuesta nueva o se cierra
    if ((newResponse || closing) && report.user?.email) {
      const status = REPORT_STATUS_LABELS[data.status as ReportStatus];
      void sendMail(
        report.user.email,
        `Tu reporte en ALCONBAR: ${status}`,
        `Hola ${report.user.name}:\n\nTu reporte quedó "${status}".${data.response ? `\n\nRespuesta:\n${data.response}` : ''}\n\nGracias por ayudarnos a mejorar.`,
        emailLayout({
          title: `Tu reporte: ${status}`,
          paragraphs: [`Hola ${report.user.name}:`, `Tu reporte quedó "${status}".`, ...(data.response ? [`Respuesta: ${data.response}`] : []), 'Gracias por ayudarnos a mejorar.'],
          button: { label: 'Abrir ALCONBAR', url: config.appUrl },
        }),
      );
    }
    res.json(report);
  }),
);

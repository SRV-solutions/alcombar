import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import { config } from './config';
import { requestContext } from './lib/context';
import { HttpError } from './lib/errors';
import { authenticate } from './middlewares/auth';
import { authRouter } from './modules/auth.routes';
import { usersRouter } from './modules/users.routes';
import { rolesRouter } from './modules/roles.routes';
import { groupRouter } from './modules/group.routes';
import { adultsRouter } from './modules/adults.routes';
import { membersRouter } from './modules/members.routes';
import { attendanceRouter, documentsRouter } from './modules/attendance.routes';
import { auditRouter, dashboardRouter } from './modules/dashboard.routes';

export function createApp() {
  const app = express();
  // Netlify (o Vite en desarrollo) hace de proxy: confiar en el primer salto para la IP real.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use((req, _res, next) => requestContext.run({ userId: null, ip: (req.ip ?? '').slice(0, 60) || null }, () => next()));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use('/auth', authRouter);
  api.use(authenticate);
  api.use('/users', usersRouter);
  api.use('/roles', rolesRouter);
  api.use('/group', groupRouter);
  api.use('/adults', adultsRouter);
  api.use('/members', membersRouter);
  api.use('/attendance', attendanceRouter);
  api.use('/documents', documentsRouter);
  api.use('/dashboard', dashboardRouter);
  api.use('/audit', auditRouter);
  app.use('/api/v1', api);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta inexistente' }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    }
    if (err instanceof UniqueConstraintError) return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    if (err instanceof ForeignKeyConstraintError) return res.status(400).json({ error: 'El registro está relacionado con otros datos' });
    if (err instanceof ValidationError) return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande' });
    if (err instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido' });
    console.error(err);
    res.status(500).json({ error: config.isProd ? 'Error interno' : String(err?.message ?? err) });
  };
  app.use(onError);
  return app;
}

import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: (() => {
    const s = required('JWT_SECRET');
    if (isProd && s.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    return s;
  })(),
  accessTokenMinutes: 15,
  refreshTokenDays: 30,
  inviteTokenHours: 72,
  resetTokenMinutes: 60,
  maxFailedLogins: 5,
  lockMinutes: 15,
  // Email (SMTP; Gmail por defecto, con contraseña de aplicación)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  mailFrom: process.env.MAIL_FROM || '',
  mailFromName: process.env.MAIL_FROM_NAME || 'ALCOMBAR Gestión',
};

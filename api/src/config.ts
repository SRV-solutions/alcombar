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
  /** Cantidad de proxies delante de la API (1 en local con Vite; 2 en Railway detrás de Netlify). */
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
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
  // Una semana: los educadores son voluntarios y no siempre abren el mail en el día
  inviteTokenHours: 168,
  resetTokenMinutes: 60,
  maxFailedLogins: 5,
  lockMinutes: 15,
  // Email: Resend (API HTTPS, funciona en Railway) o, como alternativa, SMTP (Gmail con contraseña de aplicación)
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  mailReplyTo: process.env.MAIL_REPLY_TO || '',
  /** Adónde avisar por mail cada reporte nuevo de "Reportar un problema" (opcional). */
  supportEmail: (process.env.SUPPORT_EMAIL || '').trim(),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  mailFrom: process.env.MAIL_FROM || '',
  mailFromName: process.env.MAIL_FROM_NAME || 'ALCONBAR Gestión',
};

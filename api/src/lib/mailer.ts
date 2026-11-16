/**
 * Envío de emails por SMTP (mismo esquema que sentryx: nodemailer, Gmail por defecto).
 * Variables: SMTP_USER, SMTP_PASS (contraseña de aplicación de Gmail), MAIL_FROM_NAME, MAIL_FROM y,
 * opcionalmente, SMTP_HOST / SMTP_PORT para otro proveedor. Sin SMTP_USER/SMTP_PASS, el mail se muestra
 * en la consola (desarrollo) y la app muestra el enlace en pantalla.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';

let transporter: Transporter | null = null;

const useResend = () => Boolean(config.resendApiKey);

export const mailEnabled = () => useResend() || Boolean(config.smtpUser && config.smtpPass);

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      ...(config.smtpHost
        ? { host: config.smtpHost, port: config.smtpPort, secure: config.smtpPort === 465 }
        : { service: 'gmail' }),
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
  }
  return transporter;
}

const from = () => `"${config.mailFromName}" <${config.mailFrom || config.smtpUser}>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plantilla HTML simple con los colores del Grupo. Compatible con Gmail/Outlook (tablas y estilos en línea). */
export function emailLayout({ title, paragraphs, button, footnote }: { title: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#222">${esc(t)}</p>`).join('');
  const btn = button
    ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:#87141B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;color:#666">Si el botón no funciona, copiá este enlace en el navegador:<br><span style="word-break:break-all">${esc(button.url)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#FAF6EE;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EE;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6dfd2">
      <tr><td style="background:#87141B;padding:18px 24px">
        <div style="color:#F2C230;font-weight:bold;font-size:18px;letter-spacing:.5px">ALCOMBAR Gestión</div>
        <div style="color:#f3e3dc;font-size:12px">Grupo Scout 155 Divina Providencia</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#87141B">${esc(title)}</h1>
        ${p}${btn}
        ${footnote ? `<p style="margin:18px 0 0;font-size:12px;color:#666">${esc(footnote)}</p>` : ''}
      </td></tr>
    </table>
    <p style="font-size:11px;color:#999;margin:14px 0 0">Siempre listos · Este mensaje lo envió la plataforma del Grupo.</p>
  </td></tr></table></body></html>`;
}

/** Envío por la API HTTP de Resend (Railway bloquea SMTP). Variables: RESEND_API_KEY y MAIL_FROM (de un dominio verificado en Resend). */
async function sendWithResend(to: string, subject: string, text: string, html?: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from(), to: [to], subject, text, ...(html ? { html } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Envía un email al instante. Devuelve true si salió; si falla, lo registra y devuelve false (la app muestra el enlace). */
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!mailEnabled()) {
    console.log(`\n✉  [email no enviado: falta configurar SMTP_USER/SMTP_PASS]\n   Para: ${to}\n   Asunto: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`);
    return false;
  }
  try {
    if (useResend()) await sendWithResend(to, subject, text, html);
    else await getTransporter().sendMail({ from: from(), to, subject, text, ...(html ? { html } : {}) });
    return true;
  } catch (e) {
    console.error('[mail] error enviando a', to, (e as Error).message);
    return false;
  }
}

/** Comprueba usuario y contraseña SMTP sin mandar ningún mail. */
export async function verifyMail(): Promise<void> {
  if (!mailEnabled()) throw new Error('Falta configurar RESEND_API_KEY, o SMTP_USER y SMTP_PASS, en api/.env');
  if (useResend()) return;
  await getTransporter().verify();
}

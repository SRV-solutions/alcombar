import { Op } from 'sequelize';
import { config } from '../config';
import { PasswordToken, type User } from '../models';
import { emailLayout, sendMail } from './mailer';
import { randomToken, sha256 } from './security';

/** Enlaces que sirven para definir o restablecer la contraseña (los de inicio por QR no). */
const PASSWORD_PURPOSES = ['invite', 'reset'];

/** Crea un enlace de un solo uso para definir (invite) o restablecer (reset) la contraseña. */
export async function createPasswordLink(user: User, purpose: 'invite' | 'reset'): Promise<string> {
  // Invalida enlaces de contraseña anteriores sin usar
  await PasswordToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null, purpose: PASSWORD_PURPOSES } });
  const token = randomToken(32);
  const ms = purpose === 'invite' ? config.inviteTokenHours * 3_600_000 : config.resetTokenMinutes * 60_000;
  await PasswordToken.create({ userId: user.id, tokenHash: sha256(token), purpose, expiresAt: new Date(Date.now() + ms), usedAt: null });
  return `${config.appUrl}/definir-clave?token=${token}`;
}

/** Enlace de contraseña vigente (nunca devuelve un código QR: con eso no se puede cambiar la contraseña). */
export async function findValidToken(token: string) {
  return PasswordToken.findOne({ where: { tokenHash: sha256(token), purpose: PASSWORD_PURPOSES, usedAt: null, expiresAt: { [Op.gt]: new Date() } } });
}

// ---- Abrir en el celular: código QR de un solo uso que inicia sesión en otro dispositivo ----
export const QR_LOGIN_MINUTES = 3;

export async function createQrLogin(user: User) {
  // El código anterior deja de servir (vence ahora)
  await PasswordToken.update({ expiresAt: new Date() }, { where: { userId: user.id, usedAt: null, purpose: 'qr_login' } });
  const token = randomToken(32);
  const pt = await PasswordToken.create({
    userId: user.id,
    tokenHash: sha256(token),
    purpose: 'qr_login',
    expiresAt: new Date(Date.now() + QR_LOGIN_MINUTES * 60_000),
    usedAt: null,
  });
  return { id: pt.id, token, expiresAt: pt.expiresAt };
}

export async function sendInvite(user: User, url: string) {
  const intro = `Hola ${user.name}:`;
  const body = 'Te crearon un usuario en ALCONBAR Gestión, la plataforma del Grupo Scout 155 Divina Providencia.';
  const h = config.inviteTokenHours;
  const lasts = h >= 48 ? `${Math.round(h / 24)} días` : `${h} horas`;
  const action = `Para entrar, elegí tu contraseña con este enlace (vence en ${lasts} y sirve una sola vez).`;
  return sendMail(
    user.email,
    'Tu acceso a ALCONBAR Gestión',
    `${intro}\n\n${body}\n${action}\n\n${url}\n\nSiempre listos.`,
    emailLayout({
      title: '¡Bienvenida/o a ALCONBAR Gestión!',
      paragraphs: [intro, body, action],
      button: { label: 'Elegir mi contraseña', url },
      footnote: `Tu usuario es ${user.email}. Si no esperabas este mensaje, podés ignorarlo.`,
    }),
  );
}

export async function sendReset(user: User, url: string) {
  const intro = `Hola ${user.name}:`;
  const body = `Pediste restablecer tu contraseña. Usá este enlace (vence en ${config.resetTokenMinutes} minutos y sirve una sola vez).`;
  return sendMail(
    user.email,
    'Restablecer tu contraseña de ALCONBAR Gestión',
    `${intro}\n\n${body}\n\n${url}\n\nSi no lo pediste, ignorá este mensaje.`,
    emailLayout({
      title: 'Restablecer tu contraseña',
      paragraphs: [intro, body],
      button: { label: 'Elegir una contraseña nueva', url },
      footnote: 'Si no lo pediste, ignorá este mensaje: tu contraseña actual sigue funcionando.',
    }),
  );
}

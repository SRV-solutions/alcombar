import { Op } from 'sequelize';
import { config } from '../config';
import { PasswordToken, type User } from '../models';
import { emailLayout, sendMail } from './mailer';
import { randomToken, sha256 } from './security';

/** Crea un enlace de un solo uso para definir (invite) o restablecer (reset) la contraseña. */
export async function createPasswordLink(user: User, purpose: 'invite' | 'reset'): Promise<string> {
  // Invalida enlaces anteriores sin usar
  await PasswordToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
  const token = randomToken(32);
  const ms = purpose === 'invite' ? config.inviteTokenHours * 3_600_000 : config.resetTokenMinutes * 60_000;
  await PasswordToken.create({ userId: user.id, tokenHash: sha256(token), purpose, expiresAt: new Date(Date.now() + ms), usedAt: null });
  return `${config.appUrl}/definir-clave?token=${token}`;
}

export async function findValidToken(token: string) {
  return PasswordToken.findOne({ where: { tokenHash: sha256(token), usedAt: null, expiresAt: { [Op.gt]: new Date() } } });
}

export async function sendInvite(user: User, url: string) {
  const intro = `Hola ${user.name}:`;
  const body = 'Te crearon un usuario en ALCOMBAR Gestión, la plataforma del Grupo Scout 155 Divina Providencia.';
  const action = `Para entrar, elegí tu contraseña con este enlace (vence en ${config.inviteTokenHours} horas y sirve una sola vez).`;
  return sendMail(
    user.email,
    'Tu acceso a ALCOMBAR Gestión',
    `${intro}\n\n${body}\n${action}\n\n${url}\n\nSiempre listos.`,
    emailLayout({
      title: '¡Bienvenida/o a ALCOMBAR Gestión!',
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
    'Restablecer tu contraseña de ALCOMBAR Gestión',
    `${intro}\n\n${body}\n\n${url}\n\nSi no lo pediste, ignorá este mensaje.`,
    emailLayout({
      title: 'Restablecer tu contraseña',
      paragraphs: [intro, body],
      button: { label: 'Elegir una contraseña nueva', url },
      footnote: 'Si no lo pediste, ignorá este mensaje: tu contraseña actual sigue funcionando.',
    }),
  );
}

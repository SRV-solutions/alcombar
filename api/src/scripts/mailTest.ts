/**
 * Prueba del envío de emails.
 *   npm run mail:test                      → solo verifica usuario y contraseña SMTP (no manda nada)
 *   npm run mail:test -- persona@mail.com  → manda un email de prueba a esa dirección
 */
import { config } from '../config';
import { emailLayout, sendMail, verifyMail } from '../lib/mailer';

async function main() {
  const to = process.argv[2];
  const status = await verifyMail();
  console.log(`✓ ${status}. Los mails salen como "${config.mailFromName}" <${config.mailFrom || config.smtpUser}>`);
  if (!to) return;
  const ok = await sendMail(
    to,
    'Prueba de ALCOMBAR Gestión',
    'Si te llegó este mensaje, el envío de emails de ALCOMBAR Gestión funciona.',
    emailLayout({ title: 'Prueba de envío', paragraphs: ['Si te llegó este mensaje, el envío de emails de ALCOMBAR Gestión funciona.'] }),
  );
  console.log(ok ? `✓ Mail de prueba enviado a ${to}` : '✗ No se pudo enviar (mirá el error de arriba)');
}

main().catch((e) => {
  console.error('✗', (e as Error).message);
  process.exit(1);
});

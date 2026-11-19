import { useState } from 'react';
import { MailCheck, MailWarning } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Field, Input } from '../../components/ui';

/**
 * Mi mail, para una cuenta que entra con DNI: se carga escribiéndolo y se confirma con el código de 6 números
 * que llega a esa casilla. Hasta confirmarlo, el mail no es de la cuenta (no sirve para entrar ni para recuperar la contraseña).
 */
export function EmailVerifyCard() {
  const { me, refetch } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState<'send' | 'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  const { email: current, pendingEmail } = me.user;
  const confirmed = !!current && me.user.emailVerified !== false;

  const run = async (kind: 'send' | 'confirm' | 'cancel', fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const details = e instanceof ApiError ? e.details : undefined;
      setError(details?.email ?? details?.code ?? errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const send = (to: string) =>
    run('send', async () => {
      const r = await api.post<{ sent: boolean; minutes: number }>('/auth/me/email', { email: to });
      await refetch();
      setCode('');
      if (r.sent) toast.ok(`Te mandamos un código a ${to.trim().toLowerCase()}. Vence en ${r.minutes} minutos.`);
      else setError('No pudimos mandar el mail. Revisá que esté bien escrito y probá de nuevo en un rato.');
    });
  const confirm = () =>
    run('confirm', async () => {
      await api.post('/auth/me/email/confirm', { code });
      await refetch();
      setCode('');
      setEmail('');
      setChanging(false);
      toast.ok('Mail confirmado. Ya podés entrar también con tu mail.');
    });
  const cancel = () =>
    run('cancel', async () => {
      await api.del('/auth/me/email');
      await refetch();
      setCode('');
    });

  return (
    <Card
      title="Mi mail"
      actions={confirmed && !pendingEmail ? <Badge tone="ok">Confirmado</Badge> : <Badge tone="warn">{pendingEmail ? 'Falta el código' : 'Sin cargar'}</Badge>}
    >
      {error ? (
        <div className="alert alert-error" style={{ marginTop: 0 }}>
          {error}
        </div>
      ) : null}

      {pendingEmail ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <p style={{ margin: 0 }}>
            <MailWarning size={16} style={{ verticalAlign: '-3px' }} /> Te mandamos un código de 6 números a <strong>{pendingEmail}</strong>. Escribilo acá para confirmar que la casilla es tuya.
          </p>
          <Field label="Código">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="code-input"
              aria-label="Código de 6 números"
            />
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <Button type="submit" loading={busy === 'confirm'} disabled={code.length !== 6}>
              Confirmar
            </Button>
            <Button type="button" variant="secondary" loading={busy === 'send'} onClick={() => void send(pendingEmail)}>
              Mandar otro código
            </Button>
            <Button type="button" variant="ghost" loading={busy === 'cancel'} onClick={() => void cancel()}>
              Usar otro mail
            </Button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            ¿No llega? Fijate en correo no deseado. El código vence a los 15 minutos.
          </p>
        </form>
      ) : confirmed && !changing ? (
        <>
          <p style={{ marginTop: 0 }}>
            <MailCheck size={16} style={{ verticalAlign: '-3px' }} /> <strong>{current}</strong>
          </p>
          <p className="muted">Con este mail también podés entrar, y recuperar tu contraseña si te la olvidás.</p>
          <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
            Cambiar el mail
          </Button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(email);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {confirmed ? null : (
            <p style={{ margin: 0 }}>
              Cargá tu mail: te sirve para recuperar la contraseña si te la olvidás y para recibir los avisos de la Comunidad. Te mandamos un código para confirmar que es tuyo.
            </p>
          )}
          <Field label={confirmed ? 'Mail nuevo' : 'Tu mail'}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" />
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <Button type="submit" loading={busy === 'send'} disabled={!email.trim()}>
              Mandarme el código
            </Button>
            {changing ? (
              <Button type="button" variant="ghost" onClick={() => setChanging(false)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </Card>
  );
}

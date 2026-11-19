import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, ShieldOff } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Modal } from '../../components/ui';

interface Access {
  active: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  email: string | null;
  pendingEmail: string | null;
  emailVerified: boolean;
}
interface AccessInfo {
  access: Access | null;
  /** Por qué (todavía) no se le puede dar acceso. */
  blocked: string | null;
}
interface Generated {
  dni: string;
  password: string;
}

const fmtDateTime = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Ficha de un rover → Acceso a la app. Su educador le genera en el momento una contraseña provisoria y se la dicta:
 * entra con su DNI, elige la suya y después carga su mail.
 */
export function MemberAccessCard({ memberId, firstName }: { memberId: string; firstName: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['member-access', memberId], queryFn: () => api.get<AccessInfo>(`/members/${memberId}/access`) });
  const [shown, setShown] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  if (!q.data) return null;
  const { access, blocked } = q.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['member-access', memberId] });

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api.post<Generated>(`/members/${memberId}/access`);
      setShown({ dni: r.dni, password: r.password });
      await refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const suspend = async () => {
    try {
      await api.del(`/members/${memberId}/access`);
      await refresh();
      toast.ok(`${firstName} ya no puede entrar a la app`);
    } catch (e) {
      toast.error(e);
    }
  };

  const state = !access ? (
    <Badge>Sin acceso</Badge>
  ) : !access.active ? (
    <Badge>Suspendido</Badge>
  ) : access.mustChangePassword ? (
    <Badge tone="warn">Contraseña provisoria</Badge>
  ) : (
    <Badge tone="ok">Activo</Badge>
  );

  return (
    <Card title="Acceso a la app" actions={state}>
      {!access ? (
        <p style={{ marginTop: 0 }}>
          {firstName} todavía no tiene cuenta. Generale el acceso cuando esté con vos: entra con su DNI y la contraseña provisoria que le dictes, y lo primero que hace es elegir la suya.
        </p>
      ) : (
        <dl className="dl" style={{ marginBottom: 14 }}>
          <dt>Entra con</dt>
          <dd>Su DNI{access.email ? ` o ${access.email}` : ''}</dd>
          <dt>Mail</dt>
          <dd>
            {access.email && access.emailVerified
              ? `${access.email} (confirmado)`
              : access.pendingEmail
                ? `${access.pendingEmail}: le falta escribir el código`
                : access.email ?? 'Todavía no lo cargó'}
          </dd>
          <dt>Último ingreso</dt>
          <dd>{access.lastLoginAt ? fmtDateTime(access.lastLoginAt) : 'Nunca entró'}</dd>
        </dl>
      )}
      {blocked ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          {blocked}
        </p>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          {!access ? (
            <Button onClick={() => void generate()} loading={busy}>
              <KeyRound /> Generar acceso
            </Button>
          ) : (
            <>
              <ConfirmButton
                variant="secondary"
                title="Generar otra contraseña"
                message={
                  <>
                    Se genera una contraseña provisoria nueva para {firstName}. La que tiene ahora deja de servir y se cierra su sesión en todos los dispositivos.
                  </>
                }
                confirmLabel="Generar"
                onConfirm={generate}
              >
                <KeyRound /> {access.active ? 'Se olvidó la contraseña' : 'Volver a darle acceso'}
              </ConfirmButton>
              {access.active ? (
                <ConfirmButton
                  variant="ghost"
                  title="Suspender el acceso"
                  message={<>{firstName} no va a poder entrar hasta que le generes una contraseña nueva. No se borra nada de lo que cargó.</>}
                  confirmLabel="Suspender"
                  onConfirm={suspend}
                >
                  <ShieldOff /> Suspender
                </ConfirmButton>
              ) : null}
            </>
          )}
        </div>
      )}

      {shown ? (
        <Modal
          title={`Acceso de ${firstName}`}
          onClose={() => setShown(null)}
          footer={
            <Button onClick={() => setShown(null)}>Listo, ya se la pasé</Button>
          }
        >
          <p style={{ marginTop: 0 }}>Dictale estos datos ahora. Al cerrar esta ventana la contraseña no se vuelve a mostrar.</p>
          <div className="access-secret">
            <div>
              <div className="muted">Usuario (su DNI)</div>
              <div className="value">{shown.dni}</div>
            </div>
            <div>
              <div className="muted">Contraseña provisoria</div>
              <div className="value">{shown.password}</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(shown.password).then(() => toast.ok('Contraseña copiada'));
            }}
          >
            <Copy /> Copiar la contraseña
          </Button>
          <p className="muted" style={{ marginBottom: 0 }}>
            Cuando entre, la app le pide que elija su propia contraseña. Después puede cargar su mail desde «Mi perfil».
          </p>
        </Modal>
      ) : null}
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Download, PenLine, Users } from 'lucide-react';
import { AUTH_KIND_LABELS, AUTH_STATUS_LABELS, type AuthStatus } from '@shared';
import { api } from '../../lib/api';
import { adultName } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Adult } from '../../lib/types';
import { SearchSelect } from '../../components/SearchSelect';
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, type Tone } from '../../components/ui';
import { AuthorizationPaper } from './AuthorizationPaper';
import { SignDialog } from './SignDialog';
import { DeleteAuthButton } from './AuthorizationsPage';
import type { AuthDetail } from './types';

export const AUTH_STATUS_TONE: Record<AuthStatus, Tone> = { firmada: 'warn', completa: 'ok', anulada: 'danger' };


/** Autorización firmada: se ve como la planilla oficial, se descarga en PDF y desde acá firman testigos y aval. */
export function AuthorizationDocPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['authorizations', 'doc', id], queryFn: () => api.get<AuthDetail>(`/authorizations/${id}`) });
  const a = q.data;
  const [dialog, setDialog] = useState<'me' | 'other' | 'aval' | 'void' | null>(null);
  const [otherId, setOtherId] = useState('');
  const [reason, setReason] = useState('');
  const adults = useQuery({ queryKey: ['adults', 'for-witness'], queryFn: () => api.get<Adult[]>('/adults'), enabled: dialog === 'other', staleTime: 60_000 });

  const kid = a?.member ? `${a.member.firstName} ${a.member.lastName}` : '';
  const [downloading, setDownloading] = useState(false);
  // El PDF lo arma el servidor, con la disposición de la planilla oficial
  const download = async () => {
    if (!a) return;
    setDownloading(true);
    try {
      await api.download(`/authorizations/${a.id}/pdf`, `${AUTH_KIND_LABELS[a.kind]} - ${kid}.pdf`);
    } catch (err) {
      toast.error(err);
    } finally {
      setDownloading(false);
    }
  };
  useEffect(() => {
    if (a && params.get('descargar') === '1') void download();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!a) return null;

  const refresh = () => Promise.all(['authorizations', 'member', 'members', 'doc-board', 'camp'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const voided = a.status === 'anulada';
  const meCanWitness = a.canWitness && !!a.me && !a.me.isWitness;
  const witnessIds = new Set(a.witnessList.map((w) => w.adultId));

  return (
    <div className="auth-wrap">
      <div className="auth-toolbar no-print">
        <Button variant="secondary" onClick={() => (params.get('nueva') ? navigate(a.camp ? `/campamentos/${a.camp.id}?tab=legajo` : a.member ? `/protagonistas/${a.member.id}?tab=docs` : '/autorizaciones') : navigate(-1))}>
          <ArrowLeft /> Volver
        </Button>
        <Button onClick={download} loading={downloading}>
          <Download /> Descargar PDF
        </Button>
        <Badge tone={AUTH_STATUS_TONE[a.status]}>{AUTH_STATUS_LABELS[a.status]}</Badge>
        <span className="muted">
          {AUTH_KIND_LABELS[a.kind]} · <Link to={a.member ? `/protagonistas/${a.member.id}` : '#'}>{kid}</Link>
        </span>
      </div>

      {!voided && (a.pending || params.get('nueva')) ? (
        <div className="no-print">
          <Card>
          <div className="stack">
            {a.pending ? (
              <p style={{ margin: 0 }}>
                <Badge tone="warn">Falta</Badge> {a.pending}.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <CheckCircle2 size={16} style={{ verticalAlign: '-3px', color: 'var(--ok)' }} /> La autorización quedó completa y figura en el legajo. Podés descargarla en PDF.
              </p>
            )}
            <div className="row">
              {meCanWitness ? (
                <Button onClick={() => setDialog('me')}>
                  <PenLine /> Firmar como testigo ({a.me!.name})
                </Button>
              ) : null}
              {a.canWitness ? (
                <Button variant={meCanWitness ? 'secondary' : 'primary'} onClick={() => setDialog('other')}>
                  <Users /> Firma otro educador en este dispositivo
                </Button>
              ) : null}
              {a.canApprove ? (
                <Button onClick={() => setDialog('aval')}>
                  <PenLine /> Dar el aval
                </Button>
              ) : null}
            </div>
            {a.pending && !a.canWitness && !a.canApprove ? <p className="muted" style={{ margin: 0 }}>El aval lo da el Jefe/a de Unidad o de Grupo desde «Autorizaciones».</p> : null}
            {a.canWitness && !a.me ? <p className="muted" style={{ margin: 0 }}>Tu usuario no está vinculado a un adulto del Grupo: los testigos tienen que firmar eligiéndose de la lista.</p> : null}
          </div>
          </Card>
        </div>
      ) : null}

      <AuthorizationPaper
        content={a.content}
        text={a.text}
        signature={a.signature}
        custodySignature={a.custodySignature}
        witnesses={a.witnessList}
        aval={a.aval}
        proof={{ signedAt: a.signedAt, attendedBy: a.attendedBy, hash: a.hash }}
        voided={voided ? { at: a.voidedAt, reason: a.voidReason } : null}
      />

      {a.canVoid || a.canDelete ? (
        <div className="row no-print" style={{ justifyContent: 'flex-end' }}>
          {a.canVoid ? (
            <Button variant="ghost" size="sm" onClick={() => setDialog('void')}>
              <Ban /> Anular esta autorización
            </Button>
          ) : null}
          {a.canDelete ? <DeleteAuthButton row={a} onDone={() => navigate(-1)} /> : null}
        </div>
      ) : null}

      {dialog === 'me' ? (
        <SignDialog
          title="Firmar como testigo"
          confirmLabel="Firmar como testigo"
          onClose={() => setDialog(null)}
          onSign={async (signature) => {
            await api.post(`/authorizations/${a.id}/witness`, { signature });
            toast.ok('Firmaste como testigo');
            await refresh();
          }}
        >
          <p style={{ margin: 0 }}>
            <b>{a.me?.name}</b>: firmás como testigo presencial de que {a.signerName} firmó la autorización de ingreso de {kid}.
          </p>
        </SignDialog>
      ) : null}

      {dialog === 'other' ? (
        <SignDialog
          title="Otro educador firma como testigo"
          confirmLabel="Firmar como testigo"
          disabled={!otherId}
          onClose={() => setDialog(null)}
          onSign={async (signature) => {
            await api.post(`/authorizations/${a.id}/witness`, { adultId: otherId, signature });
            toast.ok('Testigo registrado');
            setOtherId('');
            await refresh();
          }}
        >
          <Field label="Quién firma" required hint="Un educador o educadora del Grupo que esté presente">
            <SearchSelect
              value={otherId}
              onChange={setOtherId}
              placeholder={adults.isLoading ? 'Cargando…' : 'Elegí al educador'}
              searchPlaceholder="Buscar por nombre o tótem"
              options={(adults.data ?? [])
                .filter((x) => x.status !== 'baja' && !witnessIds.has(x.id))
                .map((x) => ({ value: x.id, label: adultName(x), hint: x.assignments?.[0]?.position, keywords: `${x.totem ?? ''} ${x.dni ?? ''}` }))}
            />
          </Field>
        </SignDialog>
      ) : null}

      {dialog === 'aval' ? (
        <SignDialog
          title="Aval del responsable scout"
          confirmLabel="Dar el aval"
          disabled={!a.me?.hasDni}
          onClose={() => setDialog(null)}
          onSign={async (signature) => {
            await api.post('/authorizations/aval', { ids: [a.id], signature });
            toast.ok('Aval registrado');
            await refresh();
          }}
        >
          <p style={{ margin: 0 }}>
            Certificás que {kid} tiene el legajo personal completo y que la firma de {a.signerName} es la registrada en su autorización de ingreso.
          </p>
          {a.me?.hasDni ? (
            <p className="muted" style={{ margin: 0 }}>
              Firma: {a.me.name}
              {a.me.function ? ` · ${a.me.function}` : ''}
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              <Badge tone="warn">Atención</Badge> Para dar el aval, tu usuario tiene que estar vinculado a un adulto del Grupo con el DNI cargado.
            </p>
          )}
        </SignDialog>
      ) : null}

      {dialog === 'void' ? (
        <Modal
          title="Anular la autorización"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={!reason.trim()}
                onClick={async () => {
                  try {
                    await api.post(`/authorizations/${a.id}/void`, { reason });
                    toast.ok('Autorización anulada');
                    setDialog(null);
                    await refresh();
                  } catch (err) {
                    toast.error(err);
                  }
                }}
              >
                <Ban /> Anular
              </Button>
            </>
          }
        >
          <div className="stack">
            <p style={{ margin: 0 }}>Queda guardada como anulada (no se borra) y en el legajo vuelve a figurar como faltante. Si había un error, después se firma una nueva.</p>
            <Field label="Motivo" required>
              <Input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Ej: un dato estaba mal; la familia la revocó" />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

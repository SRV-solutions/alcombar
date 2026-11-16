import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftRight, Mail, MessageCircle, Pencil, Phone, Plus, Tent, Trash2, Unlink } from 'lucide-react';
import {
  ageAt,
  AFFILIATION_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  BRANCH_INFO,
  DOC_STATUS_LABELS,
  formatDate,
  TRANSFER_REASON_LABELS,
  type TransferReason,
  type AffiliationStatus,
  type AttendanceStatus,
  type Branch,
} from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import type { Guardian, MemberDetail, MemberDoc } from '../../lib/types';
import { Badge, Button, Card, ConfirmButton, DocDot, Empty, ErrorBox, LinkButton, Loading, PageHeader, Tabs, UnitBadge, type Tone } from '../../components/ui';
import { AffiliationDialog, DocumentDialog, GuardianDialog, TransferDialog } from './MemberDialogs';
import { AssignUnitDialog } from './AssignUnitDialog';
import { PendingBadge } from './MembersPage';
import { useAuth } from '../../lib/auth';

type TabKey = 'datos' | 'familia' | 'docs' | 'historial' | 'asistencia';

const ATT_TONE: Record<AttendanceStatus, Tone> = { presente: 'ok', ausente: 'danger', tarde: 'warn', justificado: 'info' };
const DOC_TONE = { ok: 'ok', expiring: 'warn', expired: 'danger', missing: 'neutral' } as const;

const waLink = (phone: string) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = `549${d}`;
  return `https://wa.me/${d}`;
};

export function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [tab, setTab] = useState<TabKey>('datos');
  const [dialog, setDialog] = useState<
    | { kind: 'guardian'; guardian?: Guardian }
    | { kind: 'doc'; doc: MemberDoc }
    | { kind: 'transfer' }
    | { kind: 'assign' }
    | { kind: 'affiliation'; initial?: MemberDetail['affiliations'][number] }
    | null
  >(null);
  const q = useQuery({ queryKey: ['member', id], queryFn: () => api.get<MemberDetail>(`/members/${id}`) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['member', id] });
    void qc.invalidateQueries({ queryKey: ['members'] });
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const m = q.data!;
  const age = ageAt(m.birthDate);
  const branch = BRANCH_INFO[(m.unit?.branch ?? m.branch) as Branch];
  // Sin unidad: puede asignarla quien edita protagonistas en alguna unidad (el servidor valida la rama)
  const canAssign = !m.unit && can('members', 'edit');
  const pendingDocs = m.documents?.filter((d) => d.status === 'missing' || d.status === 'expired').length ?? 0;
  const presentCount = m.attendance.filter((a) => a.status === 'presente' || a.status === 'tarde').length;

  const tabs: { key: TabKey; label: React.ReactNode }[] = [
    { key: 'datos', label: 'Datos' },
    ...(m.canViewContacts ? [{ key: 'familia' as const, label: `Responsables (${m.guardians.length})` }] : []),
    ...(m.documents ? [{ key: 'docs' as const, label: <>Documentación {pendingDocs ? <Badge tone="warn">{pendingDocs}</Badge> : null}</> }] : []),
    { key: 'historial', label: 'Pases y afiliación' },
    ...(m.canViewAttendance ? [{ key: 'asistencia' as const, label: 'Asistencia' }] : []),
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/protagonistas', label: 'Protagonistas' }]}
        title={
          <>
            {m.firstName} {m.lastName} {m.status === 'baja' ? <Badge>Baja</Badge> : null}
          </>
        }
        sub={
          <span className="row" style={{ gap: 12 }}>
            {m.unit ? (
              <Link to={`/grupo/unidades/${m.unit.id}`}>
                <UnitBadge unit={m.unit} />
              </Link>
            ) : (
              <PendingBadge branch={m.branch} />
            )}
            {m.smallGroup ? <span>· {m.smallGroup.name}</span> : null}
            {age !== null ? <span>· {age} años</span> : null}
          </span>
        }
        actions={
          <>
            {canAssign ? (
              <Button onClick={() => setDialog({ kind: 'assign' })}>
                <Tent /> Asignar unidad
              </Button>
            ) : null}
            {m.canEdit ? (
              <>
                {m.unit ? (
                  <Button variant="secondary" onClick={() => setDialog({ kind: 'transfer' })}>
                    <ArrowLeftRight /> Pase de unidad
                  </Button>
                ) : null}
                <LinkButton to={`/protagonistas/${m.id}/editar`}>
                  <Pencil /> Editar
                </LinkButton>
              </>
            ) : null}
            {m.canDelete ? (
              <ConfirmButton
                title="Eliminar protagonista"
                message={
                  <>
                    <p>
                      ¿Eliminar a <strong>{m.firstName} {m.lastName}</strong> del padrón?
                    </p>
                    <p className="muted">Si dejó de venir, conviene darlo/a de baja (Editar → Estado) para conservar su historial.</p>
                  </>
                }
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  await api.del(`/members/${m.id}`);
                  toast.ok('Protagonista eliminado');
                  await qc.invalidateQueries({ queryKey: ['members'] });
                  navigate('/protagonistas');
                }}
              >
                <Trash2 />
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'datos' ? (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <Card title="Datos personales">
            <dl className="dl">
              <dt>Fecha de nacimiento</dt>
              <dd>{m.birthDate ? `${formatDate(m.birthDate)} (${age} años)` : '—'}</dd>
              <dt>DNI</dt>
              <dd>{m.dni ?? '—'}</dd>
              <dt>Ingreso al Grupo</dt>
              <dd>{formatDate(m.joinedAt) || '—'}</dd>
              <dt>Promesa</dt>
              <dd>{formatDate(m.promiseDate) || '—'}</dd>
              {m.status === 'baja' ? (
                <>
                  <dt>Baja</dt>
                  <dd>{formatDate(m.leftAt) || '—'}</dd>
                </>
              ) : null}
              <dt>{branch?.smallGroup.one ?? 'Pequeño grupo'}</dt>
              <dd>{m.smallGroup?.name ?? '—'}</dd>
            </dl>
          </Card>
          <Card title="Contacto">
            {m.canViewContacts ? (
              <dl className="dl">
                <dt>Dirección</dt>
                <dd>{m.address ?? '—'}</dd>
                <dt>Teléfono</dt>
                <dd>{m.phone ? <a href={`tel:${m.phone}`}>{m.phone}</a> : '—'}</dd>
                <dt>Email</dt>
                <dd>{m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : '—'}</dd>
                <dt>Hermanos/as en el Grupo</dt>
                <dd>
                  {m.siblings.length
                    ? m.siblings.map((s, i) => (
                        <span key={s.id}>
                          {i ? ', ' : ''}
                          <Link to={`/protagonistas/${s.id}`}>
                            {s.firstName} {s.lastName}
                          </Link>
                        </span>
                      ))
                    : '—'}
                </dd>
              </dl>
            ) : (
              <p className="muted">Los datos de contacto los ven la unidad del protagonista, Secretaría, Tesorería y Jefatura.</p>
            )}
          </Card>
          {m.notes ? (
            <Card title="Observaciones">
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.notes}</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'familia' ? (
        <Card
          title="Responsables adultos"
          actions={
            m.canEditContacts ? (
              <Button size="sm" onClick={() => setDialog({ kind: 'guardian' })}>
                <Plus /> Agregar
              </Button>
            ) : null
          }
        >
          {!m.guardians.length ? (
            <Empty>No hay responsables cargados.</Empty>
          ) : (
            <div className="grid grid-2">
              {m.guardians.map((g) => (
                <div key={g.linkId} className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-body">
                    <div className="row between">
                      <div>
                        <strong>{g.name}</strong> {g.relationship ? <Badge tone="bordo">{g.relationship}</Badge> : null}
                      </div>
                      {m.canEditContacts ? (
                        <div className="row" style={{ gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'guardian', guardian: g })} aria-label="Editar">
                            <Pencil />
                          </Button>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            title="Desvincular responsable"
                            message={`¿Desvincular a ${g.name} de esta ficha? Si es responsable de hermanos, sigue vinculado a ellos.`}
                            confirmLabel="Desvincular"
                            onConfirm={async () => {
                              await api.del(`/members/${m.id}/guardians/${g.linkId}`);
                              refresh();
                            }}
                          >
                            <Unlink />
                          </ConfirmButton>
                        </div>
                      ) : null}
                    </div>
                    <ul className="list-plain" style={{ marginTop: 6 }}>
                      {g.phone ? (
                        <li className="row">
                          <Phone size={15} /> <a href={`tel:${g.phone}`}>{g.phone}</a>
                          <a href={waLink(g.phone)} target="_blank" rel="noreferrer" className="row" style={{ gap: 4 }}>
                            <MessageCircle size={15} /> WhatsApp
                          </a>
                        </li>
                      ) : null}
                      {g.email ? (
                        <li className="row">
                          <Mail size={15} /> <a href={`mailto:${g.email}`}>{g.email}</a>
                        </li>
                      ) : null}
                      {g.dni ? <li className="muted">DNI {g.dni}</li> : null}
                      {g.address ? <li className="muted">{g.address}</li> : null}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'docs' && m.documents ? (
        <Card title="Documentación" bodyClass="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estado</th>
                <th>Entregado</th>
                <th>Vence</th>
                <th>Notas</th>
                {m.canEditDocuments ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {m.documents.map((d) => (
                <tr key={d.documentTypeId}>
                  <td>{d.name}</td>
                  <td>
                    <span className="row" style={{ gap: 6 }}>
                      <DocDot status={d.status} />
                      <Badge tone={DOC_TONE[d.status]}>{DOC_STATUS_LABELS[d.status]}</Badge>
                    </span>
                  </td>
                  <td>{formatDate(d.presentedAt) || '—'}</td>
                  <td>{d.hasExpiry ? formatDate(d.expiresAt) || '—' : <span className="muted">No vence</span>}</td>
                  <td className="muted">{d.notes}</td>
                  {m.canEditDocuments ? (
                    <td className="num">
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'doc', doc: d })}>
                        Actualizar
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === 'historial' ? (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <Card title="Pases de rama">
            {m.transfers.length ? (
              <ul className="list-plain">
                {m.transfers.map((t) => (
                  <li key={t.id}>
                    <strong>{formatDate(t.date)}</strong>: {t.fromUnit?.name ?? '—'} → {t.toUnit?.name ?? '—'}
                    {t.reason ? <div className="muted">{TRANSFER_REASON_LABELS[t.reason as TransferReason] ?? t.reason}</div> : null}
                    {t.notes ? <div className="muted">{t.notes}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin pases registrados.</p>
            )}
          </Card>
          <Card
            title="Afiliación anual a SAAC"
            actions={
              m.canEdit ? (
                <Button size="sm" onClick={() => setDialog({ kind: 'affiliation' })}>
                  <Plus /> Año
                </Button>
              ) : null
            }
          >
            {m.affiliations.length ? (
              <ul className="list-plain">
                {m.affiliations.map((a) => (
                  <li key={a.id} className="row between">
                    <span>
                      <strong>{a.year}</strong>{' '}
                      <Badge tone={a.status === 'afiliado' ? 'ok' : a.status === 'en_tramite' ? 'info' : a.status === 'pendiente' ? 'warn' : 'neutral'}>
                        {AFFILIATION_STATUS_LABELS[a.status as AffiliationStatus] ?? a.status}
                      </Badge>
                      {a.date ? <span className="muted"> · {formatDate(a.date)}</span> : null}
                    </span>
                    {m.canEdit ? (
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'affiliation', initial: a })}>
                        <Pencil />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin afiliaciones registradas.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'asistencia' ? (
        <Card title={`Asistencia (últimos ${m.attendance.length} registros)`}>
          {m.attendance.length ? (
            <>
              <p>
                Asistió a <strong>{presentCount}</strong> de {m.attendance.length} encuentros registrados (
                {Math.round((presentCount / m.attendance.length) * 100)}%).
              </p>
              <div className="row" style={{ gap: 6 }}>
                {m.attendance.map((a) => (
                  <Badge key={a.id} tone={ATT_TONE[a.status as AttendanceStatus] ?? 'neutral'}>
                    {formatDate(a.date).slice(0, 5)} · {ATTENDANCE_STATUS_LABELS[a.status as AttendanceStatus] ?? a.status}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Todavía no hay asistencia registrada.</p>
          )}
        </Card>
      ) : null}

      {dialog?.kind === 'guardian' ? <GuardianDialog memberId={m.id} guardian={dialog.guardian} onClose={() => setDialog(null)} onSaved={refresh} /> : null}
      {dialog?.kind === 'doc' ? <DocumentDialog memberId={m.id} doc={dialog.doc} onClose={() => setDialog(null)} onSaved={refresh} /> : null}
      {dialog?.kind === 'transfer' ? (
        <TransferDialog
          member={m}
          onClose={() => setDialog(null)}
          onSaved={() => {
            refresh();
            void qc.invalidateQueries({ queryKey: ['units'] });
          }}
        />
      ) : null}
      {dialog?.kind === 'assign' ? (
        <AssignUnitDialog memberIds={[m.id]} branch={m.branch} onClose={() => setDialog(null)} onDone={refresh} />
      ) : null}
      {dialog?.kind === 'affiliation' ? (
        <AffiliationDialog memberId={m.id} initial={dialog.initial} onClose={() => setDialog(null)} onSaved={refresh} />
      ) : null}
    </>
  );
}

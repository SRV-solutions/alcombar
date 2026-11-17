import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Tabs, UnitBadge } from '../../components/ui';
import '../../components/notifications.css';

interface RegistryTask {
  id: string;
  kind: 'alta' | 'baja';
  personType: 'member' | 'adult';
  memberId: string | null;
  adultId: string | null;
  personName: string;
  unit: { id: string; name: string; code: string; branch: string } | null;
  detail: string | null;
  status: 'pendiente' | 'hecha' | 'anulada';
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string } | null;
  resolutionNote: string | null;
}
interface RegistryData {
  tasks: RegistryTask[];
  teams: { id: string; name: string }[];
  recipients: { users: number; emails: number };
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function Person({ t }: { t: RegistryTask }) {
  const to = t.memberId ? `/protagonistas/${t.memberId}` : t.adultId ? `/adultos/${t.adultId}` : null;
  return (
    <div className="registry-who">
      {to ? <Link to={to}>{t.personName}</Link> : <span>{t.personName}</span>}
      <span className="muted">{t.personType === 'member' ? (t.unit ? <UnitBadge unit={t.unit} /> : 'Protagonista sin unidad') : 'Adulto'}</span>
    </div>
  );
}

function DismissDialog({ tasks, onClose, onDone }: { tasks: RegistryTask[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      for (const t of tasks) await api.post(`/registry/${t.id}/resolve`, { status: 'anulada', note });
      toast.ok(tasks.length === 1 ? 'Marcado como "No corresponde"' : `${tasks.length} marcados como "No corresponde"`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="No corresponde cargarlo"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Confirmar
          </Button>
        </>
      }
    >
      <p>
        {tasks.length === 1 ? (
          <>
            {tasks[0].kind === 'alta' ? 'El alta' : 'La baja'} de <strong>{tasks[0].personName}</strong> no se va a cargar en Cruz del Sur.
          </>
        ) : (
          <>Estos {tasks.length} movimientos no se van a cargar en Cruz del Sur.</>
        )}
      </p>
      <Field label="Motivo (opcional)" full>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ej: ya estaba cargado, era un registro duplicado" autoFocus />
      </Field>
    </Modal>
  );
}

/** Altas y bajas que hay que cargar en Cruz del Sur, la plataforma oficial de SAAC. */
export function RegistryPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<'pendientes' | 'resueltas'>('pendientes');
  const [kind, setKind] = useState<'' | 'alta' | 'baja'>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dismiss, setDismiss] = useState<RegistryTask[] | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['registry', tab],
    queryFn: () => api.get<RegistryData>(`/registry${tab === 'resueltas' ? '?status=resueltas' : ''}`),
    enabled: !!me,
  });

  const refresh = () => {
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ['registry'] });
    void qc.invalidateQueries({ queryKey: ['registry-summary'] });
  };

  const resolve = async (tasks: RegistryTask[], status: 'hecha' | 'pendiente') => {
    setBusy(true);
    try {
      for (const t of tasks) await api.post(`/registry/${t.id}/resolve`, { status });
      toast.ok(status === 'hecha' ? (tasks.length === 1 ? 'Marcado como hecho en Cruz del Sur' : `${tasks.length} marcados como hechos`) : 'Volvió a pendientes');
      refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  const tasks = d.tasks.filter((t) => !kind || t.kind === kind);
  const altas = d.tasks.filter((t) => t.kind === 'alta').length;
  const bajas = d.tasks.filter((t) => t.kind === 'baja').length;
  const chosen = tasks.filter((t) => selected.has(t.id));
  const allChosen = tasks.length > 0 && chosen.length === tasks.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <PageHeader
        title="Altas y bajas · Cruz del Sur"
        sub="Cada vez que en ALCOMBAR se da de alta o de baja a un protagonista o a un adulto, queda acá para cargarlo en Cruz del Sur, la plataforma oficial de SAAC. Cuando esté cargado, marcalo como hecho así el resto del equipo lo sabe."
      />
      <div className="card registry-note">
        <div className="card-body">
          {d.teams.length ? (
            <p>
              Reciben los avisos (en la campanita y por mail): <strong>{d.teams.map((t) => t.name).join(', ')}</strong> ·{' '}
              {d.recipients.users} {d.recipients.users === 1 ? 'persona con usuario' : 'personas con usuario'}
              {d.recipients.emails ? `, ${d.recipients.emails} ${d.recipients.emails === 1 ? 'mail' : 'mails'}` : ''}.
            </p>
          ) : (
            <p>
              <Badge tone="warn">Atención</Badge> Ningún equipo recibe los avisos. Activalo en <Link to="/grupo/equipos">Equipos de apoyo</Link> («Recibe los
              avisos de altas y bajas»).
            </p>
          )}
          <p className="muted">
            Protagonistas: cuenta el estado «Activo/a». Adultos: cuenta el estado «Alta» (el período de prueba todavía no se carga). Si alguien se da de alta y
            de baja antes de que se cargue, los dos movimientos se anulan solos.
          </p>
        </div>
      </div>

      <div className="table-toolbar">
        <Tabs
          tabs={[
            { key: 'pendientes', label: `Pendientes${tab === 'pendientes' ? ` (${d.tasks.length})` : ''}` },
            { key: 'resueltas', label: 'Resueltas' },
          ]}
          value={tab}
          onChange={(k) => {
            setTab(k);
            setSelected(new Set());
          }}
        />
        <select className="select select-inline" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Filtrar por tipo">
          <option value="">Altas y bajas ({d.tasks.length})</option>
          <option value="alta">Solo altas ({altas})</option>
          <option value="baja">Solo bajas ({bajas})</option>
        </select>
      </div>

      {tab === 'pendientes' && chosen.length ? (
        <div className="move-bar">
          <span>
            {chosen.length} {chosen.length === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <Button size="sm" onClick={() => void resolve(chosen, 'hecha')} loading={busy}>
            <Check /> Marcar como hechos en Cruz del Sur
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDismiss(chosen)}>
            <X /> No corresponde
          </Button>
        </div>
      ) : null}

      {!tasks.length ? (
        <Empty>{tab === 'pendientes' ? 'No hay altas ni bajas pendientes de cargar en Cruz del Sur. ¡Todo al día!' : 'Todavía no hay movimientos resueltos.'}</Empty>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {tab === 'pendientes' ? (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allChosen}
                        onChange={() => setSelected(allChosen ? new Set() : new Set(tasks.map((t) => t.id)))}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                  ) : null}
                  <th>Movimiento</th>
                  <th>Persona</th>
                  <th>Registrado en ALCOMBAR</th>
                  {tab === 'resueltas' ? <th>Resuelto</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    {tab === 'pendientes' ? (
                      <td>
                        <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Seleccionar ${t.personName}`} />
                      </td>
                    ) : null}
                    <td>
                      <Badge tone={t.kind === 'alta' ? 'ok' : 'danger'}>{t.kind === 'alta' ? 'Alta' : 'Baja'}</Badge>
                    </td>
                    <td>
                      <Person t={t} />
                      {t.detail ? <div className="registry-detail">{t.detail}</div> : null}
                    </td>
                    <td>
                      <div>{when(t.createdAt)}</div>
                      <div className="muted">{t.createdBy?.name ?? 'Carga inicial'}</div>
                    </td>
                    {tab === 'resueltas' ? (
                      <td>
                        <Badge tone={t.status === 'hecha' ? 'ok' : 'neutral'}>{t.status === 'hecha' ? 'Hecha en Cruz del Sur' : 'No corresponde'}</Badge>
                        <div className="muted">
                          {when(t.resolvedAt)}
                          {t.resolvedBy ? ` · ${t.resolvedBy.name}` : ''}
                        </div>
                        {t.resolutionNote ? <div className="registry-detail">{t.resolutionNote}</div> : null}
                      </td>
                    ) : null}
                    <td>
                      <div className="registry-actions">
                        {tab === 'pendientes' ? (
                          <>
                            <Button size="sm" onClick={() => void resolve([t], 'hecha')} disabled={busy}>
                              <Check /> Hecha
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDismiss([t])}>
                              No corresponde
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => void resolve([t], 'pendiente')} disabled={busy}>
                            <RotateCcw /> Volver a pendiente
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dismiss ? <DismissDialog tasks={dismiss} onClose={() => setDismiss(null)} onDone={refresh} /> : null}
    </>
  );
}

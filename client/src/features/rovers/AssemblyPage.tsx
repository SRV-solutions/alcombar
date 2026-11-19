import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Gavel, Hand, Minus, Pencil, ThumbsDown, ThumbsUp, Undo2 } from 'lucide-react';
import { ASSEMBLY_PURPOSES, ASSEMBLY_PURPOSE_LABELS, PROJECT_KIND_LABELS, VOTE_LABELS, type AssemblyPurpose, type ProjectKind, type Vote } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { fmtDay, type AssemblyData, type AssemblyItem } from './types';
import './rovers.css';

const kindLabel = (k: string) => PROJECT_KIND_LABELS[k as ProjectKind] ?? k;
const VOTE_ICON = { si: <ThumbsUp />, no: <ThumbsDown />, abstencion: <Minus /> } as const;
const VOTES: Vote[] = ['si', 'no', 'abstencion'];
const purposeLabel = (p: string | null) => (p ? (ASSEMBLY_PURPOSE_LABELS[p as AssemblyPurpose] ?? p) : null);
interface Info {
  purpose: string;
  agenda: string;
  chairMemberId: string;
}

/**
 * Asamblea de Comunidad. El educador activa el modo Asamblea; los rovers dan el presente, postulan sus mingas y proyectos
 * y votan desde el celular. Se aprueba con más de la mitad de los presentes a favor; el voto es a la vista.
 */
export function AssemblyPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [info, setInfo] = useState<'open' | 'edit' | null>(null);
  const q = useQuery({
    queryKey: ['rover-assembly'],
    queryFn: () => api.get<AssemblyData>('/rovers/assembly'),
    // Con la Asamblea abierta se va actualizando sola (presentes, postulaciones y votos)
    refetchInterval: (query) => (query.state.data?.assembly ? 4000 : 30_000),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  const a = d.assembly;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['rover-assembly'] });
    void qc.invalidateQueries({ queryKey: ['rover-home'] });
    void qc.invalidateQueries({ queryKey: ['rover-projects'] });
  };
  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await q.refetch();
      refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  const header = (
    <PageHeader
      title="Asamblea de Comunidad"
      sub={`${d.unit.name}. Donde la Comunidad decide: acá se presentan y se votan las mingas y los proyectos, que se aprueban con más de la mitad de los presentes a favor.`}
    />
  );

  if (!a) {
    return (
      <>
        {header}
        <Card>
          <Empty icon={<Gavel />}>
            {d.canManage ? 'No hay Asamblea abierta. Cuando la Comunidad esté reunida, activá el modo Asamblea para que puedan postular y votar.' : 'No hay Asamblea abierta. Tu educador la activa cuando la Comunidad está reunida.'}
          </Empty>
          {d.canManage ? (
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <Button loading={busy === 'open'} onClick={() => setInfo('open')}>
                <Gavel /> Activar el modo Asamblea
              </Button>
            </div>
          ) : null}
        </Card>
        <Past data={d} />
        {info === 'open' ? (
          <InfoDialog
            mode="open"
            rovers={d.rovers}
            initial={{ purpose: '', agenda: '', chairMemberId: '' }}
            onClose={() => setInfo(null)}
            onConfirm={async (v) => {
              await act('open', () => api.post('/rovers/assembly', { unitId: d.unit.id, ...v }));
              setInfo(null);
            }}
          />
        ) : null}
      </>
    );
  }

  const presentSet = new Set(a.present);
  const voting = a.items.find((i) => i.status === 'votando');
  const togglePresent = (memberId: string, present: boolean) => act(`p${memberId}`, () => api.post(`/rovers/assembly/${a.id}/present`, { memberId, present }));
  const vote = (item: AssemblyItem, v: Vote, memberId?: string) => act(`v${item.id}${memberId ?? ''}${v}`, () => api.post(`/rovers/assembly/items/${item.id}/vote`, { vote: v, memberId }));

  return (
    <>
      {header}
      <div className="alert alert-ok assembly-live">
        <span>
          <strong>Asamblea abierta</strong> desde las {new Date(a.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {a.present.length} presentes
        </span>
        {d.canManage ? (
          <Button variant="secondary" size="sm" onClick={() => setClosing(true)}>
            Cerrar la Asamblea
          </Button>
        ) : null}
      </div>

      {a.purpose || a.agenda || a.chair || d.canManage ? (
        <div className="assembly-info">
          <Card
            title="De qué se trata"
            actions={
              d.canManage ? (
                <Button variant="ghost" size="sm" onClick={() => setInfo('edit')}>
                  <Pencil /> Editar
                </Button>
              ) : null
            }
          >
            {a.purpose || a.agenda || a.chair ? (
              <>
                <div className="row" style={{ gap: 8 }}>
                  {a.purpose ? <Badge tone="info">{purposeLabel(a.purpose)}</Badge> : null}
                  {a.chair ? (
                    <span>
                      Preside <strong>{a.chair.name}</strong>
                    </span>
                  ) : null}
                </div>
                {a.agenda ? <p className="agenda">{a.agenda}</p> : null}
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Todavía no cargaste para qué se reúnen, el orden del día ni quién preside.
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {d.me && !d.me.present ? (
        <div className="mt">
        <Card>
          <div className="row between">
            <span>
              <strong>¿Estás en la Asamblea?</strong> Dá el presente para poder votar.
            </span>
            <Button loading={busy === `p${d.me.memberId}`} onClick={() => void togglePresent(d.me!.memberId, true)}>
              <Hand /> Dar el presente
            </Button>
          </div>
        </Card>
        </div>
      ) : null}

      <div className="grid grid-2 mt" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {voting ? <VotingCard item={voting} data={d} presentSet={presentSet} busy={busy} onVote={vote} onClose={() => act('close-vote', () => api.post(`/rovers/assembly/items/${voting.id}/close-vote`))} /> : null}

          <Card title="Postulaciones">
            {a.items.filter((i) => i.status !== 'votando').length ? (
              <ul className="list-plain">
                {a.items
                  .filter((i) => i.status !== 'votando')
                  .map((i) => (
                    <li key={i.id} className="assembly-item">
                      <div>
                        <Link to={`/rover/proyectos/${i.project.id}`}>
                          <strong>{i.project.title}</strong>
                        </Link>
                        <div className="muted">
                          {kindLabel(i.project.kind)} · {i.project.owner}
                          {i.status !== 'pendiente' ? ` · ${i.yes} a favor, ${i.no} en contra, ${i.abstain} abst. de ${i.present}` : ''}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        {i.status === 'pendiente' ? (
                          <>
                            {d.canManage ? (
                              <Button size="sm" disabled={!!voting || !a.present.length} loading={busy === `ov${i.id}`} title={!a.present.length ? 'Primero marcá los presentes' : voting ? 'Cerrá la votación abierta' : undefined} onClick={() => void act(`ov${i.id}`, () => api.post(`/rovers/assembly/items/${i.id}/open-vote`))}>
                                Votar
                              </Button>
                            ) : (
                              <Badge>Espera su turno</Badge>
                            )}
                            {d.canManage || i.mine ? (
                              <button className="btn btn-ghost btn-icon" aria-label="Retirar la postulación" title="Retirar la postulación" disabled={!!busy} onClick={() => void act(`rm${i.id}`, () => api.del(`/rovers/assembly/items/${i.id}`))}>
                                <Undo2 />
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <Badge tone={i.status === 'aprobado' ? 'ok' : 'warn'}>{i.status === 'aprobado' ? 'Aprobado' : 'A reformular'}</Badge>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <Empty>{voting ? 'No hay más postulaciones.' : 'Todavía no se postuló nada.'}</Empty>
            )}
            {d.postulable.length ? (
              <div className="postulable">
                <div className="muted">Tus borradores, listos para postular:</div>
                {d.postulable.map((p) => (
                  <div key={p.id} className="row between">
                    <span>
                      {p.title} <span className="muted">· {kindLabel(p.kind)}</span>
                    </span>
                    <Button size="sm" variant="secondary" loading={busy === `post${p.id}`} onClick={() => void act(`post${p.id}`, () => api.post(`/rovers/assembly/${a.id}/items`, { projectId: p.id }))}>
                      Postular
                    </Button>
                  </div>
                ))}
              </div>
            ) : d.me ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                ¿Querés proponer algo? <Link to="/rover/proyectos">Armá tu minga o tu proyecto</Link> y postulalo acá.
              </p>
            ) : null}
          </Card>
        </div>

        <Card title={`Presentes (${a.present.length} de ${d.rovers.length})`}>
          <ul className="list-plain presents">
            {d.rovers.map((r) => {
              const here = presentSet.has(r.id);
              const canToggle = d.canManage || d.me?.memberId === r.id;
              return (
                <li key={r.id}>
                  <label className={`checkbox ${canToggle ? '' : 'readonly'}`}>
                    <input type="checkbox" checked={here} disabled={!canToggle || busy === `p${r.id}`} onChange={() => void togglePresent(r.id, !here)} />
                    <span>{r.name}</span>
                  </label>
                  {!r.hasAccount && d.canManage ? <span className="muted">sin cuenta</span> : null}
                </li>
              );
            })}
          </ul>
          {d.canManage ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              Cada rover puede dar el presente desde su celular. A quien no tiene cuenta lo marcás vos y le cargás el voto.
            </p>
          ) : null}
        </Card>
      </div>

      <Past data={d} />
      {info === 'edit' ? (
        <InfoDialog
          mode="edit"
          rovers={d.rovers}
          initial={{ purpose: a.purpose ?? '', agenda: a.agenda ?? '', chairMemberId: a.chair?.id ?? '' }}
          onClose={() => setInfo(null)}
          onConfirm={async (v) => {
            await act('info', () => api.put(`/rovers/assembly/${a.id}`, v));
            setInfo(null);
          }}
        />
      ) : null}
      {closing ? (
        <CloseDialog
          pending={a.items.filter((i) => i.status === 'pendiente' || i.status === 'votando').length}
          onClose={() => setClosing(false)}
          onConfirm={async (notes) => {
            await act('close', () => api.post(`/rovers/assembly/${a.id}/close`, { notes }));
            setClosing(false);
          }}
        />
      ) : null}
    </>
  );
}

function VotingCard({
  item,
  data,
  presentSet,
  busy,
  onVote,
  onClose,
}: {
  item: AssemblyItem;
  data: AssemblyData;
  presentSet: Set<string>;
  busy: string | null;
  onVote: (item: AssemblyItem, v: Vote, memberId?: string) => Promise<void>;
  onClose: () => Promise<void>;
}) {
  const voted = new Map(item.votes.map((v) => [v.memberId, v.vote]));
  const present = data.rovers.filter((r) => presentSet.has(r.id));
  const missing = present.filter((r) => !voted.has(r.id));
  const needed = Math.floor(item.present / 2) + 1;
  return (
    <Card title="Se está votando" actions={<Badge tone="info">{item.votes.filter((v) => presentSet.has(v.memberId)).length} de {item.present} votaron</Badge>}>
      <div className="voting-title">
        <Link to={`/rover/proyectos/${item.project.id}`}>{item.project.title}</Link>
      </div>
      <div className="muted">
        {kindLabel(item.project.kind)} · lo propone {item.project.owner}
      </div>
      {item.project.what ? <p className="voting-what">{item.project.what}</p> : null}

      {data.me ? (
        data.me.present ? (
          <div className="vote-buttons">
            {VOTES.map((v) => (
              <button key={v} className={`vote-btn vote-${v} ${item.myVote === v ? 'chosen' : ''}`} disabled={!!busy} onClick={() => void onVote(item, v)} aria-pressed={item.myVote === v}>
                {VOTE_ICON[v]}
                <span>{VOTE_LABELS[v]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="alert alert-warn">Para votar primero tenés que dar el presente.</div>
        )
      ) : null}
      {data.me?.present && item.myVote ? (
        <p className="muted" style={{ marginTop: 8 }}>
          <Check size={14} style={{ verticalAlign: '-2px' }} /> Tu voto: {VOTE_LABELS[item.myVote]}. Lo podés cambiar hasta que se cierre.
        </p>
      ) : null}

      <div className="tally">
        <div className="tally-bar" aria-hidden>
          <span className="yes" style={{ flex: item.yes }} />
          <span className="no" style={{ flex: item.no }} />
          <span className="abs" style={{ flex: item.abstain }} />
          <span className="rest" style={{ flex: Math.max(0, item.present - item.yes - item.no - item.abstain) }} />
        </div>
        <div className="tally-nums">
          <span>
            <strong>{item.yes}</strong> a favor
          </span>
          <span>
            <strong>{item.no}</strong> en contra
          </span>
          <span>
            <strong>{item.abstain}</strong> abst.
          </span>
          <span className="muted">Se aprueba con {needed}</span>
        </div>
      </div>

      <ul className="list-plain voters">
        {present.map((r) => {
          const v = voted.get(r.id);
          return (
            <li key={r.id}>
              <span>{r.name}</span>
              {data.canManage ? (
                <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  {VOTES.map((x) => (
                    <button key={x} className={`btn btn-sm ${v === x ? 'btn-primary' : 'btn-secondary'} btn-icon`} aria-label={`${r.name}: ${VOTE_LABELS[x]}`} title={VOTE_LABELS[x]} disabled={!!busy} onClick={() => void onVote(item, x, r.id)}>
                      {VOTE_ICON[x]}
                    </button>
                  ))}
                </span>
              ) : v ? (
                <Badge tone={v === 'si' ? 'ok' : v === 'no' ? 'danger' : 'neutral'}>{VOTE_LABELS[v]}</Badge>
              ) : (
                <span className="muted">Todavía no votó</span>
              )}
            </li>
          );
        })}
      </ul>

      {data.canManage ? (
        <div className="form-actions">
          <ConfirmButton
            variant="primary"
            title="Cerrar la votación"
            message={
              <>
                {missing.length ? (
                  <>
                    Todavía no {missing.length === 1 ? 'votó' : 'votaron'}: {missing.map((m) => m.name).join(', ')}. Los que no votan no suman a favor.{' '}
                  </>
                ) : null}
                Con {item.yes} a favor de {item.present} presentes, {item.yes >= needed ? 'queda aprobado.' : 'vuelve a su responsable para reformular.'}
              </>
            }
            confirmLabel="Cerrar y contar"
            onConfirm={onClose}
          >
            Cerrar la votación
          </ConfirmButton>
        </div>
      ) : null}
    </Card>
  );
}

/** Para qué se reúne la Asamblea, qué se trata y quién la preside (herramienta «Cómo organizar una Asamblea» de la Rama). */
function InfoDialog({ mode, rovers, initial, onClose, onConfirm }: { mode: 'open' | 'edit'; rovers: AssemblyData['rovers']; initial: Info; onClose: () => void; onConfirm: (v: Info) => Promise<void> }) {
  const [v, setV] = useState<Info>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={mode === 'open' ? 'Activar el modo Asamblea' : 'De qué se trata la Asamblea'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(v);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === 'open' ? 'Abrir la Asamblea' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="¿Para qué nos reunimos?" full hint="Conviene un solo objetivo por Asamblea.">
          <Select value={v.purpose} onChange={(e) => setV({ ...v, purpose: e.target.value })}>
            <option value="">Sin definir</option>
            {ASSEMBLY_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {ASSEMBLY_PURPOSE_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Orden del día" full hint="Los temas que se van a tratar y qué se espera resolver.">
          <Textarea rows={4} value={v.agenda} onChange={(e) => setV({ ...v, agenda: e.target.value })} />
        </Field>
        <Field label="¿Quién preside?" full hint="Un rover de la Comunidad; pueden ir rotando.">
          <Select value={v.chairMemberId} onChange={(e) => setV({ ...v, chairMemberId: e.target.value })}>
            <option value="">Sin definir</option>
            {rovers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {mode === 'open' ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          Los tres datos son opcionales y los podés completar con la Asamblea en marcha. Al abrirla, los rovers ya pueden dar el presente y postular.
        </p>
      ) : null}
    </Modal>
  );
}

function CloseDialog({ pending, onClose, onConfirm }: { pending: number; onClose: () => void; onConfirm: (notes: string) => Promise<void> }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Cerrar la Asamblea"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Seguir en Asamblea
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(notes);
              } finally {
                setBusy(false);
              }
            }}
          >
            Cerrar la Asamblea
          </Button>
        </>
      }
    >
      {pending ? (
        <div className="alert alert-warn" style={{ marginTop: 0 }}>
          {pending === 1 ? 'Queda 1 postulación sin votar: vuelve' : `Quedan ${pending} postulaciones sin votar: vuelven`} a borrador para una próxima Asamblea.
        </div>
      ) : null}
      <Field label="Notas de la Asamblea (opcional)" hint="Lo que se habló y se resolvió. Las votaciones quedan registradas solas.">
        <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

function Past({ data }: { data: AssemblyData }) {
  if (!data.past.length) return null;
  return (
    <div className="mt">
      <Card title="Asambleas anteriores">
        <ul className="list-plain">
          {data.past.map((p) => (
            <li key={p.id}>
              <div className="row between">
                <strong>{fmtDay(p.openedAt)}</strong>
                <span className="muted">{[purposeLabel(p.purpose), p.chair ? `presidió ${p.chair}` : null, `${p.present} presentes`].filter(Boolean).join(' · ')}</span>
              </div>
              {p.agenda ? <p className="past-notes muted">{p.agenda}</p> : null}
              {p.items.length ? (
                <ul className="past-items">
                  {p.items.map((i) => (
                    <li key={i.id}>
                      <Link to={`/rover/proyectos/${i.projectId}`}>{i.title}</Link>
                      <span className="muted">
                        {' '}
                        · {i.yes} a favor, {i.no} en contra, {i.abstain} abst.
                      </span>{' '}
                      <Badge tone={i.status === 'aprobado' ? 'ok' : 'warn'}>{i.status === 'aprobado' ? 'Aprobado' : 'A reformular'}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="muted">No se votó nada.</div>
              )}
              {p.notes ? <p className="past-notes">{p.notes}</p> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

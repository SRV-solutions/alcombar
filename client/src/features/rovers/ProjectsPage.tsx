import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gavel, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import {
  PROJECT_FIELDS,
  PROJECT_FIELD_LABELS,
  PROJECT_KIND_LABELS,
  PROJECT_SCOPES,
  PROJECT_SCOPE_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectField,
  type ProjectKind,
  type ProjectScope,
  type ProjectStatus,
} from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { fmtDay, STATUS_TONE, type CommunityData, type ProjectDetail, type ProjectSummary } from './types';
import './rovers.css';

const kindLabel = (k: string) => PROJECT_KIND_LABELS[k as ProjectKind] ?? k;
const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status}</Badge>;

/** Proyectos y mingas: los propios, aquellos a los que te invitaron y los que ya pasaron por la Asamblea. */
export function ProjectsPage() {
  const q = useQuery({ queryKey: ['rover-projects'], queryFn: () => api.get<{ canCreate: boolean; educator: boolean; projects: ProjectSummary[] }>('/rovers/projects') });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { canCreate, educator, projects } = q.data!;
  const mine = projects.filter((p) => p.mine);
  const others = projects.filter((p) => !p.mine);
  const list = (items: ProjectSummary[]) => (
    <ul className="list-plain">
      {items.map((p) => (
        <li key={p.id}>
          <Link to={`/rover/proyectos/${p.id}`} className="proj-row">
            <span className="proj-main">
              <strong>{p.title}</strong>
              <span className="muted">
                {[kindLabel(p.kind), p.field ? PROJECT_FIELD_LABELS[p.field as ProjectField] : null, p.mine ? null : p.owner?.name, p.startDate ? fmtDay(p.startDate) : null].filter(Boolean).join(' · ')}
              </span>
            </span>
            <StatusBadge status={p.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <PageHeader
        title="Proyectos y mingas"
        sub={
          educator
            ? 'Todo lo que propone la Comunidad, desde el borrador. La ficha la escribe cada rover; se aprueba en Asamblea.'
            : 'Armá tu propuesta, sumá a quienes quieras y postulala cuando haya Asamblea. Mientras es borrador la ven solo vos, tus invitados y tus educadores.'
        }
        actions={
          canCreate ? (
            <>
              <LinkButton to="/rover/proyectos/nuevo?tipo=minga" variant="secondary">
                <Plus /> Nueva minga
              </LinkButton>
              <LinkButton to="/rover/proyectos/nuevo?tipo=proyecto">
                <Plus /> Nuevo proyecto
              </LinkButton>
            </>
          ) : null
        }
      />
      {canCreate ? <Card title="Los míos">{mine.length ? list(mine) : <Empty>Todavía no propusiste nada. Una minga es una jornada corta de trabajo comunitario; un proyecto lleva más armado.</Empty>}</Card> : null}
      <div className={canCreate ? 'mt' : ''}>
        <Card title={canCreate ? 'De la Comunidad' : 'Proyectos y mingas'}>{others.length ? list(others) : <Empty>{canCreate ? 'Acá aparecen los que te inviten y los que pasen por la Asamblea.' : 'Todavía no hay ninguno.'}</Empty>}</Card>
      </div>
    </>
  );
}

const EMPTY = { title: '', field: '', scope: '', what: '', why: '', howWhere: '', forWhom: '', startDate: '', endDate: '', schedule: '', cost: '', funding: '', needs: '', celebration: '' };
type FormState = typeof EMPTY;

/** Ficha de proyecto (Guía, cap. 7): qué, por qué, cómo y dónde, para quiénes, cuándo, cuánto cuesta y cómo se financia. La minga usa una versión corta. */
function ProjectForm({ kind, initial, onSubmit, onCancel }: { kind: ProjectKind; initial: FormState; onSubmit: (v: FormState) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const minga = kind === 'minga';
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.title.trim()) return setError('Ponele un nombre');
        setBusy(true);
        try {
          await onSubmit(v);
        } finally {
          setBusy(false);
        }
      }}
      noValidate
    >
      <div className="form-grid">
        <Field label="Nombre" required full error={error ?? undefined}>
          <Input value={v.title} onChange={set('title')} placeholder={minga ? 'Ej.: Pintar el salón del merendero' : 'Ej.: Huerta comunitaria'} autoFocus />
        </Field>
        <Field label="¿Qué vamos a hacer?" full hint="Hace falta para poder postularlo a la Asamblea.">
          <Textarea rows={3} value={v.what} onChange={set('what')} />
        </Field>
        {minga ? null : (
          <Field label="¿Por qué?" full hint="Qué necesidad o qué ganas hay detrás.">
            <Textarea rows={3} value={v.why} onChange={set('why')} />
          </Field>
        )}
        <Field label={minga ? '¿Dónde?' : '¿Cómo y dónde?'} full>
          <Textarea rows={2} value={v.howWhere} onChange={set('howWhere')} />
        </Field>
        <Field label="¿Para quiénes?" full>
          <Textarea rows={2} value={v.forWhom} onChange={set('forWhom')} />
        </Field>
        <Field label={minga ? 'Fecha' : 'Empieza'}>
          <Input type="date" value={v.startDate} onChange={set('startDate')} />
        </Field>
        {minga ? (
          <Field label="Campo de acción">
            <Select value={v.field} onChange={set('field')}>
              <option value="">Sin definir</option>
              {PROJECT_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {PROJECT_FIELD_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Termina">
            <Input type="date" value={v.endDate} onChange={set('endDate')} />
          </Field>
        )}
        {minga ? (
          <Field label="¿Qué hace falta?" full hint="Materiales, herramientas, traslado, comida…">
            <Textarea rows={2} value={v.needs} onChange={set('needs')} />
          </Field>
        ) : (
          <>
            <Field label="Campo de acción" hint="Los cinco campos prioritarios de la Rama.">
              <Select value={v.field} onChange={set('field')}>
                <option value="">Sin definir</option>
                {PROJECT_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {PROJECT_FIELD_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="¿De quién es?">
              <Select value={v.scope} onChange={set('scope')}>
                <option value="">Sin definir</option>
                {PROJECT_SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_SCOPE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cronograma" full hint="Las etapas y sus fechas.">
              <Textarea rows={3} value={v.schedule} onChange={set('schedule')} />
            </Field>
            <Field label="¿Cuánto cuesta?">
              <Textarea rows={2} value={v.cost} onChange={set('cost')} />
            </Field>
            <Field label="¿Cómo lo financiamos?">
              <Textarea rows={2} value={v.funding} onChange={set('funding')} />
            </Field>
            <Field label="¿Cómo lo evaluamos y festejamos?" full>
              <Textarea rows={2} value={v.celebration} onChange={set('celebration')} />
            </Field>
          </>
        )}
      </div>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function ProjectNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const kind: ProjectKind = new URLSearchParams(window.location.search).get('tipo') === 'minga' ? 'minga' : 'proyecto';
  return (
    <>
      <PageHeader
        title={kind === 'minga' ? 'Nueva minga' : 'Nuevo proyecto'}
        sub={kind === 'minga' ? 'Una jornada corta de trabajo comunitario. Queda en borrador hasta que la postules en una Asamblea.' : 'Queda en borrador: podés completarlo de a poco y postularlo cuando haya Asamblea.'}
        crumbs={[{ to: '/rover/proyectos', label: 'Proyectos y mingas' }]}
      />
      <Card>
        <ProjectForm
          kind={kind}
          initial={EMPTY}
          onCancel={() => navigate('/rover/proyectos')}
          onSubmit={async (v) => {
            try {
              const r = await api.post<{ id: string }>('/rovers/projects', { ...v, kind });
              void qc.invalidateQueries({ queryKey: ['rover-projects'] });
              void qc.invalidateQueries({ queryKey: ['rover-home'] });
              navigate(`/rover/proyectos/${r.id}`, { replace: true });
            } catch (e) {
              toast.error(e);
            }
          }}
        />
      </Card>
    </>
  );
}

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['rover-project', id], queryFn: () => api.get<ProjectDetail>(`/rovers/projects/${id}`) });
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const p = q.data!;
  const kind = p.kind as ProjectKind;
  const minga = kind === 'minga';
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['rover-project', id] });
    void qc.invalidateQueries({ queryKey: ['rover-projects'] });
    void qc.invalidateQueries({ queryKey: ['rover-home'] });
    void qc.invalidateQueries({ queryKey: ['rover-assembly'] });
  };
  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast.ok(done);
      refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const rows: [string, string | null][] = [
    ['¿Qué vamos a hacer?', p.what],
    ['¿Por qué?', p.why],
    [minga ? '¿Dónde?' : '¿Cómo y dónde?', p.howWhere],
    ['¿Para quiénes?', p.forWhom],
    [minga ? 'Fecha' : 'Cuándo', [p.startDate ? fmtDay(p.startDate) : null, p.endDate ? fmtDay(p.endDate) : null].filter(Boolean).join(' al ') || null],
    ['Campo de acción', p.field ? PROJECT_FIELD_LABELS[p.field as ProjectField] : null],
    ['¿De quién es?', p.scope ? PROJECT_SCOPE_LABELS[p.scope as ProjectScope] : null],
    ['¿Qué hace falta?', p.needs],
    ['Cronograma', p.schedule],
    ['¿Cuánto cuesta?', p.cost],
    ['¿Cómo lo financiamos?', p.funding],
    ['¿Cómo lo evaluamos y festejamos?', p.celebration],
  ];
  const filled = rows.filter(([, v]) => v);

  return (
    <>
      <PageHeader
        title={p.title}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <StatusBadge status={p.status} />
            <span>
              {kindLabel(p.kind)} · responsable: {p.mine ? 'vos' : p.owner?.name}
            </span>
          </span>
        }
        crumbs={[{ to: '/rover/proyectos', label: 'Proyectos y mingas' }]}
        actions={
          <>
            {p.canEdit && !editing ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {p.canPostulate ? (
              <LinkButton to="/rover/asamblea">
                <Gavel /> Postular en la Asamblea
              </LinkButton>
            ) : null}
          </>
        }
      />
      {p.status === 'reformular' ? (
        <div className="alert alert-warn">La Asamblea no lo aprobó todavía. Podés reformularlo con lo que se habló y volver a postularlo.</div>
      ) : p.canEdit && !p.assemblyOpen ? (
        <div className="alert alert-info">Es un borrador. Cuando tu educador abra la Asamblea lo vas a poder postular para que la Comunidad lo vote.</div>
      ) : null}

      {editing ? (
        <Card title="Ficha">
          <ProjectForm
            kind={kind}
            initial={{ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, (p as unknown as Record<string, string | null>)[k] ?? ''])) }}
            onCancel={() => setEditing(false)}
            onSubmit={async (v) => {
              try {
                await api.put(`/rovers/projects/${p.id}`, { ...v, kind });
                setEditing(false);
                refresh();
              } catch (e) {
                toast.error(e);
              }
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <Card title="Ficha">
            {filled.length ? (
              <dl className="dl ficha">
                {filled.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd style={{ whiteSpace: 'pre-wrap' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Empty>La ficha está vacía todavía.</Empty>
            )}
            {p.canEdit ? (
              <div className="form-actions">
                <ConfirmButton
                  variant="ghost"
                  title="Borrar el borrador"
                  message="Se borra la ficha y sus invitados. No se puede deshacer."
                  confirmLabel="Borrar"
                  onConfirm={async () => {
                    await api.del(`/rovers/projects/${p.id}`);
                    void qc.invalidateQueries({ queryKey: ['rover-projects'] });
                    void qc.invalidateQueries({ queryKey: ['rover-home'] });
                    navigate('/rover/proyectos', { replace: true });
                  }}
                >
                  <Trash2 /> Borrar el borrador
                </ConfirmButton>
              </div>
            ) : null}
          </Card>

          <div style={{ display: 'grid', gap: 16 }}>
            <Card
              title={`Con quiénes (${p.people.length + 1})`}
              actions={
                p.canInvite ? (
                  <Button size="sm" variant="secondary" onClick={() => setInviting(true)}>
                    <UserPlus /> Invitar
                  </Button>
                ) : null
              }
            >
              <ul className="list-plain">
                <li className="row between">
                  <span>{p.owner?.name}</span>
                  <Badge tone="bordo">Responsable</Badge>
                </li>
                {p.people.map((x) => (
                  <li key={x.id} className="row between">
                    <span>{x.name}</span>
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <Badge>{x.kind === 'rover' ? 'Rover' : 'Colaborador'}</Badge>
                      {p.canInvite ? (
                        <button className="btn btn-ghost btn-icon" aria-label={`Quitar a ${x.name}`} disabled={busy} onClick={() => void act(() => api.del(`/rovers/projects/${p.id}/people/${x.id}`))}>
                          <X />
                        </button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {p.canInvite && p.status === 'borrador' ? <p className="muted" style={{ marginBottom: 0 }}>Mientras es borrador lo ven solo las personas de esta lista y tus educadores.</p> : null}
            </Card>

            {p.decisions.length ? (
              <Card title="En la Asamblea">
                <ul className="list-plain">
                  {p.decisions.map((d) => (
                    <li key={d.id} className="row between">
                      <span>
                        {fmtDay(d.date)}
                        <span className="muted">
                          {' '}
                          · {d.yes} a favor, {d.no} en contra, {d.abstain} abst. · {d.present} presentes
                        </span>
                      </span>
                      <Badge tone={d.status === 'aprobado' ? 'ok' : 'warn'}>{d.status === 'aprobado' ? 'Aprobado' : 'A reformular'}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {['aprobado', 'en_curso', 'terminado'].includes(p.status) ? (
              <Card title="Cómo viene">
                {p.finalReport && report === null ? <p style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{p.finalReport}</p> : null}
                {p.canProgress ? (
                  report !== null ? (
                    <>
                      <Field label="Informe final" hint="Qué se hizo, quiénes participaron, qué salió bien y qué cambiarían.">
                        <Textarea rows={5} value={report} onChange={(e) => setReport(e.target.value)} autoFocus />
                      </Field>
                      <div className="form-actions">
                        <Button variant="secondary" onClick={() => setReport(null)}>
                          Cancelar
                        </Button>
                        <Button loading={busy} onClick={() => void act(() => api.post(`/rovers/projects/${p.id}/progress`, { status: 'terminado', finalReport: report }).then(() => setReport(null)), 'Informe guardado')}>
                          Guardar y dar por terminado
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      {p.status === 'aprobado' ? (
                        <Button loading={busy} onClick={() => void act(() => api.post(`/rovers/projects/${p.id}/progress`, { status: 'en_curso', finalReport: p.finalReport }), 'En marcha')}>
                          Ponerlo en marcha
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={() => setReport(p.finalReport ?? '')}>
                        {p.status === 'terminado' ? 'Editar el informe final' : 'Terminó: escribir el informe final'}
                      </Button>
                    </div>
                  )
                ) : !p.finalReport ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {p.status === 'aprobado' ? 'Aprobado por la Asamblea. Todavía no arrancó.' : p.status === 'en_curso' ? 'Está en marcha.' : 'Terminó. Falta el informe final.'}
                  </p>
                ) : null}
              </Card>
            ) : null}
          </div>
        </div>
      )}
      {inviting ? <InviteDialog project={p} onClose={() => setInviting(false)} onDone={refresh} /> : null}
    </>
  );
}

function InviteDialog({ project, onClose, onDone }: { project: ProjectDetail; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const q = useQuery({ queryKey: ['rover-community'], queryFn: () => api.get<CommunityData>('/rovers/community') });
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const has = (kind: 'memberId' | 'adultId', pid: string) => project.people.some((x) => x[kind] === pid);
  const add = async (body: { memberId?: string; adultId?: string }, key: string) => {
    setBusy(key);
    try {
      await api.post(`/rovers/projects/${project.id}/people`, body);
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  const t = term.trim().toLowerCase();
  const rovers = (q.data?.rovers ?? []).filter((r) => r.id !== project.owner?.id && (!t || r.name.toLowerCase().includes(t)));
  const adults = (q.data?.adults ?? []).filter((a) => !t || a.name.toLowerCase().includes(t));
  const row = (key: string, name: string, extra: string | null, already: boolean, body: { memberId?: string; adultId?: string }) => (
    <li key={key} className="row between">
      <span>
        {name}
        {extra ? <span className="muted"> · {extra}</span> : null}
      </span>
      {already ? (
        <Badge tone="ok">Ya está</Badge>
      ) : (
        <Button size="sm" variant="secondary" loading={busy === key} onClick={() => void add(body, key)}>
          Sumar
        </Button>
      )}
    </li>
  );
  return (
    <Modal title="Invitar al proyecto" onClose={onClose} footer={<Button onClick={onClose}>Listo</Button>}>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre…" aria-label="Buscar" />
          <h3 className="invite-title">Rovers de la Comunidad</h3>
          <ul className="list-plain">{rovers.length ? rovers.map((r) => row(`m${r.id}`, r.name, null, has('memberId', r.id), { memberId: r.id })) : <li className="muted">Nadie con ese nombre.</li>}</ul>
          <h3 className="invite-title">Adultos del Grupo (colaboradores)</h3>
          <ul className="list-plain">{adults.length ? adults.map((a) => row(`a${a.id}`, a.name, a.educator ? 'educador de la Comunidad' : null, has('adultId', a.id), { adultId: a.id })) : <li className="muted">Nadie con ese nombre.</li>}</ul>
        </>
      )}
    </Modal>
  );
}

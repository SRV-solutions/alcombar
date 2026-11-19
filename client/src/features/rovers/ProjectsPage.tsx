import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Gavel, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import {
  PROJECT_FIELDS,
  PROJECT_FIELD_LABELS,
  PROJECT_KIND_LABELS,
  PROJECT_SCOPES,
  PROJECT_SCOPE_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectActivity,
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
/** Qué es una minga, en una línea (definición de la Rama, publicada en Rumbo Sur). */
const MINGA_IS = 'Una minga es trabajo solidario y organizado que la Comunidad hace junto con otros —vecinos, una escuela, una organización— y que termina en festejo.';
type ProjectList = { canCreate: boolean; educator: boolean; projects: ProjectSummary[] };
const useProjects = (enabled = true) => useQuery({ queryKey: ['rover-projects'], queryFn: () => api.get<ProjectList>('/rovers/projects'), enabled });

/** Proyectos y mingas: los propios, aquellos a los que te invitaron y los que ya pasaron por la Asamblea. */
export function ProjectsPage() {
  const q = useProjects();
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
      {canCreate ? <Card title="Los míos">{mine.length ? list(mine) : <Empty>Todavía no propusiste nada. {MINGA_IS} Un proyecto es más largo y puede tener mingas adentro.</Empty>}</Card> : null}
      <div className={canCreate ? 'mt' : ''}>
        <Card title={canCreate ? 'De la Comunidad' : 'Proyectos y mingas'}>{others.length ? list(others) : <Empty>{canCreate ? 'Acá aparecen los que te inviten y los que pasen por la Asamblea.' : 'Todavía no hay ninguno.'}</Empty>}</Card>
      </div>
    </>
  );
}

const EMPTY = {
  title: '',
  field: '',
  scope: '',
  what: '',
  why: '',
  howWhere: '',
  forWhom: '',
  startDate: '',
  endDate: '',
  schedule: '',
  cost: '',
  funding: '',
  needs: '',
  celebration: '',
  supportTeam: '',
  expectedResult: '',
  roversEstimate: '',
  allies: '',
  roles: '',
  tools: '',
  outreach: '',
  media: '',
  slogan: '',
  parentProjectId: '',
};
type TextKey = keyof typeof EMPTY;
type FormState = typeof EMPTY & { activities: ProjectActivity[] };
const NEW_FORM: FormState = { ...EMPTY, activities: [] };
const toForm = (p: ProjectDetail): FormState => {
  const src = p as unknown as Record<string, string | number | null>;
  const text = Object.fromEntries((Object.keys(EMPTY) as TextKey[]).map((k) => [k, src[k] == null ? '' : String(src[k])])) as typeof EMPTY;
  return { ...text, parentProjectId: p.parent?.id ?? p.parentProjectId ?? '', activities: p.activities ?? [] };
};
const BLANK_ACTIVITY: ProjectActivity = { activity: '', responsible: '', resources: '', when: '', notes: '' };

/** El cuadro de actividades de la plantilla: qué se hace, quién, con qué y cuándo. */
function ActivitiesEditor({ value, onChange }: { value: ProjectActivity[]; onChange: (v: ProjectActivity[]) => void }) {
  const upd = (i: number, k: keyof ProjectActivity) => (e: { target: { value: string } }) => onChange(value.map((a, j) => (j === i ? { ...a, [k]: e.target.value } : a)));
  return (
    <>
      {value.length ? (
        <ul className="acts">
          {value.map((a, i) => (
            <li key={i}>
              <div className="act-main">
                <Input value={a.activity} onChange={upd(i, 'activity')} placeholder="Actividad" aria-label={`Actividad ${i + 1}`} />
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Quitar la actividad ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  <X />
                </button>
              </div>
              <Input value={a.responsible} onChange={upd(i, 'responsible')} placeholder="Responsable" aria-label={`Responsable de la actividad ${i + 1}`} />
              <Input value={a.when} onChange={upd(i, 'when')} placeholder="Fecha / hora" aria-label={`Fecha y hora de la actividad ${i + 1}`} />
              <div className="act-wide">
                <Input value={a.resources} onChange={upd(i, 'resources')} placeholder="Recursos necesarios" aria-label={`Recursos de la actividad ${i + 1}`} />
              </div>
              <div className="act-wide">
                <Input value={a.notes} onChange={upd(i, 'notes')} placeholder="Observaciones" aria-label={`Observaciones de la actividad ${i + 1}`} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...value, { ...BLANK_ACTIVITY }])}>
        <Plus /> Agregar actividad
      </Button>
    </>
  );
}

/**
 * Las dos fichas de la Rama, tal como están en Rumbo Sur:
 *  - Proyecto Rover: qué, por qué, cómo y dónde, para quiénes, con quiénes, cuándo, cronograma, cuánto cuesta, cómo se financia, evaluamos y festejamos.
 *  - Plantilla de organización de una Minga: datos generales, propósito, participantes, actividades, recursos, difusión y cierre.
 */
function ProjectForm({ kind, initial, currentId, onSubmit, onCancel }: { kind: ProjectKind; initial: FormState; currentId?: string; onSubmit: (v: FormState) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: TextKey) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const minga = kind === 'minga';
  const all = useProjects(minga);
  const parents = (all.data?.projects ?? []).filter((p) => p.kind === 'proyecto' && p.id !== currentId);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.title.trim()) {
          setError('Ponele un nombre');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setBusy(true);
        try {
          await onSubmit({ ...v, activities: v.activities.filter((a) => a.activity.trim()) });
        } finally {
          setBusy(false);
        }
      }}
      noValidate
    >
      {minga ? (
        <div className="form-grid">
          <h3 className="form-section">1. Datos generales</h3>
          <Field label="Nombre de la minga" required full error={error ?? undefined}>
            <Input value={v.title} onChange={set('title')} placeholder="Ej.: Pintamos el merendero del barrio" autoFocus />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={v.startDate} onChange={set('startDate')} />
          </Field>
          <Field label="Lugar">
            <Input value={v.howWhere} onChange={set('howWhere')} />
          </Field>
          <Field label="Equipo de apoyo o acompañamiento" full hint="La coordinás vos. Acá van quienes te dan una mano para organizarla.">
            <Input value={v.supportTeam} onChange={set('supportTeam')} />
          </Field>
          {parents.length || v.parentProjectId ? (
            <Field label="¿Es parte de un proyecto?" full hint="Una minga puede ser una etapa de un proyecto de la Comunidad.">
              <Select value={v.parentProjectId} onChange={set('parentProjectId')}>
                <option value="">No, va sola</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <h3 className="form-section">2. Propósito</h3>
          <Field label="Objetivo general de la minga" full hint="Hace falta para poder postularla a la Asamblea.">
            <Textarea rows={3} value={v.what} onChange={set('what')} />
          </Field>
          <Field label="Necesidad o problema que busca atender" full>
            <Textarea rows={2} value={v.why} onChange={set('why')} />
          </Field>
          <Field label="Resultado esperado" full>
            <Textarea rows={2} value={v.expectedResult} onChange={set('expectedResult')} />
          </Field>

          <h3 className="form-section">3. Participantes</h3>
          <Field label="Rovers (cantidad estimada)">
            <Input type="number" inputMode="numeric" min={0} max={999} value={v.roversEstimate} onChange={set('roversEstimate')} />
          </Field>
          <Field label="Otros participantes o aliados" full hint="ONG, vecinos, escuelas… Una minga siempre se hace con otros, no la Comunidad sola.">
            <Textarea rows={2} value={v.allies} onChange={set('allies')} />
          </Field>
          <Field label="Roles dentro de la Comunidad Rover" full hint="Quién se ocupa de qué.">
            <Textarea rows={2} value={v.roles} onChange={set('roles')} />
          </Field>

          <h3 className="form-section">4. Actividades</h3>
          <div style={{ gridColumn: '1 / -1' }}>
            <ActivitiesEditor value={v.activities} onChange={(activities) => setV((s) => ({ ...s, activities }))} />
          </div>

          <h3 className="form-section">5. Recursos</h3>
          <Field label="Materiales" full>
            <Textarea rows={2} value={v.needs} onChange={set('needs')} />
          </Field>
          <Field label="Herramientas o infraestructura" full>
            <Textarea rows={2} value={v.tools} onChange={set('tools')} />
          </Field>
          <Field label="Presupuesto estimado">
            <Textarea rows={2} value={v.cost} onChange={set('cost')} />
          </Field>
          <Field label="Fuentes de apoyo o donaciones">
            <Textarea rows={2} value={v.funding} onChange={set('funding')} />
          </Field>

          <h3 className="form-section">6. Comunicación y difusión</h3>
          <Field label="¿Cómo convocamos?" full>
            <Textarea rows={2} value={v.outreach} onChange={set('outreach')} />
          </Field>
          <Field label="Medios" hint="Redes, cartelería, boca en boca…">
            <Input value={v.media} onChange={set('media')} />
          </Field>
          <Field label="Mensaje clave o lema">
            <Input value={v.slogan} onChange={set('slogan')} />
          </Field>

          <h3 className="form-section">7. Cierre</h3>
          <Field label="Celebración o actividad de cierre" full hint="Toda minga termina en festejo. Los aprendizajes y el impacto los escribís cuando termine.">
            <Textarea rows={2} value={v.celebration} onChange={set('celebration')} />
          </Field>
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Nombre" required full error={error ?? undefined}>
            <Input value={v.title} onChange={set('title')} placeholder="Ej.: Huerta comunitaria" autoFocus />
          </Field>
          <Field label="¿Qué vamos a hacer?" full hint="Los objetivos. Hace falta para poder postularlo a la Asamblea.">
            <Textarea rows={3} value={v.what} onChange={set('what')} />
          </Field>
          <Field label="¿Por qué?" full hint="Los motivos: qué problema resuelve o qué mejora.">
            <Textarea rows={3} value={v.why} onChange={set('why')} />
          </Field>
          <Field label="¿Cómo y dónde?" full hint="Las actividades concretas y los lugares.">
            <Textarea rows={2} value={v.howWhere} onChange={set('howWhere')} />
          </Field>
          <Field label="¿Para quiénes?" full hint="Quiénes se benefician.">
            <Textarea rows={2} value={v.forWhom} onChange={set('forWhom')} />
          </Field>
          <Field label="¿Con quiénes más?" full hint="Organizaciones, socios o gente de afuera que ayuda. A los rovers y adultos del Grupo los sumás después con «Invitar».">
            <Textarea rows={2} value={v.allies} onChange={set('allies')} />
          </Field>
          <Field label="Empieza">
            <Input type="date" value={v.startDate} onChange={set('startDate')} />
          </Field>
          <Field label="Termina">
            <Input type="date" value={v.endDate} onChange={set('endDate')} />
          </Field>
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
          <Field label="¿De quién es?" hint="La Asamblea elige los de toda la Comunidad; los de equipo o individuales se le cuentan.">
            <Select value={v.scope} onChange={set('scope')}>
              <option value="">Sin definir</option>
              {PROJECT_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_SCOPE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cronograma" full hint="Los tiempos de cada actividad: semanas, meses.">
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
        </div>
      )}
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
        sub={kind === 'minga' ? `${MINGA_IS} Queda en borrador hasta que la postules en una Asamblea.` : 'Queda en borrador: podés completarlo de a poco y postularlo cuando haya Asamblea.'}
        crumbs={[{ to: '/rover/proyectos', label: 'Proyectos y mingas' }]}
      />
      <Card>
        <ProjectForm
          kind={kind}
          initial={NEW_FORM}
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

type Row = [string, ReactNode | null | undefined];
interface Closing {
  finalReport: string;
  learnings: string;
  impact: string;
  nextSteps: string;
  recordLink: string;
}

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['rover-project', id], queryFn: () => api.get<ProjectDetail>(`/rovers/projects/${id}`) });
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [closing, setClosing] = useState<Closing | null>(null);
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
  const saved: Closing = { finalReport: p.finalReport ?? '', learnings: p.learnings ?? '', impact: p.impact ?? '', nextSteps: p.nextSteps ?? '', recordLink: p.recordLink ?? '' };
  const when = [p.startDate ? fmtDay(p.startDate) : null, p.endDate ? fmtDay(p.endDate) : null].filter(Boolean).join(' al ') || null;
  const activities = p.activities.length ? (
    <ul className="act-list">
      {p.activities.map((a, i) => (
        <li key={i}>
          <strong>{a.activity}</strong>
          <div className="muted">{[a.responsible, a.when, a.resources ? `Recursos: ${a.resources}` : null].filter(Boolean).join(' · ')}</div>
          {a.notes ? <div className="muted">{a.notes}</div> : null}
        </li>
      ))}
    </ul>
  ) : null;
  const parentLink = p.parent ? <Link to={`/rover/proyectos/${p.parent.id}`}>{p.parent.title}</Link> : null;
  const sections: { title?: string; rows: Row[] }[] = minga
    ? [
        { title: 'Propósito', rows: [['Objetivo general', p.what], ['Necesidad o problema que busca atender', p.why], ['Resultado esperado', p.expectedResult]] },
        { title: 'Datos generales', rows: [['Fecha', when], ['Lugar', p.howWhere], ['Equipo de apoyo o acompañamiento', p.supportTeam], ['Es parte del proyecto', parentLink]] },
        { title: 'Participantes', rows: [['Rovers (cantidad estimada)', p.roversEstimate != null ? String(p.roversEstimate) : null], ['Otros participantes o aliados', p.allies], ['Roles dentro de la Comunidad', p.roles], ['¿Para quiénes?', p.forWhom]] },
        { title: 'Actividades', rows: [['', activities]] },
        { title: 'Recursos', rows: [['Materiales', p.needs], ['Herramientas o infraestructura', p.tools], ['Presupuesto estimado', p.cost], ['Fuentes de apoyo o donaciones', p.funding]] },
        { title: 'Comunicación y difusión', rows: [['¿Cómo convocamos?', p.outreach], ['Medios', p.media], ['Mensaje clave o lema', p.slogan]] },
        { title: 'Cierre', rows: [['Celebración o actividad de cierre', p.celebration]] },
      ]
    : [
        {
          rows: [
            ['¿Qué vamos a hacer?', p.what],
            ['¿Por qué?', p.why],
            ['¿Cómo y dónde?', p.howWhere],
            ['¿Para quiénes?', p.forWhom],
            ['¿Con quiénes más?', p.allies],
            ['Cuándo', when],
            ['Campo de acción', p.field ? PROJECT_FIELD_LABELS[p.field as ProjectField] : null],
            ['¿De quién es?', p.scope ? PROJECT_SCOPE_LABELS[p.scope as ProjectScope] : null],
            ['Cronograma', p.schedule],
            ['¿Cuánto cuesta?', p.cost],
            ['¿Cómo lo financiamos?', p.funding],
            ['¿Cómo lo evaluamos y festejamos?', p.celebration],
          ],
        },
      ];
  const filled = sections.map((s) => ({ ...s, rows: s.rows.filter(([, v]) => v) })).filter((s) => s.rows.length);
  const closingRows: Row[] = (
    minga
      ? ([['Aprendizajes', p.learnings], ['Impacto o cambio logrado', p.impact], ['Próximos pasos', p.nextSteps]] as Row[])
      : ([['Informe final', p.finalReport], ['Aprendizajes', p.learnings]] as Row[])
  ).filter(([, v]) => v);
  const hasClosing = closingRows.length > 0 || !!p.recordLink;
  const progress = (status: 'aprobado' | 'en_curso' | 'terminado', c: Closing) => api.post(`/rovers/projects/${p.id}/progress`, { status, ...c });

  return (
    <>
      <PageHeader
        title={p.title}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <StatusBadge status={p.status} />
            <span>
              {kindLabel(p.kind)} · {minga ? 'coordina' : 'responsable'}: {p.mine ? 'vos' : p.owner?.name}
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
        <Card title={minga ? 'Plantilla de la minga' : 'Ficha'}>
          <ProjectForm
            kind={kind}
            initial={toForm(p)}
            currentId={p.id}
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
          <Card title={minga ? 'Plantilla de la minga' : 'Ficha'}>
            {filled.length ? (
              filled.map((s, i) => (
                <div key={s.title ?? i}>
                  {s.title ? <h3 className="ficha-section">{s.title}</h3> : null}
                  <dl className="dl ficha">
                    {s.rows.map(([k, v], j) => (
                      <div key={k || j} style={{ display: 'contents' }}>
                        {k ? <dt>{k}</dt> : null}
                        <dd style={{ whiteSpace: 'pre-wrap' }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))
            ) : (
              <Empty>{minga ? 'La plantilla está vacía todavía.' : 'La ficha está vacía todavía.'}</Empty>
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
                  <Badge tone="bordo">{minga ? 'Coordina' : 'Responsable'}</Badge>
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

            {p.mingas.length ? (
              <Card title={`Mingas de este proyecto (${p.mingas.length})`}>
                <ul className="list-plain">
                  {p.mingas.map((m) => (
                    <li key={m.id}>
                      <Link to={`/rover/proyectos/${m.id}`} className="proj-row">
                        <span className="proj-main">
                          <strong>{m.title}</strong>
                          {m.startDate ? <span className="muted">{fmtDay(m.startDate)}</span> : null}
                        </span>
                        <StatusBadge status={m.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

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
              <Card title={p.status === 'terminado' ? 'Cierre y evaluación' : 'Cómo viene'}>
                {closing === null && hasClosing ? (
                  <dl className="dl ficha">
                    {closingRows.map(([k, v]) => (
                      <div key={k} style={{ display: 'contents' }}>
                        <dt>{k}</dt>
                        <dd style={{ whiteSpace: 'pre-wrap' }}>{v}</dd>
                      </div>
                    ))}
                    {p.recordLink ? (
                      <div style={{ display: 'contents' }}>
                        <dt>Registro</dt>
                        <dd>
                          <a href={p.recordLink} target="_blank" rel="noreferrer noopener">
                            Fotos, videos o testimonios <ExternalLink size={14} style={{ verticalAlign: '-2px' }} />
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {p.canProgress ? (
                  closing !== null ? (
                    <>
                      {minga ? (
                        <>
                          <Field label="Aprendizajes" hint="Qué nos llevamos de la minga.">
                            <Textarea rows={3} value={closing.learnings} onChange={(e) => setClosing({ ...closing, learnings: e.target.value })} autoFocus />
                          </Field>
                          <div style={{ height: 10 }} />
                          <Field label="Impacto o cambio logrado">
                            <Textarea rows={3} value={closing.impact} onChange={(e) => setClosing({ ...closing, impact: e.target.value })} />
                          </Field>
                          <div style={{ height: 10 }} />
                          <Field label="Próximos pasos" hint="Cómo sigue: otra minga, devolverle la mano a quien ayudó, continuidad en un proyecto…">
                            <Textarea rows={2} value={closing.nextSteps} onChange={(e) => setClosing({ ...closing, nextSteps: e.target.value })} />
                          </Field>
                        </>
                      ) : (
                        <>
                          <Field label="Informe final" hint="La historia del proyecto para quienes vengan después. Repasá objetivos, duración, participantes, división de tareas, acciones, recursos y fechas: qué salió bien y qué cambiarían.">
                            <Textarea rows={6} value={closing.finalReport} onChange={(e) => setClosing({ ...closing, finalReport: e.target.value })} autoFocus />
                          </Field>
                          <div style={{ height: 10 }} />
                          <Field label="Aprendizajes" hint="Qué aprendieron, y si ayudó a alguna meta de sus Planes Personales.">
                            <Textarea rows={3} value={closing.learnings} onChange={(e) => setClosing({ ...closing, learnings: e.target.value })} />
                          </Field>
                        </>
                      )}
                      <div style={{ height: 10 }} />
                      <Field label="Registro (opcional)" hint="Un enlace a las fotos, videos o testimonios.">
                        <Input type="url" inputMode="url" placeholder="https://…" value={closing.recordLink} onChange={(e) => setClosing({ ...closing, recordLink: e.target.value })} />
                      </Field>
                      <div className="form-actions">
                        <Button variant="secondary" onClick={() => setClosing(null)}>
                          Cancelar
                        </Button>
                        <Button loading={busy} onClick={() => void act(() => progress('terminado', closing).then(() => setClosing(null)), 'Guardado')}>
                          {p.status === 'terminado' ? 'Guardar' : 'Guardar y dar por terminado'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="row" style={{ gap: 8, marginTop: hasClosing ? 12 : 0 }}>
                      {p.status === 'aprobado' ? (
                        <Button loading={busy} onClick={() => void act(() => progress('en_curso', saved), 'En marcha')}>
                          {minga ? 'Ponerla en marcha' : 'Ponerlo en marcha'}
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={() => setClosing(saved)}>
                        {p.status === 'terminado' ? 'Editar el cierre' : minga ? 'Terminó: escribir el cierre' : 'Terminó: escribir el informe final'}
                      </Button>
                    </div>
                  )
                ) : !hasClosing ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {p.status === 'aprobado' ? 'Aprobado por la Asamblea. Todavía no arrancó.' : p.status === 'en_curso' ? 'Está en marcha.' : minga ? 'Terminó. Falta escribir el cierre.' : 'Terminó. Falta el informe final.'}
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
    <Modal title={project.kind === 'minga' ? 'Invitar a la minga' : 'Invitar al proyecto'} onClose={onClose} footer={<Button onClick={onClose}>Listo</Button>}>
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
          <p className="muted" style={{ marginBottom: 0 }}>A la gente de afuera del Grupo (vecinos, organizaciones) anotala en la ficha, en «{project.kind === 'minga' ? 'Otros participantes o aliados' : '¿Con quiénes más?'}».</p>
        </>
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { GOAL_STATUSES, GOAL_STATUS_LABELS, PLAN_REVIEW_QUESTIONS, todayIso, type GoalStatus, type PlanReviewAnswers, type RoverGoalAction } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { fmtDay, type Goal, type PlanData, type PlanReview } from './types';
import './rovers.css';

const GOAL_TONE = { en_curso: 'info', lograda: 'ok', dejada: 'neutral' } as const;

/**
 * Plan Personal de un rover (Guía de la Rama, cap. 9): su visión a futuro y sus metas, cada una con acciones, recursos y plazo.
 * Lo escribe el rover; sus educadores lo leen para acompañarlo.
 */
export function PlanPage() {
  const { memberId: param } = useParams();
  const { me } = useAuth();
  const memberId = param ?? me?.user.memberId ?? '';
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['rover-plan', memberId], queryFn: () => api.get<PlanData>(`/rovers/plans/${memberId}`), enabled: !!memberId });
  const [vision, setVision] = useState('');
  const [editVision, setEditVision] = useState(false);
  const [goal, setGoal] = useState<Goal | 'new' | null>(null);
  const [review, setReview] = useState<PlanReview | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setVision(q.data.vision ?? '');
  }, [q.data]);

  if (!memberId) return <Empty>El Plan Personal es de cada rover.</Empty>;
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const plan = q.data!;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['rover-plan', memberId] });
    void qc.invalidateQueries({ queryKey: ['rover-home'] });
  };
  const saveVision = async () => {
    setBusy(true);
    try {
      await api.put(`/rovers/plans/${memberId}`, { vision });
      setEditVision(false);
      refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  /** Tildar una acción sin abrir la meta. */
  const toggleAction = async (g: Goal, i: number) => {
    try {
      await api.put(`/rovers/goals/${g.id}`, { ...g, actions: g.actions.map((a, j) => (j === i ? { ...a, done: !a.done } : a)) });
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const open = plan.goals.filter((g) => g.status === 'en_curso');
  const closed = plan.goals.filter((g) => g.status !== 'en_curso');
  const areaName = (id: string | null) => plan.areas.find((a) => a.id === id)?.name;
  const own = plan.canEdit;

  const goalCard = (g: Goal) => {
    const comp = plan.competencies.find((c) => c.id === g.competencyId);
    return (
      <li key={g.id} className="goal">
        <div className="goal-head">
          <div>
            <div className="goal-title">{g.title}</div>
            <div className="muted goal-meta">
              {[areaName(g.areaId), g.dueDate ? `para el ${fmtDay(g.dueDate)}` : null, g.status === 'lograda' && g.achievedAt ? `lograda el ${fmtDay(g.achievedAt)}` : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <Badge tone={GOAL_TONE[g.status as GoalStatus] ?? 'neutral'}>{GOAL_STATUS_LABELS[g.status as GoalStatus] ?? g.status}</Badge>
            {own ? (
              <Button variant="ghost" size="sm" onClick={() => setGoal(g)} aria-label="Editar la meta">
                <Pencil />
              </Button>
            ) : null}
          </div>
        </div>
        {comp ? <div className="muted goal-comp">Competencia: {comp.name}</div> : null}
        {g.actions.length ? (
          <ul className="goal-actions">
            {g.actions.map((a, i) => (
              <li key={i}>
                <label className={`checkbox ${a.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={a.done} disabled={!own} onChange={() => void toggleAction(g, i)} />
                  <span>{a.text}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        {g.resources ? (
          <p className="goal-text">
            <span className="muted">Recursos: </span>
            {g.resources}
          </p>
        ) : null}
        {g.reflection ? (
          <p className="goal-text">
            <span className="muted">Cómo me fue: </span>
            {g.reflection}
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title={own ? 'Mi Plan Personal' : `Plan Personal de ${plan.member.name}`}
        sub={own ? 'Tu carta de navegación: hacia dónde querés ir y qué vas a hacer para llegar. Lo ven solo vos y tus educadores.' : 'Lo escribe el rover. Como educador lo podés leer para acompañarlo.'}
        crumbs={own ? undefined : [{ to: '/rover', label: 'Comunidad Rover' }]}
      />
      <Card
        title="Mi visión a futuro"
        actions={
          own && !editVision ? (
            <Button variant="ghost" size="sm" onClick={() => setEditVision(true)}>
              <Pencil /> {plan.vision ? 'Editar' : 'Escribir'}
            </Button>
          ) : null
        }
      >
        {editVision ? (
          <>
            <Textarea rows={5} value={vision} onChange={(e) => setVision(e.target.value)} placeholder="¿Cómo te imaginás dentro de tres o cuatro años? Estudio, trabajo, vínculos, lo que te importa…" autoFocus />
            <div className="form-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setVision(plan.vision ?? '');
                  setEditVision(false);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => void saveVision()} loading={busy}>
                Guardar
              </Button>
            </div>
          </>
        ) : plan.vision ? (
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{plan.vision}</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {own ? 'Empezá por acá: ¿cómo te imaginás dentro de tres o cuatro años? De esa visión salen tus metas.' : 'Todavía no la escribió.'}
          </p>
        )}
      </Card>

      <div className="mt">
        <Card
          title={`Metas en curso${open.length ? ` (${open.length})` : ''}`}
          actions={
            own ? (
              <Button size="sm" onClick={() => setGoal('new')}>
                <Plus /> Nueva meta
              </Button>
            ) : null
          }
        >
          {open.length ? (
            <ul className="list-plain goals">{open.map(goalCard)}</ul>
          ) : (
            <Empty>{own ? 'Todavía no tenés metas en curso. Una meta es algo concreto que querés lograr en menos de un año.' : 'No tiene metas en curso.'}</Empty>
          )}
        </Card>
      </div>
      {closed.length ? (
        <div className="mt">
          <Card title={`Metas cerradas (${closed.length})`}>
            <ul className="list-plain goals">{closed.map(goalCard)}</ul>
          </Card>
        </div>
      ) : null}

      {own || plan.reviews.length ? (
        <div className="mt">
          <Card
            title={`Altos en el camino${plan.reviews.length ? ` (${plan.reviews.length})` : ''}`}
            actions={
              own ? (
                <Button size="sm" variant="secondary" onClick={() => setReview('new')}>
                  <Plus /> Hacer un alto
                </Button>
              ) : null
            }
          >
            {plan.reviews.length ? (
              <ul className="list-plain">
                {plan.reviews.map((r) => (
                  <li key={r.id} className="review">
                    <div className="review-head">
                      <strong>{fmtDay(r.date)}</strong>
                      {own ? (
                        <Button variant="ghost" size="sm" onClick={() => setReview(r)} aria-label="Editar la evaluación">
                          <Pencil />
                        </Button>
                      ) : null}
                    </div>
                    <dl>
                      {PLAN_REVIEW_QUESTIONS.filter((x) => r.answers[x.key]).map((x) => (
                        <div key={x.key}>
                          <dt>{x.label}</dt>
                          <dd>{r.answers[x.key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Cada tanto —al cierre de un ciclo, por ejemplo— conviene parar a mirar cómo venís con tus metas, conversarlo con tu Comunidad y tus educadores, y ajustar el Plan.</Empty>
            )}
          </Card>
        </div>
      ) : null}

      {review ? (
        <ReviewDialog
          memberId={memberId}
          review={review === 'new' ? null : review}
          onClose={() => setReview(null)}
          onSaved={() => {
            setReview(null);
            refresh();
          }}
        />
      ) : null}
      {goal ? (
        <GoalDialog
          memberId={memberId}
          goal={goal === 'new' ? null : goal}
          plan={plan}
          onClose={() => setGoal(null)}
          onSaved={() => {
            setGoal(null);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

/** «Hacer un alto en el camino»: la evaluación del Plan Personal, con las preguntas de la herramienta de la Rama. */
function ReviewDialog({ memberId, review, onClose, onSaved }: { memberId: string; review: PlanReview | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [date, setDate] = useState(review?.date ?? todayIso());
  const [answers, setAnswers] = useState<PlanReviewAnswers>(review?.answers ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!Object.values(answers).some((x) => x?.trim())) return setError('Respondé al menos una pregunta');
    setBusy(true);
    setError(null);
    try {
      if (review) await api.put(`/rovers/reviews/${review.id}`, { date, answers });
      else await api.post(`/rovers/plans/${memberId}/reviews`, { date, answers });
      onSaved();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title={review ? 'Editar el alto en el camino' : 'Hacer un alto en el camino'}
      onClose={onClose}
      footer={
        <>
          {review ? (
            <ConfirmButton
              variant="ghost"
              title="Borrar la evaluación"
              message="Se borra esta evaluación con sus respuestas. No se puede deshacer."
              confirmLabel="Borrar"
              onConfirm={async () => {
                await api.del(`/rovers/reviews/${review.id}`);
                onSaved();
              }}
            >
              <Trash2 /> Borrar
            </ConfirmButton>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Mirá cómo te fue con tus metas y tus acciones. Después compartilo con tu Comunidad y tus educadores, y corregí tu Plan con lo que salga.
      </p>
      <div className="form-grid">
        <Field label="Fecha" error={error ?? undefined}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {PLAN_REVIEW_QUESTIONS.map((x) => (
          <Field key={x.key} label={x.label} full>
            <Textarea rows={2} value={answers[x.key] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [x.key]: e.target.value }))} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

function GoalDialog({ memberId, goal, plan, onClose, onSaved }: { memberId: string; goal: Goal | null; plan: PlanData; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [areaId, setAreaId] = useState(goal?.areaId ?? '');
  const [competencyId, setCompetencyId] = useState(goal?.competencyId ?? '');
  const [actions, setActions] = useState<RoverGoalAction[]>(goal?.actions ?? []);
  const [newAction, setNewAction] = useState('');
  const [resources, setResources] = useState(goal?.resources ?? '');
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? '');
  const [status, setStatus] = useState<GoalStatus>((goal?.status as GoalStatus) ?? 'en_curso');
  const [reflection, setReflection] = useState(goal?.reflection ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comps = plan.competencies.filter((c) => !areaId || c.areaId === areaId);

  const addAction = () => {
    const t = newAction.trim();
    if (!t) return;
    setActions((a) => [...a, { text: t, done: false }]);
    setNewAction('');
  };
  const save = async () => {
    if (!title.trim()) return setError('Escribí la meta');
    setBusy(true);
    setError(null);
    // Si quedó una acción escrita sin agregar, se suma igual
    const pending = newAction.trim();
    const body = { title, areaId, competencyId, actions: pending ? [...actions, { text: pending, done: false }] : actions, resources, dueDate, status, reflection };
    try {
      if (goal) await api.put(`/rovers/goals/${goal.id}`, body);
      else await api.post(`/rovers/plans/${memberId}/goals`, body);
      onSaved();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={goal ? 'Editar la meta' : 'Nueva meta'}
      onClose={onClose}
      footer={
        <>
          {goal ? (
            <ConfirmButton
              variant="ghost"
              title="Borrar la meta"
              message="Se borra la meta con sus acciones. Si la dejaste, mejor marcala como «La dejé»: así queda en tu historia."
              confirmLabel="Borrar"
              onConfirm={async () => {
                await api.del(`/rovers/goals/${goal.id}`);
                onSaved();
              }}
            >
              <Trash2 /> Borrar
            </ConfirmButton>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="¿Qué querés lograr?" required full error={error ?? undefined}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: terminar el primer año de la carrera" autoFocus={!goal} />
        </Field>
        <Field label="Acciones" full hint="Los pasos concretos. Los vas tildando a medida que los hacés.">
          <ul className="goal-actions edit">
            {actions.map((a, i) => (
              <li key={i}>
                <label className={`checkbox ${a.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={a.done} onChange={() => setActions((list) => list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
                  <span>{a.text}</span>
                </label>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar la acción" onClick={() => setActions((list) => list.filter((_, j) => j !== i))}>
                  <X />
                </button>
              </li>
            ))}
          </ul>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <Input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Agregar una acción…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAction();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addAction} disabled={!newAction.trim()}>
              <Plus /> Agregar
            </Button>
          </div>
        </Field>
        <Field label="Plazo" hint="Una meta no debería pasar de un año.">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
            {GOAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {GOAL_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recursos" full hint="Qué o a quién necesitás para lograrla.">
          <Textarea rows={2} value={resources} onChange={(e) => setResources(e.target.value)} />
        </Field>
        <Field label="Ruta (opcional)" hint="El área de crecimiento a la que apunta.">
          <Select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              setCompetencyId('');
            }}
          >
            <option value="">Sin ruta</option>
            {plan.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Competencia (opcional)" hint="Podés tomar una de la Guía o dejar tu meta propia.">
          <Select value={competencyId} onChange={(e) => setCompetencyId(e.target.value)}>
            <option value="">Meta propia</option>
            {comps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.length > 90 ? `${c.name.slice(0, 90)}…` : c.name}
              </option>
            ))}
          </Select>
        </Field>
        {status !== 'en_curso' ? (
          <Field label="¿Cómo te fue?" full hint="Tu autoevaluación: qué lograste, qué te costó, qué aprendiste.">
            <Textarea rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} />
          </Field>
        ) : null}
      </div>
      {status === 'lograda' ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          <Check size={14} style={{ verticalAlign: '-2px' }} /> ¡Bien ahí! Queda en tus metas cerradas.
        </p>
      ) : null}
    </Modal>
  );
}

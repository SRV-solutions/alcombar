import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Pencil, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, eventBudgetLineSchema, eventTaskSchema, formatDate, formatMoney, round2 } from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea } from '../../components/ui';
import { Money, MovementDialog, MovementsMini, Stat } from '../accounting/common';
import { EVENT_STATUS_TONE, EventDialog } from './EventsPage';
import type { EventBudgetRow, EventDetail, EventTaskRow } from './types';

type Tab = 'resumen' | 'tareas' | 'presupuesto' | 'movimientos' | 'rendicion';

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('resumen');
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['event', id], queryFn: () => api.get<EventDetail>(`/events/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const ev = q.data!;
  const locked = ev.status === 'rendido';
  return (
    <>
      <PageHeader
        title={ev.name}
        crumbs={[{ to: '/eventos', label: 'Eventos' }]}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <Badge tone={EVENT_STATUS_TONE[ev.status]}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
            {EVENT_TYPE_LABELS[ev.type]}
            {ev.date ? ` · ${formatDate(ev.date)}` : ''}
            {ev.place ? ` · ${ev.place}` : ''}
          </span>
        }
        actions={
          <>
            {ev.canEdit && !locked ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {ev.canDelete && !ev.movements.length ? (
              <ConfirmButton
                title="Eliminar evento"
                message={`¿Eliminar «${ev.name}» con sus tareas y presupuesto?`}
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/events/${ev.id}`);
                    toast.ok('Evento eliminado');
                    navigate('/eventos');
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Trash2 /> Eliminar
              </ConfirmButton>
            ) : null}
          </>
        }
      />
      <div className="no-print">
        <Tabs
          tabs={[
            { key: 'resumen', label: 'Resumen' },
            { key: 'tareas', label: `Tareas y compras (${ev.tasks.filter((t) => !t.done).length})` },
            { key: 'presupuesto', label: 'Presupuesto' },
            { key: 'movimientos', label: 'Movimientos' },
            { key: 'rendicion', label: 'Rendición' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'resumen' ? <Summary ev={ev} /> : null}
      {tab === 'tareas' ? <TasksTab ev={ev} refetch={q.refetch} /> : null}
      {tab === 'presupuesto' ? <BudgetTab ev={ev} refetch={q.refetch} /> : null}
      {tab === 'movimientos' ? <MovementsTab ev={ev} /> : null}
      {tab === 'rendicion' ? <RenderTab ev={ev} refetch={q.refetch} /> : null}
      {editing ? <EventDialog event={ev} onClose={() => setEditing(false)} onSaved={() => q.refetch()} /> : null}
    </>
  );
}

function Totals({ ev }: { ev: EventDetail }) {
  const t = ev.totals;
  return (
    <div className="acc-stats">
      <Stat label="Ingresos" value={formatMoney(t.ingresos)} hint={`Previsto ${formatMoney(t.plannedIncome)}`} tone="ok" />
      <Stat label="Gastos" value={formatMoney(t.egresos)} hint={`Previsto ${formatMoney(t.plannedExpense)}`} tone="danger" />
      <Stat label="Resultado" value={formatMoney(t.resultado)} hint={`Previsto ${formatMoney(t.plannedIncome - t.plannedExpense)}`} tone={t.resultado >= 0 ? 'ok' : 'danger'} />
    </div>
  );
}

function Summary({ ev }: { ev: EventDetail }) {
  const pending = ev.tasks.filter((t) => !t.done);
  return (
    <div className="stack">
      <Totals ev={ev} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Datos">
          <dl className="dl">
            <dt>Tipo</dt>
            <dd>{EVENT_TYPE_LABELS[ev.type]}</dd>
            <dt>Fecha</dt>
            <dd>{formatDate(ev.date)}</dd>
            <dt>Lugar</dt>
            <dd>{ev.place ?? '—'}</dd>
            <dt>Responsable</dt>
            <dd>{ev.responsible ? adultName(ev.responsible) : '—'}</dd>
            <dt>Descripción</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{ev.description ?? '—'}</dd>
          </dl>
        </Card>
        <Card title="Pendientes">
          {!pending.length ? (
            <p className="muted" style={{ margin: 0 }}>
              No hay tareas ni compras pendientes.
            </p>
          ) : (
            <ul className="list-plain">
              {pending.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Badge tone={t.kind === 'compra' ? 'gold' : 'info'}>{t.kind === 'compra' ? 'Compra' : 'Tarea'}</Badge> {t.title}
                  <span className="muted">
                    {t.responsible ? ` · ${adultName(t.responsible)}` : ''}
                    {t.dueDate ? ` · ${formatDate(t.dueDate)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------- Tareas y compras ----------------
function TasksTab({ ev, refetch }: { ev: EventDetail; refetch: () => unknown }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<{ kind: 'tarea' | 'compra'; task?: EventTaskRow } | null>(null);
  const toggle = async (t: EventTaskRow) => {
    try {
      await api.put(`/events/tasks/${t.id}`, { kind: t.kind, title: t.title, responsibleAdultId: t.responsibleAdultId, dueDate: t.dueDate, notes: t.notes, done: !t.done });
      await refetch();
    } catch (e) {
      toast.error(e);
    }
  };
  const list = (kind: 'tarea' | 'compra') => {
    const rows = ev.tasks.filter((t) => t.kind === kind);
    return (
      <Card
        title={kind === 'tarea' ? 'Tareas' : 'Compras'}
        actions={
          ev.canEdit ? (
            <Button size="sm" onClick={() => setDialog({ kind })}>
              <Plus /> {kind === 'tarea' ? 'Nueva tarea' : 'Nueva compra'}
            </Button>
          ) : null
        }
        bodyClass="table-wrap"
      >
        {!rows.length ? (
          <Empty>{kind === 'tarea' ? 'Sin tareas.' : 'Sin compras.'}</Empty>
        ) : (
          <table className="table">
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={t.done ? 'voided' : ''}>
                  <td style={{ width: 30 }}>
                    <input type="checkbox" checked={t.done} disabled={!ev.canEdit} onChange={() => toggle(t)} aria-label="Hecho" />
                  </td>
                  <td className="desc">
                    {t.title}
                    {t.notes ? <div className="muted">{t.notes}</div> : null}
                  </td>
                  <td className="muted">{t.responsible ? adultName(t.responsible) : ''}</td>
                  <td className="nowrap">{t.dueDate ? formatDate(t.dueDate) : ''}</td>
                  <td className="num nowrap">
                    {ev.canEdit ? (
                      <>
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setDialog({ kind, task: t })}>
                          <Pencil />
                        </Button>
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          title="Eliminar"
                          message={`¿Eliminar «${t.title}»?`}
                          confirmLabel="Eliminar"
                          onConfirm={async () => {
                            try {
                              await api.del(`/events/tasks/${t.id}`);
                              await refetch();
                            } catch (e) {
                              toast.error(e);
                            }
                          }}
                        >
                          <Trash2 />
                        </ConfirmButton>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    );
  };
  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {list('tarea')}
      {list('compra')}
      {dialog ? <TaskDialog eventId={ev.id} kind={dialog.kind} task={dialog.task} onClose={() => setDialog(null)} onSaved={refetch} /> : null}
    </div>
  );
}

function TaskDialog({ eventId, kind, task, onClose, onSaved }: { eventId: string; kind: 'tarea' | 'compra'; task?: EventTaskRow; onClose: () => void; onSaved: () => unknown }) {
  const toast = useToast();
  const adults = useAdults();
  type F = z.input<typeof eventTaskSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(eventTaskSchema),
    defaultValues: task
      ? { kind: task.kind, title: task.title, responsibleAdultId: task.responsibleAdultId ?? '', dueDate: task.dueDate ?? '', done: task.done, notes: task.notes ?? '' }
      : { kind, title: '', responsibleAdultId: '', dueDate: '', done: false, notes: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (task) await api.put(`/events/tasks/${task.id}`, v);
      else await api.post(`/events/${eventId}/tasks`, v);
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={task ? 'Editar' : kind === 'tarea' ? 'Nueva tarea' : 'Nueva compra'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label={kind === 'tarea' ? 'Tarea' : 'Qué hay que comprar'} required full error={e.title?.message}>
          <Input {...register('title')} invalid={!!e.title} placeholder={kind === 'tarea' ? 'Ej: conseguir equipo de sonido' : 'Ej: 20 kg de leña'} />
        </Field>
        <Field label="Responsable">
          <Select {...register('responsibleAdultId')}>
            <option value="">—</option>
            {adults.data
              ?.filter((a) => a.status !== 'baja' || a.id === task?.responsibleAdultId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {adultName(a)}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Para cuándo">
          <Input type="date" {...register('dueDate')} />
        </Field>
        <Field label="Notas" full>
          <Input {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Presupuesto ----------------
function BudgetTab({ ev, refetch }: { ev: EventDetail; refetch: () => unknown }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<{ line?: EventBudgetRow; kind: 'ingreso' | 'egreso' } | null>(null);
  const section = (kind: 'ingreso' | 'egreso') => {
    const rows = ev.budgetLines.filter((l) => l.kind === kind);
    const total = round2(rows.reduce((s, l) => s + l.planned, 0));
    return (
      <Card
        title={kind === 'ingreso' ? 'Ingresos previstos' : 'Gastos previstos'}
        actions={
          ev.canEdit && ev.status !== 'rendido' ? (
            <Button size="sm" onClick={() => setDialog({ kind })}>
              <Plus /> Agregar
            </Button>
          ) : null
        }
        bodyClass="table-wrap"
      >
        {!rows.length ? (
          <Empty>Sin líneas.</Empty>
        ) : (
          <table className="table">
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>{l.concept}</td>
                  <td className="num">
                    <Money value={l.planned} />
                  </td>
                  <td className="num nowrap">
                    {ev.canEdit && ev.status !== 'rendido' ? (
                      <>
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setDialog({ kind, line: l })}>
                          <Pencil />
                        </Button>
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          title="Eliminar línea"
                          message={`¿Eliminar «${l.concept}»?`}
                          confirmLabel="Eliminar"
                          onConfirm={async () => {
                            try {
                              await api.del(`/events/budget/${l.id}`);
                              await refetch();
                            } catch (e) {
                              toast.error(e);
                            }
                          }}
                        >
                          <Trash2 />
                        </ConfirmButton>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <Money value={total} strong />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </Card>
    );
  };
  return (
    <div className="stack">
      <Totals ev={ev} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {section('ingreso')}
        {section('egreso')}
      </div>
      {dialog ? <BudgetLineDialog eventId={ev.id} kind={dialog.kind} line={dialog.line} onClose={() => setDialog(null)} onSaved={refetch} /> : null}
    </div>
  );
}

function BudgetLineDialog({ eventId, kind, line, onClose, onSaved }: { eventId: string; kind: 'ingreso' | 'egreso'; line?: EventBudgetRow; onClose: () => void; onSaved: () => unknown }) {
  const toast = useToast();
  type F = z.input<typeof eventBudgetLineSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(eventBudgetLineSchema),
    defaultValues: line ? { concept: line.concept, kind: line.kind, planned: line.planned } : { concept: '', kind, planned: '' as unknown as number },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (line) await api.put(`/events/budget/${line.id}`, v);
      else await api.post(`/events/${eventId}/budget`, v);
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={line ? 'Editar línea' : kind === 'ingreso' ? 'Ingreso previsto' : 'Gasto previsto'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Concepto" required full error={e.concept?.message}>
          <Input {...register('concept')} invalid={!!e.concept} placeholder={kind === 'ingreso' ? 'Ej: venta de entradas' : 'Ej: comida para el buffet'} />
        </Field>
        <Field label="Monto previsto" required error={e.planned?.message}>
          <Input type="number" step="0.01" min="0" {...register('planned')} invalid={!!e.planned} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Movimientos ----------------
function MovementsTab({ ev }: { ev: EventDetail }) {
  const [dialog, setDialog] = useState<'ingreso' | 'egreso' | null>(null);
  if (!ev.canRecord && !ev.movements.length)
    return (
      <Card>
        <p className="muted" style={{ margin: 0 }}>
          Los ingresos y gastos del evento los carga Tesorería en Contabilidad, vinculándolos a este evento.
        </p>
      </Card>
    );
  return (
    <div className="stack">
      <Totals ev={ev} />
      {ev.canRecord && ev.status !== 'rendido' ? (
        <div className="row">
          <Button onClick={() => setDialog('ingreso')}>
            <Plus /> Registrar ingreso
          </Button>
          <Button onClick={() => setDialog('egreso')}>
            <Plus /> Registrar gasto
          </Button>
        </div>
      ) : null}
      <Card title="Movimientos vinculados">
        <MovementsMini rows={ev.movements} />
      </Card>
      {dialog ? <MovementDialog defaults={{ kind: dialog, eventId: ev.id }} lockLink={{ label: `Vinculado al evento «${ev.name}»` }} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

// ---------------- Rendición ----------------
function RenderTab({ ev, refetch }: { ev: EventDetail; refetch: () => unknown }) {
  const toast = useToast();
  const [resultNotes, setResultNotes] = useState(ev.resultNotes ?? '');
  const [evaluation, setEvaluation] = useState(ev.evaluation ?? '');
  useEffect(() => {
    setResultNotes(ev.resultNotes ?? '');
    setEvaluation(ev.evaluation ?? '');
  }, [ev.resultNotes, ev.evaluation]);
  // Lo real agrupado por categoría
  const byCat = new Map<string, { name: string; kind: 'ingreso' | 'egreso'; total: number }>();
  for (const m of ev.movements) {
    // Una anulación resta de la naturaleza original (anular un gasto baja los gastos)
    const kind: 'ingreso' | 'egreso' = m.reversesId ? (m.kind === 'ingreso' ? 'egreso' : 'ingreso') : m.kind;
    const name = m.category?.name ?? 'Sin categoría';
    const cur = byCat.get(`${kind}|${name}`) ?? { name, kind, total: 0 };
    cur.total = round2(cur.total + (m.reversesId ? -m.amount : m.amount));
    byCat.set(`${kind}|${name}`, cur);
  }
  const real = [...byCat.values()]
    .filter((r) => Math.abs(r.total) > 0.001)
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'ingreso' ? -1 : 1));
  return (
    <div className="stack">
      <div className="row between no-print">
        <span className="muted">Resumen para presentar al Consejo de Grupo. Se puede imprimir o guardar como PDF.</span>
        <div className="row">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer /> Imprimir rendición
          </Button>
          {ev.canApprove && ev.status !== 'rendido' ? (
            <ConfirmButton
              variant="primary"
              title="Rendir evento"
              message="El evento queda cerrado como «Rendido» con el resultado actual. Se puede reabrir si hace falta."
              confirmLabel="Rendir"
              onConfirm={async () => {
                try {
                  await api.post(`/events/${ev.id}/render`, { resultNotes, evaluation });
                  toast.ok('Evento rendido');
                  await refetch();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              <CheckCircle2 /> Rendir evento
            </ConfirmButton>
          ) : null}
          {ev.canApprove && ev.status === 'rendido' ? (
            <ConfirmButton
              variant="secondary"
              title="Reabrir evento"
              message="El evento vuelve a «En curso»."
              confirmLabel="Reabrir"
              onConfirm={async () => {
                try {
                  await api.post(`/events/${ev.id}/reopen`, {});
                  await refetch();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              <RotateCcw /> Reabrir
            </ConfirmButton>
          ) : null}
        </div>
      </div>
      <div className="receipt" style={{ maxWidth: 820 }} id="event-render">
        <div className="receipt-head">
          <div>
            <div className="group">Grupo Scout 155 Divina Providencia</div>
            <div className="muted">Rendición de evento</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="number">{ev.name}</div>
            <div>
              {EVENT_TYPE_LABELS[ev.type]} · {formatDate(ev.date)}
            </div>
          </div>
        </div>
        <div className="grid grid-2">
          <div>
            <h3 style={{ marginTop: 0 }}>Presupuesto</h3>
            <table className="table">
              <tbody>
                {ev.budgetLines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.concept}</td>
                    <td className="num">
                      <Money value={l.planned} kind={l.kind} />
                    </td>
                  </tr>
                ))}
                {!ev.budgetLines.length ? (
                  <tr>
                    <td className="muted">Sin presupuesto cargado</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Real (contabilidad)</h3>
            <table className="table">
              <tbody>
                {real.map((r) => (
                  <tr key={`${r.kind}${r.name}`}>
                    <td>{r.name}</td>
                    <td className="num">
                      <Money value={r.total} kind={r.kind} />
                    </td>
                  </tr>
                ))}
                {!real.length ? (
                  <tr>
                    <td className="muted">Sin movimientos</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="receipt-total">
          <span>Resultado</span>
          <span>
            {formatMoney(ev.totals.resultado)} <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>(previsto {formatMoney(ev.totals.plannedIncome - ev.totals.plannedExpense)})</span>
          </span>
        </div>
        <div className="form-grid mt">
          <Field label="Resultado, sobrantes y pendientes" full>
            {ev.canApprove && ev.status !== 'rendido' ? (
              <Textarea rows={3} value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} placeholder="Ej: sobraron 10 kg de leña, quedan en el depósito" />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{ev.resultNotes ?? '—'}</div>
            )}
          </Field>
          <Field label="Evaluación (qué salió bien, qué mejorar)" full>
            {ev.canApprove && ev.status !== 'rendido' ? (
              <Textarea rows={3} value={evaluation} onChange={(e) => setEvaluation(e.target.value)} />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{ev.evaluation ?? '—'}</div>
            )}
          </Field>
        </div>
        {ev.renderedAt ? <p className="muted">Rendido el {formatDate(ev.renderedAt.slice(0, 10))}.</p> : null}
      </div>
    </div>
  );
}

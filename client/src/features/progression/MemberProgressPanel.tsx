import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, CheckSquare, Flag, NotebookPen, Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  challengeTerms,
  COMPETENCIES_PER_STAGE,
  COMPETENCY_STATUSES,
  COMPETENCY_STATUS_LABELS,
  formatDate,
  isComingSoon,
  PROGRESSION_TOOL,
  TOOL_PAYMENTS,
  TOOL_PAYMENT_LABELS,
  TOOL_STATUSES,
  TOOL_STATUS_LABELS,
  type CompetencyStatus,
  type ToolPayment,
  type ToolStatus,
} from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Input, Loading, Modal, Select, type Tone } from '../../components/ui';
import { typeLabel } from '../program/common';
import { AreaBalance } from './BoardPage';
import { CompetencyDialog } from './CompetencyDialog';
import { FormDialog, type FieldDef, type FormValue } from './FormDialog';
import type { MemberCompetencyRow, MemberProgressData } from './types';
import './progression.css';
import { HistoryCard, historyKey } from './HistoryCard';

type Dialog = { title: string; fields: FieldDef[]; initial: Record<string, FormValue>; onSave: (v: Record<string, FormValue>) => Promise<unknown>; intro?: React.ReactNode; wide?: boolean };

const COMP_TONE: Record<CompetencyStatus, Tone> = { elegida: 'neutral', en_proceso: 'info', lograda: 'ok' };
const ROLE_SUGGESTIONS: Record<string, string[]> = {
  lobatos: ['Seisenero/a', 'Subseisenero/a', 'Animador/a de la seisena'],
  castores: ['Responsable de la madriguera', 'Ayudante'],
  default: ['Guía', 'Subguía', 'Secretario/a', 'Tesorero/a', 'Intendente', 'Cocinero/a', 'Enfermero/a', 'Animador/a', 'Responsable de la bitácora'],
};
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Elegir competencias del catálogo de la rama para la etapa actual. */
function ChooseDialog({
  data,
  memberStageId,
  already,
  onClose,
  onDone,
}: {
  data: MemberProgressData;
  memberStageId: string | null;
  already: MemberCompetencyRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const taken = new Set(already.map((c) => c.competencyId));
  const available = data.catalog.competencies.filter((c) => !taken.has(c.id) && (!q || norm(`${c.number ?? ''} ${c.name}`).includes(norm(q))));
  const groups = [...data.catalog.areas.map((a) => ({ id: a.id as string | null, name: a.name })), { id: null, name: 'Sin área' }];
  const total = already.length + ids.length;
  const byArea: Record<string, { chosen: number; achieved: number }> = {};
  for (const c of already) {
    const k = c.competency?.areaId ?? 'sin_area';
    byArea[k] ??= { chosen: 0, achieved: 0 };
    byArea[k].chosen++;
  }
  for (const id of ids) {
    const k = data.catalog.competencies.find((c) => c.id === id)?.areaId ?? 'sin_area';
    byArea[k] ??= { chosen: 0, achieved: 0 };
    byArea[k].chosen++;
  }
  const toggle = (id: string) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ added: number; skipped: number }>(`/progression/members/${data.member.id}/competencies`, { competencyIds: ids, memberStageId });
      toast.ok(`${r.added} competencias agregadas`);
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
      wide
      title={PROGRESSION_TOOL[data.member.branch ?? ''] ? `Elegir competencias · ${PROGRESSION_TOOL[data.member.branch ?? '']}` : 'Elegir competencias'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!ids.length}>
            <CheckSquare /> Agregar {ids.length || ''}
          </Button>
        </>
      }
    >
      {!data.catalog.competencies.length ? (
        <Empty>
          Todavía no hay competencias cargadas para la rama. Se cargan en <Link to="/progresion/esquemas">Progresión → Esquemas y catálogos</Link>.
        </Empty>
      ) : (
        <div className="stack">
          <p style={{ margin: 0 }}>
            El protagonista elige, con su educador, las competencias que va a trabajar en la etapa. Se recomiendan{' '}
            <strong>
              {COMPETENCIES_PER_STAGE.min} a {COMPETENCIES_PER_STAGE.max}
            </strong>
            , repartidas entre las áreas.
          </p>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <AreaBalance areas={data.catalog.areas} byArea={byArea} wide />
            </div>
            <div className={`std ${total >= COMPETENCIES_PER_STAGE.min && total <= COMPETENCIES_PER_STAGE.max ? 'done' : ''}`} style={{ minWidth: 150 }}>
              <div className="label">En la etapa</div>
              <div className="value">
                {total} <small>/ {COMPETENCIES_PER_STAGE.min}-{COMPETENCIES_PER_STAGE.max}</small>
              </div>
            </div>
          </div>
          <Input placeholder="Buscar competencia" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="comp-picker">
            {groups.map((g) => {
              const items = available.filter((c) => (c.areaId ?? null) === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id ?? 'none'}>
                  <div className="area">{g.name}</div>
                  {items.map((c) => (
                    <label key={c.id}>
                      <input type="checkbox" checked={ids.includes(c.id)} onChange={() => toggle(c.id)} />
                      <span>
                        {c.number ? <strong>{c.number}. </strong> : null}
                        {c.name}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
            {!available.length ? <p className="muted" style={{ padding: '8px 12px', margin: 0 }}>No quedan competencias para elegir con ese filtro.</p> : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Todo el seguimiento de un protagonista: se usa en /progresion/:memberId y en la pestaña Progresión de su ficha. */
export function MemberProgressPanel({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [editComp, setEditComp] = useState<MemberCompetencyRow | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const q = useQuery({ queryKey: ['progression-member', memberId], queryFn: () => api.get<MemberProgressData>(`/progression/members/${memberId}`) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['progression-member', memberId] });
    void qc.invalidateQueries({ queryKey: ['progression-board'] });
    void qc.invalidateQueries({ queryKey: historyKey(memberId) });
  };
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.ok(ok);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const d = q.data;
  const current = useMemo(() => (d ? (d.stages.find((s) => !s.endedAt) ?? d.stages[0] ?? null) : null), [d]);
  const currentComps = useMemo(() => (d ? d.competencies.filter((c) => !current || !c.memberStageId || c.memberStageId === current.id) : []), [d, current]);
  const oldComps = useMemo(() => (d ? d.competencies.filter((c) => !currentComps.includes(c)) : []), [d, currentComps]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!d) return null;
  const canEdit = d.canEdit;
  // Rastros, Cartas de Exploración, Diario de Marcha o Plan Personal, según la rama
  const tool = PROGRESSION_TOOL[d.member.branch ?? ''] ?? null;
  const achieved = currentComps.filter((c) => c.status === 'lograda').length;
  const byArea: Record<string, { chosen: number; achieved: number }> = {};
  for (const c of currentComps) {
    const k = c.competency?.areaId ?? 'sin_area';
    byArea[k] ??= { chosen: 0, achieved: 0 };
    byArea[k].chosen++;
    if (c.status === 'lograda') byArea[k].achieved++;
  }
  const stageOptions = [{ value: '', label: 'Elegí la etapa' }, ...(d.scheme?.stages ?? []).map((s) => ({ value: s.id, label: s.name }))];
  const cycleOptions = [{ value: '', label: 'Sin ciclo' }, ...d.catalog.cycles.map((c) => ({ value: c.id, label: c.name }))];
  const del = (title: string, message: string, path: string, ok: string) => (
    <ConfirmButton size="sm" variant="ghost" title={title} message={message} confirmLabel="Eliminar" onConfirm={() => run(() => api.del(path), ok)}>
      <Trash2 />
    </ConfirmButton>
  );
  const editBtn = (onClick: () => void) => (
    <Button variant="ghost" size="sm" className="btn-icon" onClick={onClick} aria-label="Editar" title="Editar">
      <Pencil />
    </Button>
  );

  // ---- diálogos ----
  const stageDialog = (ms?: MemberProgressData['stages'][number]) => {
    const opts = ms && !stageOptions.some((o) => o.value === ms.stageId) ? [...stageOptions, { value: ms.stageId, label: `${ms.stage?.name ?? 'Etapa'} (esquema anterior)` }] : stageOptions;
    setDialog({
      title: ms ? 'Editar etapa' : 'Registrar etapa',
      intro: ms ? undefined : (
        <p className="muted" style={{ margin: 0 }}>
          Si había una etapa abierta, se cierra con la fecha de inicio de la nueva.
        </p>
      ),
      fields: [
        { key: 'stageId', label: 'Etapa', type: 'select', options: opts, required: true, full: true },
        { key: 'startedAt', label: 'Inicio', type: 'date', hint: ms ? undefined : 'Si lo dejás vacío, hoy' },
        { key: 'insigniaAt', label: 'Entrega de insignia', type: 'date' },
        ...(ms ? [{ key: 'endedAt', label: 'Fin', type: 'date' as const }] : []),
        { key: 'notes', label: 'Notas', type: 'textarea' },
      ],
      initial: { stageId: ms?.stageId ?? '', startedAt: ms?.startedAt ?? '', insigniaAt: ms?.insigniaAt ?? '', endedAt: ms?.endedAt ?? '', notes: ms?.notes ?? '' },
      onSave: async (v) => {
        if (ms) await api.put(`/progression/member-stages/${ms.id}`, v);
        else await api.post(`/progression/members/${memberId}/stages`, v);
        toast.ok(ms ? 'Etapa guardada' : 'Etapa registrada');
        refresh();
      },
    });
  };
  const momentsDialog = () =>
    setDialog({
      title: 'Momentos de la progresión',
      fields: [
        { key: 'ambientacionSince', label: 'En ambientación desde', type: 'date', hint: 'Cuando entra a la unidad (antes de la Promesa)' },
        { key: 'transition', label: 'Está en transición (preparando el pase a la rama siguiente)', type: 'checkbox' },
        { key: 'transitionNotes', label: 'Notas de la transición', type: 'textarea' },
        { key: 'notes', label: 'Notas generales del seguimiento', type: 'textarea', rows: 4 },
      ],
      initial: {
        ambientacionSince: d.moments.ambientacionSince ?? '',
        transition: d.moments.transition,
        transitionNotes: d.moments.transitionNotes ?? '',
        notes: d.moments.notes ?? '',
      },
      onSave: async (v) => {
        await api.put(`/progression/members/${memberId}/moments`, v);
        toast.ok('Guardado');
        refresh();
      },
    });
  const toolDialog = () =>
    setDialog({
      title: tool ?? 'Material de progresión',
      fields: [
        {
          key: 'toolStatus',
          label: 'Entrega',
          type: 'select',
          options: [{ value: '', label: 'Sin registrar' }, ...TOOL_STATUSES.map((s) => ({ value: s, label: TOOL_STATUS_LABELS[s] }))],
        },
        { key: 'toolDeliveredAt', label: 'Fecha de entrega', type: 'date' },
        { key: 'toolLost', label: 'La había perdido y se le entregó otra', type: 'checkbox' },
        {
          key: 'toolPayment',
          label: 'Pago',
          type: 'select',
          options: [{ value: '', label: 'Sin registrar' }, ...TOOL_PAYMENTS.map((s) => ({ value: s, label: TOOL_PAYMENT_LABELS[s] }))],
        },
        { key: 'toolNotes', label: 'Notas', type: 'textarea' },
      ],
      initial: {
        toolStatus: d.moments.toolStatus ?? '',
        toolDeliveredAt: d.moments.toolDeliveredAt ?? '',
        toolLost: d.moments.toolLost ?? false,
        toolPayment: d.moments.toolPayment ?? '',
        toolNotes: d.moments.toolNotes ?? '',
      },
      onSave: async (v) => {
        await api.put(`/progression/members/${memberId}/tool`, v);
        toast.ok('Guardado');
        refresh();
      },
    });
  const compDialog = (c: MemberCompetencyRow) => setEditComp(c);
  const roleDialog = (r?: MemberProgressData['roles'][number]) =>
    setDialog({
      title: r ? 'Editar rol' : 'Nuevo rol',
      fields: [
        { key: 'cycleId', label: 'Ciclo de programa', type: 'select', options: cycleOptions },
        { key: 'role', label: 'Rol', required: true, list: [...(ROLE_SUGGESTIONS[d.member.branch ?? ''] ?? []), ...ROLE_SUGGESTIONS.default] },
        { key: 'notes', label: 'Notas', type: 'textarea' },
      ],
      initial: { cycleId: r?.cycleId ?? d.catalog.cycles[0]?.id ?? '', role: r?.role ?? '', notes: r?.notes ?? '' },
      onSave: async (v) => {
        if (r) await api.put(`/progression/member-roles/${r.id}`, v);
        else await api.post(`/progression/members/${memberId}/roles`, v);
        toast.ok('Rol guardado');
        refresh();
      },
    });
  const reviewDialog = (r?: MemberProgressData['reviews'][number]) =>
    setDialog({
      title: r ? 'Editar revisión de fin de ciclo' : 'Nueva revisión de fin de ciclo',
      wide: true,
      fields: [
        { key: 'cycleId', label: 'Ciclo de programa', type: 'select', options: cycleOptions },
        { key: 'date', label: 'Fecha', type: 'date' },
        { key: 'selfReview', label: 'Autoevaluación (lo que dice el protagonista)', type: 'textarea' },
        { key: 'peersReview', label: 'Lo que dicen sus pares', type: 'textarea' },
        { key: 'educatorReview', label: 'Lo que ve el educador', type: 'textarea' },
      ],
      initial: {
        cycleId: r?.cycleId ?? d.catalog.cycles[0]?.id ?? '',
        date: r?.date ?? new Date().toISOString().slice(0, 10),
        selfReview: r?.selfReview ?? '',
        peersReview: r?.peersReview ?? '',
        educatorReview: r?.educatorReview ?? '',
      },
      onSave: async (v) => {
        if (r) await api.put(`/progression/reviews/${r.id}`, v);
        else await api.post(`/progression/members/${memberId}/reviews`, v);
        toast.ok('Revisión guardada');
        refresh();
      },
    });
  const specialtyDialog = () =>
    setDialog({
      title: 'Registrar especialidad',
      fields: [
        {
          key: 'specialtyId',
          label: 'Especialidad',
          type: 'select',
          required: true,
          full: true,
          options: [{ value: '', label: 'Elegí la especialidad' }, ...d.catalog.specialties.map((s) => ({ value: s.id, label: s.name }))],
        },
        { key: 'achievedAt', label: 'Fecha', type: 'date' },
        { key: 'notes', label: 'Notas', type: 'textarea' },
      ],
      initial: { specialtyId: '', achievedAt: new Date().toISOString().slice(0, 10), notes: '' },
      onSave: async (v) => {
        await api.post(`/progression/members/${memberId}/specialties`, v);
        toast.ok('Especialidad registrada');
        refresh();
      },
    });

  const setStatus = (c: MemberCompetencyRow, status: string) =>
    run(() => api.put(`/progression/member-competencies/${c.id}`, { status, achievedAt: status === 'lograda' ? c.achievedAt : '', notes: c.notes }), status === 'lograda' ? '¡Competencia lograda!' : undefined);

  const compRows = (list: MemberCompetencyRow[], editable: boolean) => {
    const groups = [...d.catalog.areas.map((a) => ({ id: a.id as string | null, name: a.name })), { id: null, name: 'Sin área' }];
    return groups.map((g) => {
      const items = list.filter((c) => (c.competency?.areaId ?? null) === g.id);
      if (!items.length) return null;
      return (
        <div key={g.id ?? 'none'}>
          <div className="area-title">{g.name}</div>
          {items.map((c) => (
            <div key={c.id} className="comp-row">
              <div className="name">
                {c.competency?.number ? <strong>{c.competency.number}. </strong> : null}
                {c.competency?.name ?? 'Competencia eliminada'}
                {c.challenges?.length ? (
                  <ul className="challenge-list">
                    {c.challenges.map((x) => (
                      <li key={x.text} className={x.done ? 'done' : ''} title={x.done && x.doneAt ? `Logrado el ${formatDate(x.doneAt)}` : undefined}>
                        {x.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {c.notes || c.achievedAt ? (
                  <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {c.achievedAt ? `Lograda el ${formatDate(c.achievedAt)}` : ''}
                    {c.achievedAt && c.notes ? ' · ' : ''}
                    {c.notes ?? ''}
                  </div>
                ) : null}
              </div>
              {editable ? (
                <Select value={c.status} onChange={(e) => void setStatus(c, e.target.value)} aria-label="Estado de la competencia">
                  {COMPETENCY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {COMPETENCY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge tone={COMP_TONE[c.status as CompetencyStatus] ?? 'neutral'}>{COMPETENCY_STATUS_LABELS[c.status as CompetencyStatus] ?? c.status}</Badge>
              )}
              {editable ? (
                <div className="row-actions">
                  <Button variant="ghost" size="sm" className="btn-icon" onClick={() => compDialog(c)} aria-label={`${challengeTerms(d.member.branch).Many} y seguimiento`} title={`${challengeTerms(d.member.branch).Many} y seguimiento`}>
                    <NotebookPen />
                  </Button>
                  {del('Quitar competencia', `¿Quitar «${c.competency?.name ?? ''}» de su progresión?`, `/progression/member-competencies/${c.id}`, 'Competencia quitada')}
                </div>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div className="member-progress">
      {!d.member.branch ? (
        <div className="alert alert-info mb">Este protagonista no tiene unidad asignada: para elegir etapa y competencias primero hay que asignarle una unidad.</div>
      ) : null}

      <div className="prog-summary">
        <div className="std">
          <div className="label">Etapa actual</div>
          <div className="value">{current && !current.endedAt ? current.stage?.name : <span className="muted">Sin etapa</span>}</div>
          {current?.startedAt && !current.endedAt ? <div className="muted">desde {formatDate(current.startedAt)}</div> : null}
        </div>
        <div className={`std ${current?.insigniaAt && !current.endedAt ? 'done' : ''}`}>
          <div className="label">Insignia</div>
          <div className="value">{current?.insigniaAt && !current.endedAt ? formatDate(current.insigniaAt) : <span className="muted">Pendiente</span>}</div>
        </div>
        <div className="std">
          <div className="label">Competencias de la etapa</div>
          <div className="value">
            {achieved} <small>/ {currentComps.length} logradas</small>
          </div>
          <div className={`meter ${currentComps.length && achieved === currentComps.length ? 'ok' : ''}`}>
            <span style={{ width: `${currentComps.length ? (achieved / currentComps.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="std">
          <div className="label">Promesa</div>
          <div className="value">{d.member.promiseDate ? formatDate(d.member.promiseDate) : <span className="muted">Sin fecha</span>}</div>
          {d.moments.transition ? <Badge tone="warn">En transición</Badge> : null}
        </div>
        {tool ? (
          <div className={`std ${d.moments.toolStatus && d.moments.toolStatus !== 'pendiente' ? 'done' : ''}`}>
            <div className="label">
              {tool}
              {canEdit ? (
                <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={toolDialog}>
                  Editar
                </button>
              ) : null}
            </div>
            <div className="value">
              {d.moments.toolStatus ? (
                <>
                  {TOOL_STATUS_LABELS[d.moments.toolStatus as ToolStatus] ?? d.moments.toolStatus}
                  {d.moments.toolLost ? <small> (la había perdido)</small> : null}
                </>
              ) : (
                <span className="muted">Sin registrar</span>
              )}
            </div>
            {d.moments.toolPayment === 'pendiente' ? (
              <Badge tone="warn">{TOOL_PAYMENT_LABELS.pendiente}</Badge>
            ) : d.moments.toolPayment && d.moments.toolPayment !== 'no_aplica' ? (
              <div className="muted">{TOOL_PAYMENT_LABELS[d.moments.toolPayment as ToolPayment] ?? d.moments.toolPayment}</div>
            ) : null}
            {d.moments.toolNotes ? <div className="muted">{d.moments.toolNotes}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="prog-sections">
        <div className="prog-two">
          <Card
            title="Etapas"
            actions={
              canEdit && d.member.branch && !isComingSoon(d.member.branch) ? (
                <Button size="sm" onClick={() => stageDialog()} disabled={!d.scheme?.stages.length} className="stage-add">
                  <Flag /> Registrar etapa
                </Button>
              ) : null
            }
          >
            {isComingSoon(d.member.branch) ? (
              <p className="muted" style={{ marginTop: 0 }}>
                <strong>Próximamente:</strong> la propuesta de progresión de esta rama todavía no está publicada.
              </p>
            ) : !d.scheme?.stages.length && d.member.branch ? (
              <p className="muted" style={{ marginTop: 0 }}>
                El esquema de esta rama está a definir: todavía no tiene etapas. Se cargan en <Link to="/progresion/esquemas?tab=etapas">Esquemas y catálogos</Link>.
              </p>
            ) : null}
            {!d.stages.length ? (
              <p className="muted" style={{ margin: 0 }}>
                Todavía no tiene etapas registradas.
              </p>
            ) : (
              <ul className="stage-timeline">
                {d.stages.map((s) => (
                  <li key={s.id} className={!s.endedAt ? 'current' : ''}>
                    <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div>
                        <strong>{s.stage?.name ?? 'Etapa'}</strong>{' '}
                        {s.stage?.scheme ? (
                          <span className="muted" style={{ fontSize: '0.8rem' }}>
                            {s.stage.scheme.name} v{s.stage.scheme.version}
                          </span>
                        ) : null}
                        <div className="muted">
                          {formatDate(s.startedAt) || '?'} → {s.endedAt ? formatDate(s.endedAt) : 'en curso'}
                          {s.insigniaAt ? (
                            <>
                              {' · '}
                              <Award size={13} style={{ verticalAlign: '-2px' }} /> insignia {formatDate(s.insigniaAt)}
                            </>
                          ) : null}
                        </div>
                        {s.notes ? <div style={{ whiteSpace: 'pre-wrap' }}>{s.notes}</div> : null}
                      </div>
                      {canEdit ? (
                        <div className="row-actions" style={{ display: 'flex' }}>
                          {editBtn(() => stageDialog(s))}
                          {del('Eliminar etapa', 'Se borra este registro de su historia. Sus competencias quedan sin etapa.', `/progression/member-stages/${s.id}`, 'Etapa eliminada')}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Momentos" actions={canEdit ? <Button variant="ghost" size="sm" onClick={momentsDialog}><Pencil /> Editar</Button> : null}>
            <div className="stack" style={{ gap: 8 }}>
              <div>
                <span className="muted">Ambientación desde:</span> {formatDate(d.moments.ambientacionSince) || '—'}
              </div>
              <div>
                <span className="muted">Promesa:</span> {formatDate(d.member.promiseDate) || '—'} <span className="muted" style={{ fontSize: '0.8rem' }}>(se edita en la ficha del protagonista)</span>
              </div>
              <div>
                <span className="muted">Transición a la rama siguiente:</span> {d.moments.transition ? 'Sí' : 'No'}
                {d.moments.transitionNotes ? <div style={{ whiteSpace: 'pre-wrap' }}>{d.moments.transitionNotes}</div> : null}
              </div>
              {d.moments.notes ? (
                <div>
                  <span className="muted">Notas:</span>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{d.moments.notes}</div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <Card
          title={`Competencias${current && !current.endedAt ? ` · ${current.stage?.name ?? ''}` : ''}${tool ? ` (${tool})` : ''}`}
          actions={
            canEdit && d.member.branch ? (
              <Button size="sm" onClick={() => setChoosing(true)} className="comp-choose">
                <Plus /> Elegir competencias
              </Button>
            ) : null
          }
        >
          {currentComps.length ? (
            <div className="row mb" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px' }}>
                <AreaBalance areas={d.catalog.areas} byArea={byArea} wide />
              </div>
              <div className="muted" style={{ flex: '1 1 220px', fontSize: '0.88rem' }}>
                {currentComps.length < COMPETENCIES_PER_STAGE.min
                  ? `Tiene ${currentComps.length}: se recomiendan ${COMPETENCIES_PER_STAGE.min} a ${COMPETENCIES_PER_STAGE.max} por etapa.`
                  : currentComps.length > COMPETENCIES_PER_STAGE.max
                    ? `Tiene ${currentComps.length}: son más de las ${COMPETENCIES_PER_STAGE.max} recomendadas por etapa.`
                    : `${currentComps.length} competencias: dentro de lo recomendado (${COMPETENCIES_PER_STAGE.min} a ${COMPETENCIES_PER_STAGE.max}).`}{' '}
                {d.catalog.areas.some((a) => !byArea[a.id]) ? 'Hay áreas sin ninguna competencia elegida.' : ''}
              </div>
            </div>
          ) : null}
          {!currentComps.length ? (
            <p className="muted" style={{ margin: 0 }}>
              Todavía no eligió competencias{current && !current.endedAt ? ' para esta etapa' : ''}.
            </p>
          ) : (
            <div className="comp-list">{compRows(currentComps, canEdit)}</div>
          )}
          {oldComps.length ? (
            <div className="mt">
              <Button variant="ghost" size="sm" onClick={() => setShowOld((x) => !x)}>
                {showOld ? 'Ocultar' : 'Ver'} competencias de etapas anteriores ({oldComps.length})
              </Button>
              {showOld ? <div className="comp-list mt">{compRows(oldComps, canEdit)}</div> : null}
            </div>
          ) : null}
        </Card>

        <div className="prog-two">
          <Card title="Roles por ciclo" actions={canEdit ? <Button variant="ghost" size="sm" onClick={() => roleDialog()}><Plus /> Agregar rol</Button> : null}>
            {!d.roles.length ? (
              <p className="muted" style={{ margin: 0 }}>
                Sin roles registrados (guía, subguía, intendente…).
              </p>
            ) : (
              d.roles.map((r) => (
                <div key={r.id} className="item-row">
                  <div className="body">
                    <strong>{r.role}</strong> <span className="muted">{r.cycle?.name ?? 'Sin ciclo'}</span>
                    {r.notes ? <p className="muted">{r.notes}</p> : null}
                  </div>
                  {canEdit ? (
                    <div className="row-actions">
                      {editBtn(() => roleDialog(r))}
                      {del('Eliminar rol', `¿Eliminar el rol «${r.role}»?`, `/progression/member-roles/${r.id}`, 'Rol eliminado')}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </Card>

          <Card title="Revisiones de fin de ciclo" actions={canEdit ? <Button variant="ghost" size="sm" onClick={() => reviewDialog()}><Plus /> Nueva revisión</Button> : null}>
            {!d.reviews.length ? (
              <p className="muted" style={{ margin: 0 }}>
                Al cerrar cada ciclo se registra la autoevaluación, lo que dicen sus pares y la mirada del educador.
              </p>
            ) : (
              d.reviews.map((r) => (
                <div key={r.id} className="item-row">
                  <div className="body">
                    <strong>{r.cycle?.name ?? 'Sin ciclo'}</strong> <span className="muted">{formatDate(r.date)}</span>
                    {r.selfReview ? <p><span className="muted">Autoevaluación:</span> {r.selfReview}</p> : null}
                    {r.peersReview ? <p><span className="muted">Pares:</span> {r.peersReview}</p> : null}
                    {r.educatorReview ? <p><span className="muted">Educador:</span> {r.educatorReview}</p> : null}
                  </div>
                  {canEdit ? (
                    <div className="row-actions">
                      {editBtn(() => reviewDialog(r))}
                      {del('Eliminar revisión', '¿Eliminar esta revisión de fin de ciclo?', `/progression/reviews/${r.id}`, 'Revisión eliminada')}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="prog-two">
          <Card title="Especialidades" actions={canEdit ? <Button variant="ghost" size="sm" onClick={specialtyDialog} disabled={!d.catalog.specialties.length}><Plus /> Registrar especialidad</Button> : null}>
            {!d.catalog.specialties.length && canEdit ? (
              <p className="muted" style={{ marginTop: 0 }}>
                El catálogo de especialidades está vacío. Se carga en <Link to="/progresion/esquemas?tab=especialidades">Esquemas y catálogos</Link>.
              </p>
            ) : null}
            {!d.specialties.length ? (
              <p className="muted" style={{ margin: 0 }}>
                Sin especialidades registradas.
              </p>
            ) : (
              d.specialties.map((s) => (
                <div key={s.id} className="item-row">
                  <div className="body">
                    <strong>{s.specialty?.name ?? 'Especialidad'}</strong> <span className="muted">{formatDate(s.achievedAt)}</span>
                    {s.notes ? <p className="muted">{s.notes}</p> : null}
                  </div>
                  {canEdit ? <div className="row-actions">{del('Quitar especialidad', '¿Quitar esta especialidad de su progresión?', `/progression/member-specialties/${s.id}`, 'Especialidad quitada')}</div> : null}
                </div>
              ))
            )}
          </Card>

          <Card title={`Participación (${d.participation.total})`}>
            {!d.participation.total ? (
              <p className="muted" style={{ margin: 0 }}>
                Se cuentan las actividades realizadas de su unidad en los días en que tiene asistencia «presente» o «tarde».
              </p>
            ) : (
              <>
                <div className="chips mb">
                  {Object.entries(d.participation.byType).map(([t, n]) => (
                    <span key={t} className="chip">
                      {typeLabel(t)}: <strong>{n}</strong>
                    </span>
                  ))}
                </div>
                {d.participation.recent.map((p) => (
                  <div key={p.id} className="item-row">
                    <div className="body">
                      <Link to={`/programa/fichas/${p.id}`}>{p.name}</Link> <span className="muted">· {typeLabel(p.type)}</span>
                    </div>
                    <span className="muted nowrap">{formatDate(p.date)}</span>
                  </div>
                ))}
              </>
            )}
          </Card>
        </div>
      </div>

      <div className="mt">
        <HistoryCard memberId={memberId} canEdit={canEdit} />
      </div>

      {dialog ? <FormDialog key={dialog.title} {...dialog} onClose={() => setDialog(null)} /> : null}
      {editComp ? <CompetencyDialog key={editComp.id} row={editComp} branch={d.member.branch} onClose={() => setEditComp(null)} onSaved={refresh} /> : null}
      {choosing ? (
        <ChooseDialog data={d} memberStageId={current && !current.endedAt ? current.id : null} already={currentComps} onClose={() => setChoosing(false)} onDone={refresh} />
      ) : null}
      {!canEdit ? (
        <p className="muted mt" style={{ fontSize: '0.85rem' }}>
          <Users size={13} style={{ verticalAlign: '-2px' }} /> Solo lectura: la progresión la cargan los educadores de la unidad.
        </p>
      ) : null}
    </div>
  );
}

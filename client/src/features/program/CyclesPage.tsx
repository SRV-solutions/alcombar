import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import { CYCLE_PHASES, CYCLE_PHASE_LABELS, cycleSchema, formatDate, type CyclePhase } from '@shared';
import { api, ApiError, errorMessage, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { SheetLine, UnitSelect, useProgramUnit } from './common';
import type { Cycle, CycleDetail } from './types';

function PhaseSteps({ phase }: { phase: string }) {
  const i = CYCLE_PHASES.indexOf(phase as CyclePhase);
  return (
    <div className="status-steps" aria-label="Fase del ciclo">
      {CYCLE_PHASES.map((p, k) => (
        <span key={p} className={k < i ? 'done' : k === i ? 'now' : ''}>
          {CYCLE_PHASE_LABELS[p]}
        </span>
      ))}
    </div>
  );
}

interface CycleForm {
  name: string;
  startDate: string;
  endDate: string;
  phase: string;
  diagnosis: string;
  purposes: string;
  evaluation: string;
}

/** Alta y edición de un ciclo de programa. */
function CycleDialog({ unitId, cycle, onClose, onSaved }: { unitId: string; cycle?: Cycle; onClose: () => void; onSaved: (id: string) => void }) {
  const toast = useToast();
  const [v, setV] = useState<CycleForm>({
    name: cycle?.name ?? '',
    startDate: cycle?.startDate ?? '',
    endDate: cycle?.endDate ?? '',
    phase: cycle?.phase ?? 'revisar',
    diagnosis: cycle?.diagnosis ?? '',
    purposes: cycle?.purposes ?? '',
    evaluation: cycle?.evaluation ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof CycleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const save = async () => {
    const payload = { ...v, unitId };
    const check = cycleSchema.safeParse(payload);
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setBusy(true);
    try {
      const r = cycle ? await api.put<Cycle>(`/program/cycles/${cycle.id}`, payload) : await api.post<Cycle>('/program/cycles', payload);
      toast.ok(cycle ? 'Ciclo guardado' : 'Ciclo creado');
      onSaved(r.id);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(e.details);
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title={cycle ? 'Editar ciclo de programa' : 'Nuevo ciclo de programa'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nombre" required error={errors.name} full>
          <Input value={v.name} onChange={set('name')} placeholder="Ej: Ciclo 2 · agosto a noviembre" autoFocus />
        </Field>
        <Field label="Inicio" error={errors.startDate}>
          <Input type="date" value={v.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Fin" error={errors.endDate} hint="La guía sugiere ciclos de 3 a 4 meses (2 o 3 por año)">
          <Input type="date" value={v.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Fase actual">
          <Select value={v.phase} onChange={set('phase')}>
            {CYCLE_PHASES.map((p) => (
              <option key={p} value={p}>
                {CYCLE_PHASE_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Diagnóstico" full hint="Cómo está la unidad: qué necesitan los chicos y qué quieren hacer">
          <Textarea rows={4} value={v.diagnosis} onChange={set('diagnosis')} />
        </Field>
        <Field label="Propósitos del ciclo" full>
          <Textarea rows={3} value={v.purposes} onChange={set('purposes')} />
        </Field>
        <Field label="Evaluación del ciclo" full hint="Al terminar el ciclo">
          <Textarea rows={3} value={v.evaluation} onChange={set('evaluation')} />
        </Field>
      </div>
    </Modal>
  );
}

/** Programa → Ciclos de programa de una unidad. */
export function CyclesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const { unitId, setUnitId, options, loading } = useProgramUnit('view');
  const [creating, setCreating] = useState(false);
  const list = useQuery({ queryKey: ['program-cycles', unitId], queryFn: () => api.get<Cycle[]>(`/program/cycles${qs({ unitId })}`), enabled: !!unitId });
  const canCreate = !!unitId && can('activities', 'create', unitId);
  if (loading) return <Loading />;
  if (!options.length) return <Empty>No tenés unidades para ver ciclos.</Empty>;
  return (
    <>
      <PageHeader
        title="Ciclos de programa"
        sub="Cada unidad hace 2 o 3 ciclos por año, con cuatro fases: Revisar, Elegir, Organizar y Realizar."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nuevo ciclo
            </Button>
          ) : null
        }
      />
      <div className="toolbar">
        <UnitSelect value={unitId} onChange={setUnitId} options={options} />
      </div>
      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !list.data?.length ? (
          <Empty icon={<CalendarRange />}>Todavía no hay ciclos en esta unidad.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Fechas</th>
                <th>Fase</th>
                <th className="num">Fichas</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/programa/ciclos/${c.id}`)}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="nowrap">
                    {formatDate(c.startDate) || '?'} → {formatDate(c.endDate) || '?'}
                  </td>
                  <td>
                    <Badge tone="bordo">{CYCLE_PHASE_LABELS[c.phase as CyclePhase] ?? c.phase}</Badge>
                  </td>
                  <td className="num">
                    {c.doneCount ?? 0}/{c.sheetCount ?? 0} realizadas
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating ? (
        <CycleDialog
          unitId={unitId}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            void qc.invalidateQueries({ queryKey: ['program-cycles'] });
            navigate(`/programa/ciclos/${id}`);
          }}
        />
      ) : null}
    </>
  );
}

/** Ciclo de programa: diagnóstico, propósitos, fichas (calendario) y revisiones de fin de ciclo. */
export function CycleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['program-cycle', id], queryFn: () => api.get<CycleDetail>(`/program/cycles/${id}`) });
  useEffect(() => setEditing(false), [id]);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const c = q.data!;
  const text = (t: string | null) => (t ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{t}</p> : <p className="muted" style={{ margin: 0 }}>Sin cargar.</p>);
  return (
    <>
      <PageHeader
        crumbs={[{ to: `/programa/ciclos?unitId=${c.unitId}`, label: 'Ciclos de programa' }]}
        title={c.name}
        sub={
          <span className="stack" style={{ gap: 4 }}>
            <span>
              {c.unit.name} · {formatDate(c.startDate) || '?'} → {formatDate(c.endDate) || '?'}
            </span>
            <PhaseSteps phase={c.phase} />
          </span>
        }
        actions={
          <>
            {c.canCreateSheets ? (
              <LinkButton to={`/programa/fichas/nueva${qs({ unitId: c.unitId, cycleId: c.id })}`}>
                <Plus /> Nueva ficha en este ciclo
              </LinkButton>
            ) : null}
            {c.canEdit ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Editar ciclo
              </Button>
            ) : null}
            {c.canDelete ? (
              <ConfirmButton
                title="Eliminar ciclo"
                message="Las fichas del ciclo no se borran: quedan sin ciclo."
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/program/cycles/${c.id}`);
                    toast.ok('Ciclo eliminado');
                    await qc.invalidateQueries({ queryKey: ['program-cycles'] });
                    navigate(`/programa/ciclos?unitId=${c.unitId}`);
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Trash2 />
              </ConfirmButton>
            ) : null}
          </>
        }
      />
      <div className="grid grid-3 mb" style={{ alignItems: 'start' }}>
        <Card title="Diagnóstico">{text(c.diagnosis)}</Card>
        <Card title="Propósitos">{text(c.purposes)}</Card>
        <Card title="Evaluación">{text(c.evaluation)}</Card>
      </div>
      <Card title={`Actividades del ciclo (${c.sheets.length})`} bodyClass="">
        {!c.sheets.length ? (
          <div className="card-body">
            <Empty>Todavía no hay fichas en este ciclo.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ficha</th>
                </tr>
              </thead>
              <tbody>
                {c.sheets.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/programa/fichas/${s.id}`)}>
                    <td className="nowrap">{formatDate(s.date) || <span className="muted">Sin fecha</span>}</td>
                    <td>
                      <SheetLine s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="mt">
        <Card title={`Revisiones de fin de ciclo (${c.reviews.length})`}>
          {!c.reviews.length ? (
            <p className="muted" style={{ margin: 0 }}>
              Las revisiones se cargan desde la progresión de cada protagonista (pestaña Progresión de su ficha).
            </p>
          ) : (
            <ul className="list-plain">
              {c.reviews.map((r) => (
                <li key={r.id}>
                  <Link to={`/progresion/${r.member.id}`}>
                    <strong>
                      {r.member.lastName}, {r.member.firstName}
                    </strong>
                  </Link>{' '}
                  <span className="muted">{formatDate(r.date)}</span>
                  <div className="muted">
                    {[r.selfReview && `Autoevaluación: ${r.selfReview}`, r.peersReview && `Pares: ${r.peersReview}`, r.educatorReview && `Educador: ${r.educatorReview}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {editing ? <CycleDialog unitId={c.unitId} cycle={c} onClose={() => setEditing(false)} onSaved={() => void qc.invalidateQueries({ queryKey: ['program-cycle', id] })} /> : null}
    </>
  );
}

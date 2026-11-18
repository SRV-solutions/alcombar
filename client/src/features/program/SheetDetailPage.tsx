import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Copy, Download, Pencil, Send, Trash2, Undo2 } from 'lucide-react';
import { BRANCH_INFO, formatDate, todayIso, type Branch } from '@shared';
import { LinkedLoansCard } from '../inventory/LinkedLoans';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { SheetStatusBadge, SheetView, StatusSteps } from './common';
import type { Sheet } from './types';

/** Duplicar una ficha en otra unidad (también desde el banco: "Usar en mi unidad"). */
export function DuplicateDialog({ sheet, onClose }: { sheet: { id: string; name: string; unit: { branch: string } }; onClose: () => void }) {
  const { unitsWith } = useAuth();
  const units = useUnits();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const allowed = unitsWith('activities', 'create');
  const options = (units.data ?? []).filter((u) => u.active && (allowed === 'all' || allowed.includes(u.id)));
  const [unitId, setUnitId] = useState(options.length === 1 ? options[0].id : '');
  const [busy, setBusy] = useState(false);
  const target = options.find((u) => u.id === unitId);
  const otherBranch = !!target && target.branch !== sheet.unit.branch;
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ id: string; code: string }>(`/program/sheets/${sheet.id}/duplicate`, { unitId });
      toast.ok(`Copia ${r.code} creada en borrador`);
      await qc.invalidateQueries({ queryKey: ['program-sheets'] });
      onClose();
      navigate(`/programa/fichas/${r.id}/editar`);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Usar esta ficha en una unidad"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!unitId}>
            <Copy /> Duplicar
          </Button>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0 }}>
          Se crea una copia de <strong>{sheet.name}</strong> en borrador, sin fecha ni responsable, para adaptarla.
        </p>
        {!options.length ? (
          <div className="alert alert-warn">No tenés permiso para crear fichas en ninguna unidad.</div>
        ) : (
          <Field label="¿En qué unidad?" required>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Elegí la unidad</option>
              {options.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {otherBranch ? (
          <div className="alert alert-info">
            Es otra rama ({BRANCH_INFO[target!.branch as Branch]?.label}): se adaptan el rango de edad y el área, y las competencias no se copian (cada rama tiene las
            suyas). Elegilas al editar la copia.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function EvaluationDialog({ sheet, onClose, onDone }: { sheet: Sheet; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [worked, setWorked] = useState(sheet.evalWorked ?? '');
  const [change, setChange] = useState(sheet.evalChange ?? '');
  const [attendance, setAttendance] = useState(sheet.evalAttendance?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/program/sheets/${sheet.id}/evaluation`, { worked, change, attendance });
      toast.ok('Evaluación guardada');
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
      title="Evaluación posterior"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Guardar evaluación
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="¿Qué funcionó?">
          <Textarea rows={3} value={worked} onChange={(e) => setWorked(e.target.value)} />
        </Field>
        <Field label="¿Qué cambiarías?">
          <Textarea rows={3} value={change} onChange={(e) => setChange(e.target.value)} />
        </Field>
        <Field label="Asistencia (cantidad de protagonistas)">
          <Input type="number" min={0} value={attendance} onChange={(e) => setAttendance(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ReturnDialog({ sheet, onClose, onDone }: { sheet: Sheet; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/program/sheets/${sheet.id}/status`, { action: 'devolver', comment });
      toast.ok('Ficha devuelta a borrador');
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
      title="Devolver la ficha"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            <Undo2 /> Devolver
          </Button>
        </>
      }
    >
      <Field label="¿Qué hay que corregir?" hint="Lo ve quien cargó la ficha">
        <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

/** Ficha de actividad: ver, aprobar, realizar, evaluar, duplicar, imprimir. */
export function SheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { unitsWith } = useAuth();
  const [dialog, setDialog] = useState<'duplicate' | 'evaluate' | 'return' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['program-sheet', id], queryFn: () => api.get<Sheet>(`/program/sheets/${id}`) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['program-sheet', id] });
    void qc.invalidateQueries({ queryKey: ['program-sheets'] });
  };
  const act = async (action: 'enviar' | 'aprobar' | 'realizada', okText: string) => {
    setBusy(action);
    try {
      await api.post(`/program/sheets/${id}/status`, { action });
      toast.ok(okText);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const s = q.data!;
  const creatable = unitsWith('activities', 'create');
  const canDuplicate = creatable === 'all' || creatable.length > 0;

  return (
    <>
      <PageHeader
        crumbs={[{ to: `/programa?unitId=${s.unitId}`, label: 'Fichas de actividad' }]}
        title={s.name}
        sub={
          <span className="stack" style={{ gap: 4 }}>
            <span className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontFamily: 'ui-monospace, monospace' }}>
                {s.code}
              </span>
              <SheetStatusBadge status={s.status} />
            </span>
            <StatusSteps status={s.status} />
          </span>
        }
        actions={
          <>
            {s.canEdit && s.status === 'borrador' ? (
              <Button variant="secondary" loading={busy === 'enviar'} onClick={() => act('enviar', 'Enviada a revisión')}>
                <Send /> Enviar a revisión
              </Button>
            ) : null}
            {s.canApprove && (s.status === 'borrador' || s.status === 'en_revision') ? (
              <Button loading={busy === 'aprobar'} onClick={() => act('aprobar', 'Ficha aprobada')}>
                <CheckCircle2 /> Aprobar
              </Button>
            ) : null}
            {s.canApprove && (s.status === 'en_revision' || s.status === 'aprobada') ? (
              <Button variant="secondary" onClick={() => setDialog('return')}>
                <Undo2 /> Devolver
              </Button>
            ) : null}
            {s.canEdit && s.status === 'aprobada' ? (
              <Button loading={busy === 'realizada'} onClick={() => act('realizada', 'Marcada como realizada')}>
                <CheckCircle2 /> Marcar realizada
              </Button>
            ) : null}
            {s.canEdit && (s.status === 'realizada' || s.status === 'evaluada') ? (
              <Button variant={s.status === 'realizada' ? 'primary' : 'secondary'} onClick={() => setDialog('evaluate')}>
                <ClipboardCheck /> {s.status === 'evaluada' ? 'Editar evaluación' : 'Evaluar'}
              </Button>
            ) : null}
            {s.canEdit ? (
              <LinkButton to={`/programa/fichas/${s.id}/editar`} variant="secondary">
                <Pencil /> Editar
              </LinkButton>
            ) : null}
            {canDuplicate ? (
              <Button variant="secondary" onClick={() => setDialog('duplicate')}>
                <Copy /> Duplicar
              </Button>
            ) : null}
            <LinkButton to={`/programa/fichas/${s.id}/imprimir?descargar=1`} variant="secondary">
              <Download /> Descargar PDF
            </LinkButton>
            {s.canDelete ? (
              <ConfirmButton
                title="Eliminar ficha"
                message={`¿Eliminar la ficha ${s.code} «${s.name}»?`}
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/program/sheets/${s.id}`);
                    toast.ok('Ficha eliminada');
                    await qc.invalidateQueries({ queryKey: ['program-sheets'] });
                    navigate(`/programa?unitId=${s.unitId}`);
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
      {s.reviewNotes && s.status === 'borrador' ? (
        <div className="alert alert-warn mb">
          <strong>Devuelta para corregir:</strong> {s.reviewNotes}
        </div>
      ) : null}
      {s.approvedAt && s.approvedBy && ['aprobada', 'realizada', 'evaluada'].includes(s.status) ? (
        <p className="muted" style={{ marginTop: -8 }}>
          Aprobada por {s.approvedBy.name} el {new Date(s.approvedAt).toLocaleDateString('es-AR')}
          {s.reviewNotes ? ` · ${s.reviewNotes}` : ''}
        </p>
      ) : null}
      {s.schedule?.length ? (
        <div className="alert alert-info mb">
          <strong>En el cronograma:</strong>{' '}
          {s.schedule.map((x, i) => (
            <span key={i}>
              {i ? ' · ' : ''}
              {x.camp ? (
                <Link to={`/campamentos/${x.camp.id}`}>{x.camp.name}</Link>
              ) : (
                <Link to={`/programa/sabado?unitId=${x.unitId}&date=${x.date}`}>Programa del {formatDate(x.date)}</Link>
              )}
              {x.camp ? ` (${formatDate(x.date)}${x.time ? ` ${x.time}` : ''})` : x.time ? ` ${x.time}` : ''}
            </span>
          ))}
        </div>
      ) : null}
      <Card>
        <SheetView sheet={s} />
      </Card>
      <div className="mt">
        <LinkedLoansCard
          link={{ activitySheetId: s.id }}
          defaults={{ unitId: s.unitId, activitySheetId: s.id, purpose: s.name, ...(s.date && s.date >= todayIso() ? { outDate: s.date, dueDate: s.date } : {}) }}
        />
      </div>

      {dialog === 'duplicate' ? <DuplicateDialog sheet={s} onClose={() => setDialog(null)} /> : null}
      {dialog === 'evaluate' ? <EvaluationDialog sheet={s} onClose={() => setDialog(null)} onDone={refresh} /> : null}
      {dialog === 'return' ? <ReturnDialog sheet={s} onClose={() => setDialog(null)} onDone={refresh} /> : null}
    </>
  );
}

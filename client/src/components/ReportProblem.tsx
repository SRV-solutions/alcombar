/**
 * "Reportar un problema": cualquiera con sesión avisa de un error de la plataforma, una sugerencia o una consulta.
 * Va con la pantalla en la que estaba y los últimos errores del navegador. Por ahora, solo texto.
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bug } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS, type ReportCategory, type ReportStatus } from '@shared';
import { api } from '../lib/api';
import { recentClientErrors } from '../lib/clientErrors';
import { useToast } from '../lib/toast';
import { Badge, Button, Empty, Field, Loading, Modal, Tabs, Textarea, type Tone } from './ui';

export interface MyReport {
  id: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  response: string | null;
  pageUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const REPORT_STATUS_TONES: Record<ReportStatus, Tone> = { ABIERTO: 'info', EN_PROCESO: 'warn', RESUELTO: 'ok', DESCARTADO: 'neutral' };
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

function NewReport({ onSent }: { onSent: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [category, setCategory] = useState<ReportCategory>('ERROR');
  const [description, setDescription] = useState('');
  const errors = recentClientErrors();
  const send = useMutation({
    mutationFn: () =>
      api.post('/support/reports', {
        category,
        description,
        pageUrl: window.location.pathname + window.location.search,
        appVersion: import.meta.env.VITE_APP_VERSION ?? null,
        clientErrors: errors,
      }),
    onSuccess: () => {
      toast.ok('¡Gracias! Recibimos tu reporte. Te avisamos cuando lo revisemos.');
      setDescription('');
      void qc.invalidateQueries({ queryKey: ['my-reports'] });
      onSent();
    },
    onError: (e) => toast.error(e),
  });
  return (
    <form className="stack" onSubmit={(e: FormEvent) => (e.preventDefault(), send.mutate())}>
      <Field label="Tipo">
        <div className="segmented report-categories" role="radiogroup" aria-label="Tipo de reporte">
          {REPORT_CATEGORIES.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={category === c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>
              {REPORT_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="¿Qué pasó?" hint="Contanos qué estabas haciendo y qué esperabas que pasara. Si es un error, en qué pantalla y qué tocaste.">
        <Textarea
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: quise guardar la asistencia del sábado y me salió un error."
        />
      </Field>
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Se envía junto con la pantalla en la que estás ({window.location.pathname}){errors.length ? ` y ${errors.length} error(es) técnico(s) del navegador` : ''}. Por
        ahora no se pueden adjuntar imágenes.
      </p>
      <div className="form-actions" style={{ marginTop: 0 }}>
        <Button type="submit" loading={send.isPending} disabled={description.trim().length < 10}>
          Enviar reporte
        </Button>
      </div>
    </form>
  );
}

function MyReports() {
  const list = useQuery({ queryKey: ['my-reports'], queryFn: () => api.get<MyReport[]>('/support/reports/mine') });
  if (list.isLoading) return <Loading />;
  if (!list.data?.length) return <Empty>Todavía no mandaste reportes.</Empty>;
  return (
    <ul className="list-plain">
      {list.data.map((r) => (
        <li key={r.id}>
          <div className="row between">
            <span className="row" style={{ gap: 6 }}>
              <Badge tone={REPORT_STATUS_TONES[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge>
              <strong>{REPORT_CATEGORY_LABELS[r.category]}</strong>
            </span>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {fmtDateTime(r.createdAt)}
            </span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{r.description}</div>
          {r.response ? (
            <div className="alert alert-ok" style={{ marginTop: 6 }}>
              <strong>Respuesta:</strong> {r.response}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Botón que abre el formulario (con la pestaña "Mis reportes"). */
export function ReportProblemButton({ className = 'btn btn-ghost btn-sm', label = 'Reportar un problema' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'nuevo' | 'mios'>('nuevo');
  return (
    <>
      <button type="button" className={`${className} report-problem-btn`} onClick={() => (setTab('nuevo'), setOpen(true))}>
        <Bug /> {label}
      </button>
      {open ? (
        <Modal title="Reportar un problema" onClose={() => setOpen(false)}>
          <Tabs
            tabs={[
              { key: 'nuevo', label: 'Nuevo reporte' },
              { key: 'mios', label: 'Mis reportes' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'nuevo' ? <NewReport onSent={() => setTab('mios')} /> : <MyReports />}
        </Modal>
      ) : null}
    </>
  );
}

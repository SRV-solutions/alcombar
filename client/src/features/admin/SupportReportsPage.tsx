/** Administración → Reportes (solo superadmin): reportes de problemas de la plataforma, con estado y respuesta. */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bug } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, REPORT_STATUSES, REPORT_STATUS_LABELS, type ReportCategory, type ReportStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { fmtDateTime, REPORT_STATUS_TONES } from '../../components/ReportProblem';

interface Report {
  id: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  response: string | null;
  pageUrl: string | null;
  appVersion: string | null;
  userAgent: string | null;
  clientErrors: { message: string; source?: string | null; time: string }[] | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string; email: string } | null;
  responder: { id: string; name: string } | null;
}

function ReportDialog({ report, onClose }: { report: Report; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>(report.status === 'ABIERTO' ? 'EN_PROCESO' : report.status);
  const [response, setResponse] = useState(report.response ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/support/reports/${report.id}`, { status, response });
      toast.ok('Reporte actualizado');
      await Promise.all([qc.invalidateQueries({ queryKey: ['support-reports'] }), qc.invalidateQueries({ queryKey: ['support-count'] })]);
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={REPORT_CATEGORY_LABELS[report.category]}
      onClose={onClose}
      wide
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
      <div className="stack">
        <dl className="dl">
          <dt>Quién</dt>
          <dd>{report.user ? `${report.user.name} (${report.user.email})` : '—'}</dd>
          <dt>Cuándo</dt>
          <dd>{fmtDateTime(report.createdAt)}</dd>
          <dt>Pantalla</dt>
          <dd>{report.pageUrl ? <code>{report.pageUrl}</code> : '—'}</dd>
          <dt>Navegador</dt>
          <dd className="muted" style={{ fontSize: '0.8rem' }}>
            {report.userAgent ?? '—'}
          </dd>
        </dl>
        <div className="card" style={{ boxShadow: 'none' }}>
          <div className="card-body" style={{ whiteSpace: 'pre-wrap' }}>
            {report.description}
          </div>
        </div>
        {report.clientErrors?.length ? (
          <details>
            <summary>Errores del navegador ({report.clientErrors.length})</summary>
            <ul className="list-plain" style={{ fontSize: '0.8rem' }}>
              {report.clientErrors.map((e, i) => (
                <li key={i}>
                  <code>{e.message}</code> {e.source ? <span className="muted">· {e.source}</span> : null} <span className="muted">· {fmtDateTime(e.time)}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="form-grid">
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)}>
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Respuesta" full hint="La ve la persona en «Mis reportes» y le llega por mail.">
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function SupportReportsPage() {
  const { me } = useAuth();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState<Report | null>(null);
  const list = useQuery({
    queryKey: ['support-reports', status, category],
    queryFn: () => api.get<Report[]>(`/support/reports${qs({ status, category })}`),
    enabled: !!me?.isSuperadmin,
  });
  if (!me?.isSuperadmin) return <Empty>Solo los superadmins ven los reportes.</Empty>;
  return (
    <>
      <PageHeader title="Reportes de problemas" sub="Lo que reportan los usuarios desde «Reportar un problema»: errores de la plataforma, sugerencias y consultas." />
      <div className="toolbar">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REPORT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {REPORT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !list.data?.length ? (
          <Empty icon={<Bug />}>No hay reportes {status || category ? 'con ese filtro' : 'todavía'}.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Quién</th>
                <th>Descripción</th>
                <th>Pantalla</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setOpen(r)}>
                  <td className="nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td>
                    <Badge tone={REPORT_STATUS_TONES[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge>
                  </td>
                  <td className="nowrap">{REPORT_CATEGORY_LABELS[r.category]}</td>
                  <td className="nowrap">{r.user?.name ?? '—'}</td>
                  <td style={{ maxWidth: 380 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                  </td>
                  <td className="muted">{r.pageUrl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {open ? <ReportDialog report={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Pencil, Printer, Trash2 } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { MinuteDialog } from './Dialogs';
import { kindLabel, minuteNumber, statusLabel, type Minute } from './types';
import './library.css';

export function MinuteDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['library', 'minute', id], queryFn: () => api.get<Minute>(`/library/minutes/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const m = q.data!;

  const approve = async () => {
    try {
      await api.put(`/library/minutes/${m.id}`, {
        date: m.date,
        kind: m.kind,
        title: m.title,
        attendees: m.attendees,
        agenda: m.agenda,
        content: m.content,
        driveUrl: m.driveUrl,
        status: 'aprobada',
      });
      toast.ok('Acta aprobada');
      await qc.invalidateQueries({ queryKey: ['library'] });
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/actas', label: 'Actas y documentos' }]}
        title={`Acta N° ${minuteNumber(m)} · ${m.title}`}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <Badge tone={m.status === 'aprobada' ? 'ok' : 'warn'}>{statusLabel(m.status)}</Badge>
            <span>
              Reunión {kindLabel(m.kind).toLowerCase()} del {formatDate(m.date)}
            </span>
          </span>
        }
        actions={
          <>
            {m.driveUrl ? (
              <a className="btn btn-secondary" href={m.driveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Abrir en el Drive
              </a>
            ) : null}
            {can('documents', 'edit') && m.status === 'borrador' ? (
              <ConfirmButton
                variant="secondary"
                title="Aprobar acta"
                message="¿Marcar el acta como aprobada? Después ya no se puede eliminar (sí corregir)."
                confirmLabel="Aprobar"
                onConfirm={approve}
              >
                <CheckCircle2 /> Aprobar acta
              </ConfirmButton>
            ) : null}
            {can('documents', 'edit') ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            <Button onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
            {can('documents', 'delete') && m.status === 'borrador' ? (
              <ConfirmButton
                title="Eliminar acta"
                message={`¿Eliminar el borrador del acta N° ${minuteNumber(m)}?`}
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/library/minutes/${m.id}`);
                    toast.ok('Acta eliminada');
                    await qc.invalidateQueries({ queryKey: ['library'] });
                    navigate('/actas');
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

      <Card>
        <article className="minute-doc">
          <div className="print-only" style={{ marginBottom: 12 }}>
            <strong>Grupo Scout 155 Divina Providencia · Consejo de Grupo</strong>
            <div>
              Acta N° {minuteNumber(m)} · {m.title}
            </div>
          </div>
          <div className="minute-meta">
            <span>Fecha: {formatDate(m.date)}</span>
            <span>Reunión {kindLabel(m.kind).toLowerCase()}</span>
            <span>Estado: {statusLabel(m.status)}</span>
            {m.createdBy ? <span>Cargó: {m.createdBy.name}</span> : null}
          </div>
          <h2>Asistentes</h2>
          <div className="minute-text">{m.attendees || <span className="muted">Sin cargar.</span>}</div>
          <h2>Orden del día</h2>
          <div className="minute-text">{m.agenda || <span className="muted">Sin cargar.</span>}</div>
          <h2>Desarrollo y decisiones</h2>
          <div className="minute-text">{m.content || <span className="muted">Sin cargar.</span>}</div>
          <div className="print-only minute-signatures">
            <div>Jefe/a de Grupo</div>
            <div>Secretario/a del Consejo</div>
          </div>
        </article>
      </Card>

      {editing ? <MinuteDialog minute={m} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

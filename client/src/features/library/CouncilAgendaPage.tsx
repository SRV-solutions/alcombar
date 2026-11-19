import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { Card, ErrorBox, Loading, PageHeader } from '../../components/ui';

interface Agenda {
  id: string;
  title: string;
  date: string;
  agenda: string | null;
  message: string | null;
  sentAt: string;
}

/** El temario de un Consejo de Grupo, para los representantes juveniles: lo que les mandó la Jefatura, sin el resto del acta. */
export function CouncilAgendaPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['council-agenda', id], queryFn: () => api.get<Agenda>(`/library/minutes/${id}/agenda`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const a = q.data!;
  const topics = (a.agenda ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
  return (
    <>
      <PageHeader title={`Consejo de Grupo del ${formatDate(a.date)}`} sub={a.title} />
      <Card title="Temario">
        {a.message ? <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{a.message}</p> : null}
        {topics.length ? (
          <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 6 }}>
            {topics.map((t, i) => (
              <li key={i}>{t.replace(/^\d+[.)]\s*/, '')}</li>
            ))}
          </ol>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Todavía no hay temas cargados.</p>
        )}
        <p className="muted" style={{ marginBottom: 0 }}>
          Enviado por la Jefatura de Grupo el {formatDate(a.sentAt.slice(0, 10))}. Si tu Comunidad quiere sumar un tema, avisale a la Jefatura antes del Consejo.
        </p>
      </Card>
    </>
  );
}

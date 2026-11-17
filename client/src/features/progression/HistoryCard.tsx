import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BookOpen, Flag, History, Layers, MessageSquare, Shuffle, Sparkles, Target, Trash2 } from 'lucide-react';
import { formatDate, todayIso } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, Field, Input, Textarea } from '../../components/ui';

interface HistoryItem {
  id: string;
  at: string;
  date: string | null;
  kind: 'nota' | 'etapa' | 'competencia' | 'rol' | 'revision' | 'especialidad' | 'momentos' | 'grupo';
  author: { userId: string | null; name: string };
  text: string;
  detail: string | null;
  noteId?: string;
  canDelete?: boolean;
}
interface History {
  items: HistoryItem[];
  authors: { name: string; count: number; last: string }[];
}

const ICONS: Record<HistoryItem['kind'], JSX.Element> = {
  nota: <MessageSquare />,
  etapa: <Flag />,
  competencia: <Target />,
  rol: <Layers />,
  revision: <BookOpen />,
  especialidad: <Award />,
  momentos: <Sparkles />,
  grupo: <Shuffle />,
};

const when = (i: HistoryItem) => {
  const t = new Date(i.at);
  const hour = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  // Las notas muestran el día al que se refieren; los cambios, cuándo se hicieron (fecha y hora locales)
  return i.date ? formatDate(i.date) : `${t.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${hour}`;
};

export const historyKey = (memberId: string) => ['progression-history', memberId];

/**
 * Seguimiento de la progresión: cualquier adulto de la unidad anota cómo viene el protagonista, y todos ven quién
 * hizo cada cosa (notas, etapas, competencias, roles, revisiones, especialidades y cambios de pequeño grupo).
 */
export function HistoryCard({ memberId, canEdit }: { memberId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [all, setAll] = useState(false);
  const q = useQuery({ queryKey: historyKey(memberId), queryFn: () => api.get<History>(`/progression/members/${memberId}/history`) });

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/progression/members/${memberId}/notes`, { date, note });
      setNote('');
      toast.ok('Seguimiento anotado');
      await qc.invalidateQueries({ queryKey: historyKey(memberId) });
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (noteId: string) => {
    try {
      await api.del(`/progression/notes/${noteId}`);
      toast.ok('Nota borrada');
      await qc.invalidateQueries({ queryKey: historyKey(memberId) });
    } catch (e) {
      toast.error(e);
    }
  };

  const items = q.data?.items ?? [];
  const shown = all ? items : items.slice(0, 15);
  return (
    <Card
      title={
        <h2 className="row" style={{ gap: 8 }}>
          <History size={18} color="var(--bordo)" /> Seguimiento
        </h2>
      }
    >
      {canEdit ? (
        <div className="history-form">
          <Field label="Anotar seguimiento" hint="Cómo viene, qué charlaron, qué desafío está encarando… Lo ven los adultos de la unidad.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={3000} placeholder="Ej: Charlamos sobre su desafío de la competencia 4; quiere organizar la próxima salida de patrulla." />
          </Field>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <Field label="Fecha">
              <Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
            </Field>
            <Button onClick={() => void save()} loading={saving} disabled={!note.trim()}>
              <MessageSquare /> Anotar
            </Button>
          </div>
        </div>
      ) : null}

      {q.data?.authors.length ? (
        <div className="history-authors">
          <span className="muted">Seguimiento hecho por:</span>
          {q.data.authors.map((a) => (
            <span key={a.name} className="chip" title={`Último: ${formatDate(a.last)}`}>
              {a.name} · <strong>{a.count}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {q.isLoading ? (
        <p className="muted">Cargando…</p>
      ) : !items.length ? (
        <p className="muted" style={{ margin: 0 }}>
          Todavía no hay seguimiento registrado. Cada nota, etapa, competencia, revisión o cambio de pequeño grupo queda acá con el adulto que lo hizo.
        </p>
      ) : (
        <ol className="history-list">
          {shown.map((i) => (
            <li key={i.id} className={`history-item kind-${i.kind}`}>
              <span className="history-icon">{ICONS[i.kind]}</span>
              <div className="history-body">
                <div className="history-head">
                  <strong>{i.author.name}</strong>
                  <span className="muted nowrap">{when(i)}</span>
                </div>
                <div className={i.kind === 'nota' ? 'history-note' : undefined}>{i.text}</div>
                {i.detail ? <div className="muted history-detail">{i.detail}</div> : null}
              </div>
              {i.canDelete && i.noteId ? (
                <ConfirmButton size="sm" title="Borrar nota" message="¿Borrar esta nota de seguimiento?" confirmLabel="Borrar" onConfirm={() => remove(i.noteId!)}>
                  <Trash2 />
                </ConfirmButton>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {items.length > 15 ? (
        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
          {all ? 'Ver menos' : `Ver todo (${items.length})`}
        </Button>
      ) : null}
    </Card>
  );
}

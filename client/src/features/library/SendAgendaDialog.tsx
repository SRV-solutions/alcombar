import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Field, Modal, Textarea } from '../../components/ui';
import type { Minute } from './types';

interface Counts {
  users: number;
  emails: number;
}

/** La Jefatura manda el temario del Consejo como aviso (campanita + mail) unos días antes. */
export function SendAgendaDialog({ minute, onClose }: { minute: Minute; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [audience, setAudience] = useState<'educadores' | 'todos'>('educadores');
  const [message, setMessage] = useState(minute.agendaMessage ?? '');
  const [busy, setBusy] = useState(false);
  const counts = useQuery({
    queryKey: ['agenda-recipients', minute.id],
    queryFn: () => api.get<{ educadores: Counts; todos: Counts }>(`/library/minutes/${minute.id}/agenda-recipients`),
  });
  const n = (k: 'educadores' | 'todos') => (counts.data ? `${counts.data[k].users} personas` : '…');
  const hasAgenda = !!minute.agenda?.trim();

  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ users: number; emails: number }>(`/library/minutes/${minute.id}/send-agenda`, { audience, message });
      toast.ok(`Temario enviado a ${r.users} personas`);
      await qc.invalidateQueries({ queryKey: ['library'] });
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Enviar el temario del Consejo del ${formatDate(minute.date)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void send()} loading={busy} disabled={!hasAgenda}>
            <Send /> Enviar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Orden del día que se va a mandar" full>
          {hasAgenda ? (
            <div className="agenda-preview">{minute.agenda}</div>
          ) : (
            <p className="muted">El acta todavía no tiene orden del día. Cerrá esta ventana, tocá «Editar» y cargá un tema por renglón.</p>
          )}
        </Field>
        <Field label="Mensaje (opcional)" full hint="Va arriba del temario. Por ejemplo: hora, lugar o qué traer.">
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="Nos vemos el sábado a las 18 h en la sede. Traigan las fichas del ciclo." />
        </Field>
        <Field label="¿A quiénes?" full>
          <div className="agenda-audience" role="radiogroup">
            <label>
              <input type="radio" name="aud" checked={audience === 'educadores'} onChange={() => setAudience('educadores')} />
              <span>
                Educadores: Jefatura y adultos de las unidades ({n('educadores')})
                <small>Jefes, subjefes y ayudantes de unidad, y la Jefatura de Grupo.</small>
              </span>
            </label>
            <label>
              <input type="radio" name="aud" checked={audience === 'todos'} onChange={() => setAudience('todos')} />
              <span>
                Todos los adultos con cargo este año ({n('todos')})
                <small>Además: equipos de apoyo, acompañantes y padres representantes.</small>
              </span>
            </label>
          </div>
        </Field>
      </div>
      {minute.agendaSentAt ? <p className="muted">Ya se envió el {formatDate(minute.agendaSentAt.slice(0, 10))}. Si lo reenviás, les llega de nuevo a todos.</p> : null}
    </Modal>
  );
}

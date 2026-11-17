import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_TYPES, eventSchema, formatDate, formatMoney, type EventInput, type EventStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea, type Tone } from '../../components/ui';
import { Money } from '../accounting/common';
import type { EventDetail, EventListItem } from './types';
import '../accounting/accounting.css';

export const EVENT_STATUS_TONE: Record<EventStatus, Tone> = { planificacion: 'info', en_curso: 'warn', rendido: 'ok' };

export function EventsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['events', year, status], queryFn: () => api.get<EventListItem[]>(`/events${qs({ year, status })}`) });
  const current = new Date().getFullYear();
  const rows = q.data ?? [];
  const totals = rows.reduce((s, e) => ({ ingresos: s.ingresos + e.ingresos, egresos: s.egresos + e.egresos }), { ingresos: 0, egresos: 0 });
  return (
    <>
      <PageHeader
        title="Eventos"
        sub="Fogones, festival aniversario y eventos de recaudación: tareas, compras, presupuesto y rendición."
        actions={
          can('events', 'create') ? (
            <Button onClick={() => setCreating(true)} id="btn-new-event">
              <Plus /> Nuevo evento
            </Button>
          ) : null
        }
      />
      <div className="toolbar">
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año">
          {Array.from({ length: 5 }, (_, i) => current + 1 - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {rows.length ? (
          <span className="muted">
            Resultado del año: <strong>{formatMoney(totals.ingresos - totals.egresos)}</strong>
          </span>
        ) : null}
      </div>
      <Card bodyClass="table-wrap">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <div className="card-body">
            <ErrorBox error={q.error} />
          </div>
        ) : !rows.length ? (
          <Empty>No hay eventos en {year}.</Empty>
        ) : (
          <table className="table" id="events-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Tareas</th>
                <th>Estado</th>
                <th className="num">Previsto</th>
                <th className="num">Resultado real</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="clickable" onClick={() => navigate(`/eventos/${e.id}`)}>
                  <td>
                    <strong>{e.name}</strong>
                    <div className="muted">
                      {EVENT_TYPE_LABELS[e.type]}
                      {e.place ? ` · ${e.place}` : ''}
                    </div>
                  </td>
                  <td className="nowrap">{formatDate(e.date)}</td>
                  <td>{e.responsible ? adultName(e.responsible) : <span className="muted">—</span>}</td>
                  <td className="nowrap">{e.tasks.total ? `${e.tasks.done}/${e.tasks.total}` : <span className="muted">—</span>}</td>
                  <td>
                    <Badge tone={EVENT_STATUS_TONE[e.status]}>{EVENT_STATUS_LABELS[e.status]}</Badge>
                  </td>
                  <td className="num">
                    <Money value={e.plannedIncome - e.plannedExpense} />
                  </td>
                  <td className="num">
                    <Money value={e.resultado} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating ? <EventDialog onClose={() => setCreating(false)} onSaved={(id) => navigate(`/eventos/${id}`)} /> : null}
    </>
  );
}

export function EventDialog({ event, onClose, onSaved }: { event?: EventDetail; onClose: () => void; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const adults = useAdults();
  const { register, handleSubmit, formState, setError } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          name: event.name,
          type: event.type,
          date: event.date ?? '',
          place: event.place ?? '',
          responsibleAdultId: event.responsibleAdultId ?? '',
          status: event.status === 'rendido' ? 'en_curso' : event.status,
          description: event.description ?? '',
        }
      : { name: '', type: 'fogon', date: '', place: '', responsibleAdultId: '', status: 'planificacion', description: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = event ? await api.put<{ id: string }>(`/events/${event.id}`, v) : await api.post<{ id: string }>('/events', v);
      toast.ok(event ? 'Evento actualizado' : 'Evento creado');
      onSaved?.(saved.id);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={event ? 'Editar evento' : 'Nuevo evento'}
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
      <form className="form-grid" onSubmit={onSubmit} noValidate id="event-form">
        <Field label="Nombre" required full error={e.name?.message}>
          <Input {...register('name')} invalid={!!e.name} placeholder="Ej: Fogón de primavera" />
        </Field>
        <Field label="Tipo" required>
          <Select {...register('type')}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" error={e.date?.message}>
          <Input type="date" {...register('date')} />
        </Field>
        <Field label="Lugar" error={e.place?.message}>
          <Input {...register('place')} placeholder="Ej: sede del Grupo" />
        </Field>
        <Field label="Responsable">
          <Select {...register('responsibleAdultId')}>
            <option value="">—</option>
            {adults.data
              ?.filter((a) => a.status !== 'baja' || a.id === event?.responsibleAdultId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {adultName(a)}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Estado">
          <Select {...register('status')}>
            <option value="planificacion">{EVENT_STATUS_LABELS.planificacion}</option>
            <option value="en_curso">{EVENT_STATUS_LABELS.en_curso}</option>
          </Select>
        </Field>
        <Field label="Descripción" full>
          <Textarea rows={3} {...register('description')} />
        </Field>
      </form>
    </Modal>
  );
}

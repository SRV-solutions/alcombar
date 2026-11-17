import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink, Trash2 } from 'lucide-react';
import { CALENDAR_TYPE_LABELS, CALENDAR_TYPES, calendarEventSchema, type CalendarEventInput } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Checkbox, ConfirmButton, Field, Input, Loading, Modal, Select, Textarea, UnitBadge } from '../../components/ui';
import { typeLabel, whenLabel, type CalItem } from './types';

interface CalendarEventRow {
  id: string;
  title: string;
  type: string;
  unitId: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  place: string | null;
  description: string | null;
}

/** Alta / edición de un evento del calendario. eventId = editar; date = fecha sugerida para uno nuevo. */
export function EventDialog({ eventId, date, onClose }: { eventId?: string; date?: string; onClose: () => void }) {
  const existing = useQuery({ queryKey: ['calendar', 'event', eventId], queryFn: () => api.get<CalendarEventRow>(`/calendar/${eventId}`), enabled: !!eventId });
  if (eventId && existing.isLoading) {
    return (
      <Modal title="Evento" onClose={onClose}>
        <Loading />
      </Modal>
    );
  }
  return <EventForm event={existing.data} date={date} onClose={onClose} />;
}

function EventForm({ event, date, onClose }: { event?: CalendarEventRow; date?: string; onClose: () => void }) {
  const { can, canAll } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const { register, handleSubmit, formState, setError, watch } = useForm<CalendarEventInput>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: event
      ? {
          title: event.title,
          type: event.type as CalendarEventInput['type'],
          unitId: event.unitId ?? '',
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: event.allDay,
          startTime: event.startTime ?? '',
          endTime: event.endTime ?? '',
          place: event.place ?? '',
          description: event.description ?? '',
        }
      : { title: '', type: 'reunion', unitId: '', startDate: date ?? '', endDate: date ?? '', allDay: false, startTime: '15:00', endTime: '18:00', place: '', description: '' },
  });
  const e = formState.errors;
  const allDay = watch('allDay');
  const action = event ? 'edit' : 'create';
  // Del Grupo: hace falta el permiso para todo el Grupo; de una unidad: el permiso en esa unidad
  const canGroup = canAll('calendar', action) || (!!event && !event.unitId);
  const unitOptions = (units.data ?? []).filter((u) => can('calendar', 'create', u.id) || u.id === event?.unitId);
  const canDelete = !!event && can('calendar', 'delete', event.unitId);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (event) await api.put(`/calendar/${event.id}`, values);
      else await api.post('/calendar', values);
      toast.ok(event ? 'Evento actualizado' : 'Evento agregado al calendario');
      await qc.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });

  return (
    <Modal
      title={event ? 'Editar evento' : 'Nuevo evento'}
      onClose={onClose}
      wide
      footer={
        <>
          {canDelete ? (
            <span style={{ marginRight: 'auto' }}>
              <ConfirmButton
                size="sm"
                title="Eliminar evento"
                message={`¿Eliminar «${event!.title}» del calendario?`}
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/calendar/${event!.id}`);
                    toast.ok('Evento eliminado');
                    await qc.invalidateQueries({ queryKey: ['calendar'] });
                    onClose();
                  } catch (err) {
                    toast.error(err);
                  }
                }}
              >
                <Trash2 /> Eliminar
              </ConfirmButton>
            </span>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={formState.isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Título" required error={e.title?.message} full>
          <Input {...register('title')} invalid={!!e.title} placeholder="Ej: Reunión de sábado, Consejo de Grupo, Fogón" autoFocus />
        </Field>
        <Field label="Tipo" error={e.type?.message}>
          <Select {...register('type')}>
            {CALENDAR_TYPES.map((t) => (
              <option key={t} value={t}>
                {CALENDAR_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="De quién" error={e.unitId?.message} hint="Todo el Grupo o una unidad">
          <Select {...register('unitId')} invalid={!!e.unitId}>
            {canGroup ? <option value="">Todo el Grupo</option> : null}
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" required error={e.startDate?.message}>
          <Input type="date" {...register('startDate')} invalid={!!e.startDate} />
        </Field>
        <Field label="Hasta" error={e.endDate?.message} hint="Para varios días (campamento, retiro…)">
          <Input type="date" {...register('endDate')} invalid={!!e.endDate} />
        </Field>
        <div className="full">
          <Checkbox label="Todo el día" {...register('allDay')} />
        </div>
        {!allDay ? (
          <>
            <Field label="Hora de inicio" error={e.startTime?.message}>
              <Input type="time" {...register('startTime')} invalid={!!e.startTime} />
            </Field>
            <Field label="Hora de fin" error={e.endTime?.message}>
              <Input type="time" {...register('endTime')} invalid={!!e.endTime} />
            </Field>
          </>
        ) : null}
        <Field label="Lugar" error={e.place?.message} full>
          <Input {...register('place')} placeholder="Ej: Sede, Parroquia, Campo escuela…" />
        </Field>
        <Field label="Descripción" error={e.description?.message} full>
          <Textarea {...register('description')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

/** Detalle de solo lectura (eventos de otros módulos o sin permiso de edición). */
export function EventDetails({ item, onClose, onEdit }: { item: CalItem; onClose: () => void; onEdit?: () => void }) {
  return (
    <Modal
      title={item.title}
      onClose={onClose}
      footer={
        <>
          {item.link ? (
            <Link to={item.link} className="btn btn-secondary" onClick={onClose}>
              <ExternalLink /> Ver detalle
            </Link>
          ) : null}
          {onEdit ? <Button onClick={onEdit}>Editar</Button> : null}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <dl className="dl">
        <dt>Cuándo</dt>
        <dd style={{ textTransform: 'none' }}>{whenLabel(item)}</dd>
        <dt>Tipo</dt>
        <dd>
          <Badge>{typeLabel(item.type)}</Badge>
        </dd>
        <dt>De quién</dt>
        <dd>{item.unit ? <UnitBadge unit={item.unit} /> : 'Todo el Grupo'}</dd>
        {item.place ? (
          <>
            <dt>Lugar</dt>
            <dd>{item.place}</dd>
          </>
        ) : null}
        {item.description ? (
          <>
            <dt>Descripción</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{item.description}</dd>
          </>
        ) : null}
      </dl>
    </Modal>
  );
}

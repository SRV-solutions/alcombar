import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  documentLinkSchema,
  MINUTE_KIND_LABELS,
  MINUTE_KINDS,
  MINUTE_STATUS_LABELS,
  MINUTE_STATUSES,
  minuteSchema,
  todayIso,
  type DocumentLinkInput,
  type MinuteInput,
} from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import type { DocLink, Minute } from './types';

/** Alta / edición de un acta del Consejo de Grupo. */
export function MinuteDialog({ minute, onClose, onSaved }: { minute?: Minute; onClose: () => void; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<MinuteInput>({
    resolver: zodResolver(minuteSchema),
    defaultValues: minute
      ? {
          date: minute.date,
          kind: minute.kind,
          title: minute.title,
          attendees: minute.attendees ?? '',
          agenda: minute.agenda ?? '',
          content: minute.content ?? '',
          driveUrl: minute.driveUrl ?? '',
          status: minute.status,
        }
      : { date: todayIso(), kind: 'ordinaria', title: 'Consejo de Grupo', attendees: '', agenda: '', content: '', driveUrl: '', status: 'borrador' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = minute ? await api.put<{ id: string }>(`/library/minutes/${minute.id}`, values) : await api.post<{ id: string }>('/library/minutes', values);
      toast.ok(minute ? 'Acta guardada' : 'Acta creada');
      await qc.invalidateQueries({ queryKey: ['library'] });
      onSaved?.(saved.id);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={minute ? 'Editar acta' : 'Nueva acta del Consejo'}
      onClose={onClose}
      wide
      footer={
        <>
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
        <Field label="Fecha" required error={e.date?.message}>
          <Input type="date" {...register('date')} invalid={!!e.date} />
        </Field>
        <Field label="Tipo de reunión" error={e.kind?.message}>
          <Select {...register('kind')}>
            {MINUTE_KINDS.map((k) => (
              <option key={k} value={k}>
                {MINUTE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título" required error={e.title?.message} full>
          <Input {...register('title')} invalid={!!e.title} />
        </Field>
        <Field label="Asistentes" error={e.attendees?.message} hint="Quiénes estuvieron (uno por línea o separados por coma)" full>
          <Textarea {...register('attendees')} style={{ minHeight: 60 }} />
        </Field>
        <Field label="Orden del día" error={e.agenda?.message} full>
          <Textarea {...register('agenda')} style={{ minHeight: 80 }} />
        </Field>
        <Field label="Desarrollo y decisiones" error={e.content?.message} full>
          <Textarea {...register('content')} style={{ minHeight: 200 }} />
        </Field>
        <Field label="Enlace al Drive" error={e.driveUrl?.message} hint="El acta escaneada o el documento original" full>
          <Input type="url" placeholder="https://drive.google.com/…" {...register('driveUrl')} invalid={!!e.driveUrl} />
        </Field>
        <Field label="Estado" error={e.status?.message}>
          <Select {...register('status')}>
            {MINUTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MINUTE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

/** Alta / edición de un documento (enlace al Drive). */
export function DocumentDialog({ doc, onClose }: { doc?: DocLink; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const { register, handleSubmit, formState, setError } = useForm<DocumentLinkInput>({
    resolver: zodResolver(documentLinkSchema),
    defaultValues: doc
      ? { title: doc.title, category: doc.category, url: doc.url, description: doc.description ?? '', unitId: doc.unitId ?? '' }
      : { title: '', category: 'reglamentos', url: '', description: '', unitId: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (doc) await api.put(`/library/documents/${doc.id}`, values);
      else await api.post('/library/documents', values);
      toast.ok(doc ? 'Documento actualizado' : 'Documento agregado');
      await qc.invalidateQueries({ queryKey: ['library'] });
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={doc ? 'Editar documento' : 'Nuevo documento'}
      onClose={onClose}
      footer={
        <>
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
          <Input {...register('title')} invalid={!!e.title} placeholder="Ej: Política de cuidado de niños, niñas y jóvenes" autoFocus />
        </Field>
        <Field label="Categoría" error={e.category?.message}>
          <Select {...register('category')}>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unidad" error={e.unitId?.message} hint="Opcional: si es de una unidad">
          <Select {...register('unitId')}>
            <option value="">Todo el Grupo</option>
            {units.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Enlace" required error={e.url?.message} hint="Enlace al Drive (o a la web de SAAC)" full>
          <Input type="url" placeholder="https://drive.google.com/…" {...register('url')} invalid={!!e.url} />
        </Field>
        <Field label="Descripción" error={e.description?.message} full>
          <Textarea {...register('description')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

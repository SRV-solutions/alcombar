import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campCloneSchema, campNights, type CampCloneInput } from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Button, Checkbox, Field, Input, Modal } from '../../components/ui';
import type { CampDetail } from './types';

interface CloneResult {
  id: string;
  copied: { permit: boolean; budget: number; menu: number; shopping: number; days: number; daysSkipped: number };
}

/**
 * Duplicar un campamento: crea uno nuevo, en borrador, con los datos de este (unidades, lugar, Jefe/a de Campo,
 * costo, propuesta, transporte y materiales) y lo que se elija. No copia inscriptos, pagos ni firmas.
 */
export function CampCloneDialog({ camp, onClose }: { camp: CampDetail; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setError, watch } = useForm<CampCloneInput>({
    resolver: zodResolver(campCloneSchema),
    defaultValues: { name: `${camp.name} (copia)`, startDate: '', endDate: '', permit: true, budget: true, logistics: true, schedule: true },
  });
  const e = formState.errors;
  const start = watch('startDate');
  const end = watch('endDate');
  const nights = start && end && end >= start ? campNights(start, end) : null;
  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await api.post<CloneResult>(`/camps/${camp.id}/clone`, v);
      const parts = [
        r.copied.permit ? 'el permiso de acampe' : null,
        r.copied.budget ? 'el presupuesto' : null,
        r.copied.menu || r.copied.shopping ? 'menú y compras' : null,
        r.copied.days ? `${r.copied.days} ${r.copied.days === 1 ? 'día' : 'días'} de cronograma` : null,
      ].filter(Boolean);
      toast.ok(`Campamento duplicado (en borrador)${parts.length ? `, con ${parts.join(', ')}` : ''}`);
      if (r.copied.daysSkipped) toast.info(`${r.copied.daysSkipped} ${r.copied.daysSkipped === 1 ? 'día ya tenía' : 'días ya tenían'} programa cargado en las fechas nuevas: ese cronograma no se pisó`);
      onClose();
      navigate(`/campamentos/${r.id}`);
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title="Duplicar campamento"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Duplicar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate id="camp-clone-form">
        <p className="full" style={{ margin: 0 }}>
          Se crea un campamento nuevo, en borrador, con las unidades, el lugar, el Jefe/a de Campo, el costo, la propuesta, el transporte y los materiales de «{camp.name}».
          Después lo modificás como cualquier otro.
        </p>
        <Field label="Nombre" required full error={e.name?.message}>
          <Input {...register('name')} invalid={!!e.name} />
        </Field>
        <Field label="Desde" required error={e.startDate?.message}>
          <Input type="date" {...register('startDate')} invalid={!!e.startDate} />
        </Field>
        <Field label="Hasta" required error={e.endDate?.message} hint={nights !== null ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : undefined}>
          <Input type="date" {...register('endDate')} invalid={!!e.endDate} />
        </Field>
        <Field label="También se copia" full>
          <div style={{ display: "grid", gap: 8 }}>
            <Checkbox label="El Permiso de Acampe, con todo lo cargado (las fechas pasan a ser las nuevas; la firma no se copia)" {...register('permit')} />
            <Checkbox label="El cronograma de cada día, corrido a las fechas nuevas" {...register('schedule')} />
            <Checkbox label="El presupuesto previsto" {...register('budget')} />
            <Checkbox label="El menú y la lista de compras" {...register('logistics')} />
          </div>
        </Field>
        <p className="muted full" style={{ margin: 0 }}>
          No se copian los inscriptos, los pagos, los gastos ni las autorizaciones firmadas. Las fichas enlazadas al cronograma quedan como momentos con su nombre: si
          querés la ficha, la clonás desde el momento.
        </p>
      </form>
    </Modal>
  );
}

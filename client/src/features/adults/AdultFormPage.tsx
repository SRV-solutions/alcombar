import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { ADULT_STATUSES, ADULT_STATUS_LABELS, adultSchema } from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { AdultDetail } from '../../lib/types';
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Select, Textarea } from '../../components/ui';

type AdultForm = z.input<typeof adultSchema>;

const EMPTY: AdultForm = {
  firstName: '',
  lastName: '',
  totem: '',
  dni: '',
  birthDate: '',
  email: '',
  phone: '',
  address: '',
  joinedAt: '',
  status: 'alta',
  advisorAdultId: '',
  notes: '',
};

function toForm(a: AdultDetail): AdultForm {
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    totem: a.totem ?? '',
    dni: a.dni ?? '',
    birthDate: a.birthDate ?? '',
    email: a.email ?? '',
    phone: a.phone ?? '',
    address: a.address ?? '',
    joinedAt: a.joinedAt ?? '',
    status: a.status as AdultForm['status'],
    advisorAdultId: a.advisorAdultId ?? '',
    notes: a.notes ?? '',
  };
}

export function AdultFormPage() {
  const { id } = useParams();
  const adult = useQuery({
    queryKey: ['adult', id],
    queryFn: () => api.get<AdultDetail>(`/adults/${id}`),
    enabled: !!id,
  });
  if (id && adult.isLoading) return <Loading />;
  if (id && adult.error) return <ErrorBox error={adult.error} />;
  return <AdultFormInner adult={id ? adult.data : undefined} />;
}

function AdultFormInner({ adult }: { adult?: AdultDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const adults = useAdults();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdultForm>({
    resolver: zodResolver(adultSchema),
    defaultValues: adult ? toForm(adult) : EMPTY,
  });

  const onSubmit = async (values: AdultForm) => {
    try {
      const saved = adult ? await api.put<{ id: string }>(`/adults/${adult.id}`, values) : await api.post<{ id: string }>('/adults', values);
      await qc.invalidateQueries({ queryKey: ['adults'] });
      await qc.invalidateQueries({ queryKey: ['adult'] });
      toast.ok(adult ? 'Datos guardados' : 'Adulto creado');
      navigate(`/adultos/${saved.id}`);
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };

  const title = adult ? `Editar: ${adult.firstName} ${adult.lastName}` : 'Nuevo adulto';
  return (
    <>
      <PageHeader
        crumbs={[{ to: '/adultos', label: 'Adultos' }, ...(adult ? [{ to: `/adultos/${adult.id}`, label: `${adult.firstName} ${adult.lastName}` }] : [])]}
        title={title}
      />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-grid">
            <Field label="Nombre" required error={errors.firstName?.message}>
              <Input {...register('firstName')} invalid={!!errors.firstName} autoFocus />
            </Field>
            <Field label="Apellido" required error={errors.lastName?.message}>
              <Input {...register('lastName')} invalid={!!errors.lastName} />
            </Field>
            <Field label="Tótem" error={errors.totem?.message}>
              <Input {...register('totem')} />
            </Field>
            <Field label="DNI" error={errors.dni?.message} hint="Sin puntos">
              <Input {...register('dni')} invalid={!!errors.dni} inputMode="numeric" />
            </Field>
            <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
              <Input type="date" {...register('birthDate')} invalid={!!errors.birthDate} />
            </Field>
            <Field label="Fecha de ingreso al Grupo" error={errors.joinedAt?.message}>
              <Input type="date" {...register('joinedAt')} invalid={!!errors.joinedAt} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} invalid={!!errors.email} />
            </Field>
            <Field label="Teléfono" error={errors.phone?.message}>
              <Input type="tel" {...register('phone')} />
            </Field>
            <Field label="Dirección" error={errors.address?.message} full>
              <Input {...register('address')} />
            </Field>
            <Field label="Estado" required error={errors.status?.message}>
              <Select {...register('status')}>
                {ADULT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ADULT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Asesor Personal de Formación" error={errors.advisorAdultId?.message}>
              <Select {...register('advisorAdultId')} invalid={!!errors.advisorAdultId}>
                <option value="">— Sin asesor asignado —</option>
                {(adults.data ?? [])
                  .filter((a) => a.id !== adult?.id && a.status !== 'baja')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.lastName}, {a.firstName}
                      {a.totem ? ` («${a.totem}»)` : ''}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Notas" error={errors.notes?.message} full>
              <Textarea {...register('notes')} />
            </Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate(adult ? `/adultos/${adult.id}` : '/adultos')}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

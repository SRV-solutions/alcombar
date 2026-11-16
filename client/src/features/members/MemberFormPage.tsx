import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BRANCH_INFO, memberSchema, MEMBER_STATUS_LABELS, MEMBER_STATUSES, type Branch, type MemberInput } from '@shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors, toFormValues } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { MemberDetail } from '../../lib/types';
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Select, Textarea } from '../../components/ui';

const EMPTY: MemberInput = {
  firstName: '',
  lastName: '',
  dni: '',
  birthDate: '',
  unitId: '',
  smallGroupId: '',
  joinedAt: '',
  promiseDate: '',
  address: '',
  phone: '',
  email: '',
  status: 'activo',
  notes: '',
};

export function MemberFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { can, unitsWith } = useAuth();
  const units = useUnits();
  const existing = useQuery({ queryKey: ['member', id], queryFn: () => api.get<MemberDetail>(`/members/${id}`), enabled: isEdit });

  const form = useForm<MemberInput>({ resolver: zodResolver(memberSchema), defaultValues: EMPTY });
  const { register, handleSubmit, formState, reset, watch, setError, setValue } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (existing.data) {
      const m = existing.data;
      reset(
        toFormValues({
          firstName: m.firstName,
          lastName: m.lastName,
          dni: m.dni,
          birthDate: m.birthDate,
          unitId: m.unitId,
          smallGroupId: m.smallGroupId,
          joinedAt: m.joinedAt,
          promiseDate: m.promiseDate,
          address: m.address,
          phone: m.phone,
          email: m.email,
          status: m.status as MemberInput['status'],
          notes: m.notes,
        }) as MemberInput,
      );
    }
  }, [existing.data, reset]);

  // Unidad por defecto al crear: la del filtro o la única en la que puede crear
  const creatable = unitsWith('members', 'create');
  const pendingUnit = isEdit && !!existing.data && !existing.data.unitId;
  const allowedUnits = (units.data ?? []).filter((u) =>
    pendingUnit
      ? (!existing.data?.branch || u.branch === existing.data.branch) && can('members', 'edit', u.id)
      : isEdit || creatable === 'all' || creatable.includes(u.id),
  );
  useEffect(() => {
    if (isEdit || !units.data) return;
    const pre = params.get('unitId');
    if (pre && allowedUnits.some((u) => u.id === pre)) setValue('unitId', pre);
    else if (allowedUnits.length === 1) setValue('unitId', allowedUnits[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.data, isEdit]);

  const unitId = watch('unitId');
  const unit = units.data?.find((u) => u.id === unitId);
  const branch = unit ? BRANCH_INFO[unit.branch as Branch] : null;
  const canContacts = isEdit ? existing.data?.canEditContacts : can('member_contacts', 'edit', unitId || undefined);

  if (isEdit && existing.isLoading) return <Loading />;
  if (isEdit && existing.error) return <ErrorBox error={existing.error} />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await api.put(`/members/${id}`, values);
        toast.ok('Datos guardados');
        await qc.invalidateQueries({ queryKey: ['member', id] });
        await qc.invalidateQueries({ queryKey: ['members'] });
        navigate(`/protagonistas/${id}`);
      } else {
        const created = await api.post<{ id: string }>('/members', values);
        toast.ok('Protagonista dado/a de alta');
        await qc.invalidateQueries({ queryKey: ['members'] });
        await qc.invalidateQueries({ queryKey: ['units'] });
        navigate(`/protagonistas/${created.id}`);
      }
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(errorMessage(e));
    }
  });

  const title = isEdit && existing.data ? `${existing.data.firstName} ${existing.data.lastName}` : 'Nuevo protagonista';

  return (
    <>
      <PageHeader
        title={isEdit ? `Editar: ${title}` : title}
        crumbs={[
          { to: '/protagonistas', label: 'Protagonistas' },
          ...(isEdit ? [{ to: `/protagonistas/${id}`, label: title }] : []),
        ]}
      />
      <form onSubmit={onSubmit} noValidate>
        <div className="stack">
          <Card title="Datos personales">
            <div className="form-grid">
              <Field label="Apellido" required error={errors.lastName?.message}>
                <Input {...register('lastName')} invalid={!!errors.lastName} autoFocus={!isEdit} />
              </Field>
              <Field label="Nombre" required error={errors.firstName?.message}>
                <Input {...register('firstName')} invalid={!!errors.firstName} />
              </Field>
              <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
                <Input type="date" {...register('birthDate')} invalid={!!errors.birthDate} />
              </Field>
              <Field label="DNI" error={errors.dni?.message} hint="Sin puntos">
                <Input inputMode="numeric" {...register('dni')} invalid={!!errors.dni} />
              </Field>
            </div>
          </Card>

          <Card title="Unidad">
            <div className="form-grid">
              <Field
                label="Unidad"
                required
                error={errors.unitId?.message}
                hint={
                  pendingUnit ? 'Estaba por asignar: elegí su unidad.' : isEdit ? 'Para cambiar de unidad usá «Pase de unidad» en la ficha.' : undefined
                }
              >
                <Select {...register('unitId')} disabled={isEdit && !pendingUnit} invalid={!!errors.unitId}>
                  <option value="">Elegí una unidad</option>
                  {allowedUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={branch?.smallGroup.one ?? 'Pequeño grupo'} error={errors.smallGroupId?.message}>
                <Select {...register('smallGroupId')} disabled={!unit}>
                  <option value="">Sin asignar</option>
                  {unit?.smallGroups
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Fecha de ingreso al Grupo" error={errors.joinedAt?.message}>
                <Input type="date" {...register('joinedAt')} />
              </Field>
              <Field label="Fecha de Promesa" error={errors.promiseDate?.message}>
                <Input type="date" {...register('promiseDate')} />
              </Field>
              {isEdit ? (
                <Field label="Estado">
                  <Select {...register('status')}>
                    {MEMBER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {MEMBER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          </Card>

          {canContacts ? (
            <Card title="Contacto del protagonista">
              <p className="muted">Los responsables adultos se cargan desde la ficha, después de guardar.</p>
              <div className="form-grid">
                <Field label="Dirección" full>
                  <Input {...register('address')} />
                </Field>
                <Field label="Teléfono" hint="Útil en Caminantes y Rovers">
                  <Input type="tel" {...register('phone')} />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <Input type="email" {...register('email')} invalid={!!errors.email} />
                </Field>
              </div>
            </Card>
          ) : null}

          <Card title="Notas">
            <Field label="Observaciones" hint="No cargues datos de salud: la app solo registra si la documentación fue presentada.">
              <Textarea {...register('notes')} />
            </Field>
          </Card>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={formState.isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Dar de alta'}
          </Button>
        </div>
      </form>
    </>
  );
}

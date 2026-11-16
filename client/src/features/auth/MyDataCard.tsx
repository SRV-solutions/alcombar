import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { formatDate, profileSchema, type ProfileInput } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors, toFormValues } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Field, Input, Loading } from '../../components/ui';

interface MyProfile {
  name: string;
  email: string;
  hasPassword: boolean;
  adult: {
    id: string;
    firstName: string;
    lastName: string;
    totem: string | null;
    dni: string | null;
    birthDate: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
  } | null;
}

/** Mi perfil → Mis datos: cada persona ve y edita sus propios datos (y los de su ficha de adulto). */
export function MyDataCard() {
  const { me, can, refetch } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: () => api.get<MyProfile>('/auth/me/profile') });
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });
  const { register, handleSubmit, reset, setError, watch, formState } = form;
  const e = formState.errors;

  const fill = (p: MyProfile) =>
    reset({
      name: p.name,
      email: p.email,
      currentPassword: '',
      adult: p.adult
        ? (toFormValues({
            firstName: p.adult.firstName,
            lastName: p.adult.lastName,
            totem: p.adult.totem,
            dni: p.adult.dni,
            birthDate: p.adult.birthDate,
            phone: p.adult.phone,
            address: p.adult.address,
          }) as ProfileInput['adult'])
        : null,
    });
  useEffect(() => {
    if (profile.data) fill(profile.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  if (!me) return null;
  const p = profile.data;
  const emailChanged = !!p && (watch('email') ?? '').trim().toLowerCase() !== p.email;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.put('/auth/me/profile', values);
      toast.ok('Tus datos se guardaron');
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ['my-profile'] }), qc.invalidateQueries({ queryKey: ['adults'] })]);
      setEditing(false);
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });

  return (
    <Card
      title="Mis datos"
      actions={
        !editing && p ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil /> Editar
          </Button>
        ) : null
      }
    >
      {profile.isLoading || !p ? (
        <Loading />
      ) : editing ? (
        <form onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            <Field label="Nombre para mostrar" required error={e.name?.message} full>
              <Input {...register('name')} invalid={!!e.name} />
            </Field>
            <Field label="Email (con el que entrás)" required error={e.email?.message} full>
              <Input type="email" autoComplete="email" {...register('email')} invalid={!!e.email} />
            </Field>
            {emailChanged && p.hasPassword ? (
              <Field label="Tu contraseña actual" required error={e.currentPassword?.message} hint="Para cambiar el email te pedimos la contraseña." full>
                <Input type="password" autoComplete="current-password" {...register('currentPassword')} invalid={!!e.currentPassword} />
              </Field>
            ) : null}
            {p.adult ? (
              <>
                <Field label="Nombre" required error={e.adult?.firstName?.message}>
                  <Input {...register('adult.firstName')} invalid={!!e.adult?.firstName} />
                </Field>
                <Field label="Apellido" required error={e.adult?.lastName?.message}>
                  <Input {...register('adult.lastName')} invalid={!!e.adult?.lastName} />
                </Field>
                <Field label="Tótem" error={e.adult?.totem?.message}>
                  <Input {...register('adult.totem')} />
                </Field>
                <Field label="DNI" error={e.adult?.dni?.message} hint="Sin puntos">
                  <Input inputMode="numeric" {...register('adult.dni')} invalid={!!e.adult?.dni} />
                </Field>
                <Field label="Fecha de nacimiento" error={e.adult?.birthDate?.message}>
                  <Input type="date" {...register('adult.birthDate')} invalid={!!e.adult?.birthDate} />
                </Field>
                <Field label="Teléfono" error={e.adult?.phone?.message}>
                  <Input type="tel" autoComplete="tel" {...register('adult.phone')} />
                </Field>
                <Field label="Dirección" error={e.adult?.address?.message} full>
                  <Input autoComplete="street-address" {...register('adult.address')} />
                </Field>
              </>
            ) : null}
          </div>
          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => {
                fill(p);
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      ) : (
        <dl className="dl">
          <dt>Nombre</dt>
          <dd>{p.name}</dd>
          <dt>Email</dt>
          <dd>{p.email}</dd>
          {p.adult ? (
            <>
              <dt>Tótem</dt>
              <dd>{p.adult.totem ?? <span className="muted">—</span>}</dd>
              <dt>DNI</dt>
              <dd>{p.adult.dni ?? <span className="muted">—</span>}</dd>
              <dt>Nacimiento</dt>
              <dd>{formatDate(p.adult.birthDate) || <span className="muted">—</span>}</dd>
              <dt>Teléfono</dt>
              <dd>{p.adult.phone ?? <span className="muted">—</span>}</dd>
              <dt>Dirección</dt>
              <dd>{p.adult.address ?? <span className="muted">—</span>}</dd>
            </>
          ) : null}
          <dt>Roles</dt>
          <dd>
            {me.roles.length ? (
              <div className="row" style={{ gap: 4 }}>
                {me.roles.map((r, i) => (
                  <Badge key={i} tone={r.name === 'Superadmin' ? 'bordo' : 'neutral'}>
                    {r.name}
                    {r.unit ? ` · ${r.unit.name}` : ''}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="muted">Sin roles asignados</span>
            )}
          </dd>
          <dt>Ficha de adulto</dt>
          <dd>
            {p.adult ? (
              can('adults', 'view') ? (
                <Link to={`/adultos/${p.adult.id}`}>Ver mi ficha (cargos y formación)</Link>
              ) : (
                'Vinculada'
              )
            ) : (
              <span className="muted">Sin vincular: pedile a un superadmin que la vincule desde Usuarios.</span>
            )}
          </dd>
        </dl>
      )}
    </Card>
  );
}

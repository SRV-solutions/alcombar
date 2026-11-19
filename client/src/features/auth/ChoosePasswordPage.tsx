import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePasswordSchema } from '@shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { Button, Field, PasswordInput } from '../../components/ui';
import { AuthShell } from './LoginPage';
import { takeLoginPassword } from './loginMemo';

const schema = changePasswordSchema
  .extend({ confirm: z.string().min(1, 'Requerido') })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

interface FormValues {
  currentPassword: string;
  password: string;
  confirm: string;
}

/**
 * Primer ingreso con la contraseña que le dictó su educador: antes de usar la app tiene que elegir la suya.
 * Si acaba de escribir la provisoria en el ingreso, no se la volvemos a pedir.
 */
export function ChoosePasswordPage() {
  const { me, refetch, logout } = useAuth();
  const [typed] = useState(() => takeLoginPassword());
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: typed ?? '', password: '', confirm: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api.post('/auth/change-password', { currentPassword: values.currentPassword, password: values.password });
      await refetch();
    } catch (e) {
      if (!applyServerErrors(e, setFieldError)) setError(errorMessage(e));
    }
  });

  return (
    <AuthShell subtitle={me ? `Hola, ${me.user.name.split(' ')[0]}` : undefined}>
      <form onSubmit={onSubmit} noValidate>
        <div className="alert alert-info" style={{ margin: 0 }}>
          Entraste con una contraseña provisoria. Elegí la tuya para empezar: no la va a saber nadie más.
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {typed ? null : (
          <Field label="La contraseña que te dieron" required error={errors.currentPassword?.message}>
            <PasswordInput autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
          </Field>
        )}
        <Field label="Tu contraseña nueva" required error={errors.password?.message ?? errors.currentPassword?.message} hint="Mínimo 10 caracteres. Una frase corta sirve y es fácil de recordar.">
          <PasswordInput autoComplete="new-password" autoFocus invalid={!!errors.password} {...register('password')} />
        </Field>
        <Field label="Repetila" required error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} />
        </Field>
        <Button type="submit" loading={isSubmitting} style={{ width: '100%', padding: '10px' }}>
          Guardar y entrar
        </Button>
        <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Field, Input, Loading } from '../../components/ui';
import { AuthShell } from './LoginPage';

interface TokenInfo {
  valid: boolean;
  purpose?: 'invite' | 'reset';
  email?: string;
  name?: string;
}

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const info = useQuery({ queryKey: ['token', token], queryFn: () => api.get<TokenInfo>(`/auth/token/${encodeURIComponent(token)}`), enabled: !!token });
  const { register, handleSubmit, formState, watch } = useForm<{ password: string; repeat: string }>();

  if (!token) {
    return (
      <AuthShell>
        <div className="alert alert-error">Falta el enlace. Pedile uno nuevo a quien administra la app.</div>
      </AuthShell>
    );
  }
  if (info.isLoading) return <AuthShell><Loading /></AuthShell>;
  if (!info.data?.valid) {
    return (
      <AuthShell>
        <div className="stack">
          <div className="alert alert-error">El enlace venció o ya se usó.</div>
          <p>
            Si ya tenías contraseña, podés <Link to="/olvide-clave">pedir un enlace nuevo</Link>. Si es tu primer ingreso, pedile a un superadmin que te
            genere otra invitación.
          </p>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.post('/auth/set-password', { token, password: v.password });
      await refetch();
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell subtitle={info.data.purpose === 'invite' ? 'Bienvenida/o' : 'Restablecer contraseña'}>
      <form onSubmit={onSubmit} noValidate>
        <p style={{ margin: 0 }}>
          Hola <strong>{info.data.name}</strong>. Elegí una contraseña para <strong>{info.data.email}</strong>.
        </p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <Field label="Nueva contraseña" error={formState.errors.password?.message} hint="Mínimo 10 caracteres. Una frase corta es fácil de recordar y segura.">
          <Input
            type="password"
            autoComplete="new-password"
            autoFocus
            invalid={!!formState.errors.password}
            {...register('password', { required: 'Requerido', minLength: { value: 10, message: 'Mínimo 10 caracteres' } })}
          />
        </Field>
        <Field label="Repetir contraseña" error={formState.errors.repeat?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            invalid={!!formState.errors.repeat}
            {...register('repeat', { validate: (v) => v === watch('password') || 'Las contraseñas no coinciden' })}
          />
        </Field>
        <Button type="submit" loading={formState.isSubmitting} style={{ width: '100%', padding: 10 }}>
          Guardar e ingresar
        </Button>
      </form>
    </AuthShell>
  );
}

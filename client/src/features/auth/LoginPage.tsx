import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@shared';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Field, Input, PasswordInput } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { PoweredBySrv } from '../../components/PoweredBy';

export function AuthShell({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <Logo />
          <div>
            <div className="brand-name">ALCOMBAR Gestión</div>
            <div className="brand-sub">{subtitle ?? 'Grupo Scout 155 Divina Providencia'}</div>
          </div>
        </div>
        {children}
        <div className="auth-powered">
          <PoweredBySrv variant="auth" />
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { me, refetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (me) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api.post('/auth/login', values);
      await refetch();
      navigate(from, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell>
      <form onSubmit={onSubmit} noValidate>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="username" autoFocus {...register('email')} invalid={!!formState.errors.email} />
        </Field>
        <Field label="Contraseña" error={formState.errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register('password')} invalid={!!formState.errors.password} />
        </Field>
        <Button type="submit" loading={formState.isSubmitting} style={{ width: '100%', padding: '10px' }}>
          Ingresar
        </Button>
        <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          <Link to="/olvide-clave">¿Olvidaste tu contraseña?</Link>
        </div>
        <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
          No hay registro público: las cuentas las crea un superadmin del Grupo.
        </p>
      </form>
    </AuthShell>
  );
}

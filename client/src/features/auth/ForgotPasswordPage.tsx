import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema } from '@shared';
import { api, errorMessage } from '../../lib/api';
import { Button, Field, Input } from '../../components/ui';
import { AuthShell } from './LoginPage';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.post('/auth/forgot', v);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell subtitle="Recuperar contraseña">
      {sent ? (
        <div className="stack">
          <div className="alert alert-ok">Si el email está registrado, te enviamos un enlace para restablecer la contraseña. Vence en 60 minutos.</div>
          <p className="muted">
            Revisá también la carpeta de spam. Si no te llega, pedile el enlace a un superadmin (lo genera desde Usuarios).
          </p>
          <Link to="/login">Volver al ingreso</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <Field label="Tu email" error={formState.errors.email?.message}>
            <Input type="email" autoFocus {...register('email')} invalid={!!formState.errors.email} />
          </Field>
          <Button type="submit" loading={formState.isSubmitting} style={{ width: '100%', padding: 10 }}>
            Enviar enlace
          </Button>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">Volver al ingreso</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

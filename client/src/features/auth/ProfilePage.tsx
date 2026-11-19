import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Smartphone } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePasswordSchema } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Button, Card, Field, Input, PageHeader, PasswordInput } from '../../components/ui';
import { ThemeToggle } from '../../components/ThemeToggle';
import { OpenOnPhoneDialog } from '../../components/OpenOnPhone';
import { TutorialsCard } from '../../tutorials/TutorialsCard';
import { MyDataCard } from './MyDataCard';
import { EmailVerifyCard } from './EmailVerifyCard';

const schema = changePasswordSchema
  .extend({ confirm: z.string().min(1, 'Requerido') })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

interface FormValues {
  currentPassword: string;
  password: string;
  confirm: string;
}

/** Mi perfil: datos, apariencia (modo oscuro), tutoriales de Luisito y cambio de contraseña. */
export function ProfilePage() {
  const { me } = useAuth();
  const [phoneOpen, setPhoneOpen] = useState(false);
  // Desde la ayuda (/perfil#celular) se baja directo a esta parte
  useEffect(() => {
    if (window.location.hash !== '#celular') return;
    const t = setTimeout(() => document.getElementById('celular')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    return () => clearTimeout(t);
  }, []);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/auth/change-password', { currentPassword: values.currentPassword, password: values.password });
      toast.ok('Contraseña actualizada. Se cerraron tus sesiones en otros dispositivos.');
      reset();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  });

  if (!me) return null;

  return (
    <>
      <PageHeader
        title="Mi perfil"
        sub={me.user.memberId ? 'Tu mail, la apariencia de la app, tus tutoriales y tu contraseña.' : 'Tus datos (los podés editar), la apariencia de la app, tus tutoriales y tu contraseña.'}
      />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* La cuenta de un rover: sus datos los lleva su ficha; acá carga y confirma su mail */}
        {me.user.memberId ? <EmailVerifyCard /> : <MyDataCard />}

        <Card title="Apariencia">
          <p className="muted" style={{ marginTop: 0 }}>
            Elegí el tema de la app. "Como el sistema" sigue la configuración de tu celular o tu compu.
          </p>
          <ThemeToggle />
        </Card>
      </div>

      <div className="mt">
        <TutorialsCard />
      </div>

      <div className="mt" id="celular">
        <Card title="ALCOMBAR en tu celular">
          <p className="muted" style={{ marginTop: 0 }}>
            Escaneá un código QR con el celular y se abre la app con tu sesión iniciada, sin escribir la contraseña. Después la podés
            agregar a la pantalla de inicio para usarla como una app.
          </p>
          <Button onClick={() => setPhoneOpen(true)}>
            <Smartphone /> Mostrar el código QR
          </Button>
          {phoneOpen ? <OpenOnPhoneDialog onClose={() => setPhoneOpen(false)} /> : null}
        </Card>
      </div>

      <div className="grid grid-2 mt" style={{ alignItems: 'start' }}>
        <Card title="Cambiar contraseña">
          <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Contraseña actual" required error={errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
            </Field>
            <Field label="Contraseña nueva" required error={errors.password?.message} hint="Mínimo 10 caracteres">
              <PasswordInput autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
            </Field>
            <Field label="Repetir contraseña nueva" required error={errors.confirm?.message}>
              <PasswordInput autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} />
            </Field>
            <div className="form-actions" style={{ marginTop: 4 }}>
              <Button type="submit" loading={isSubmitting}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

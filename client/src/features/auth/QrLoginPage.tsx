import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { Loading } from '../../components/ui';
import { AuthShell } from './LoginPage';

/** Lo que abre el celular al escanear el QR de "Abrir en el celular": inicia sesión con el código y entra a la app. */
export function QrLoginPage() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // en desarrollo React monta dos veces: el código sirve una sola vez
    started.current = true;
    const token = params.get('token') ?? '';
    // El código no queda en la barra de direcciones ni en el historial
    window.history.replaceState(null, '', '/qr');
    if (!token) {
      setError('Falta el código. Escaneá de nuevo el QR desde la computadora.');
      return;
    }
    api
      .post('/auth/qr-login', { token })
      .then(() => window.location.replace('/'))
      .catch((e) => setError(errorMessage(e)));
  }, [params]);

  return (
    <AuthShell subtitle="Entrar desde el celular">
      {error ? (
        <>
          <div className="alert alert-error">{error}</div>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Ingresar con email y contraseña
          </Link>
        </>
      ) : (
        <>
          <Loading />
          <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
            Iniciando sesión…
          </p>
        </>
      )}
    </AuthShell>
  );
}

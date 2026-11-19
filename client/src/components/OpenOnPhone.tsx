import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Button, Modal } from './ui';

interface QrCode {
  id: string;
  token: string;
  expiresAt: string;
  minutes: number;
}

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * "Abrir en el celular": muestra un código QR de un solo uso. Al escanearlo con el celu se abre ALCONBAR con la
 * sesión iniciada. Vence en pocos minutos; la compu avisa cuando se usó.
 */
export function OpenOnPhoneDialog({ onClose }: { onClose: () => void }) {
  const [qr, setQr] = useState<(QrCode & { receivedAt: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api.post<QrCode>('/auth/qr');
      setQr({ ...c, receivedAt: Date.now() });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void generate();
  }, [generate]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Se cuenta con el reloj de esta compu desde que llegó el código (por si la hora del servidor difiere)
  const remaining = qr ? Math.max(0, qr.minutes * 60_000 - (now - qr.receivedAt)) : 0;
  const status = useQuery({
    queryKey: ['qr-login', qr?.id],
    queryFn: () => api.get<{ used: boolean; expired: boolean }>(`/auth/qr/${qr!.id}`),
    enabled: !!qr && remaining > 0,
    refetchInterval: (q) => (q.state.data?.used ? false : 2000),
  });
  const used = !!status.data?.used;
  const expired = !!qr && !used && (remaining === 0 || !!status.data?.expired);
  const url = qr ? `${window.location.origin}/qr?token=${encodeURIComponent(qr.token)}` : '';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

  return (
    <Modal
      title="Abrir ALCONBAR en el celular"
      onClose={onClose}
      footer={
        <>
          {!used ? (
            <Button variant="secondary" onClick={() => void generate()} loading={busy}>
              <RefreshCw /> Generar otro código
            </Button>
          ) : null}
          <Button onClick={onClose}>{used ? 'Listo' : 'Cerrar'}</Button>
        </>
      }
    >
      <div className="open-phone">
        {error ? <div className="alert alert-error">{error}</div> : null}
        {isLocal ? (
          <div className="alert alert-warn">
            Estás en la versión local de la compu: el celular no puede abrir <strong>localhost</strong>. Usá este código desde la app publicada.
          </div>
        ) : null}

        {used ? (
          <div className="open-phone-done">
            <CheckCircle2 />
            <strong>¡Listo! Ya entraste desde el celular.</strong>
            <span className="muted">Si no fuiste vos, cambiá tu contraseña: se cierran las demás sesiones.</span>
          </div>
        ) : expired ? (
          <div className="open-phone-done">
            <span className="muted">El código venció. Generá otro para escanearlo.</span>
            <Button onClick={() => void generate()} loading={busy}>
              <RefreshCw /> Generar otro código
            </Button>
          </div>
        ) : qr ? (
          <div className="open-phone-qr">
            <div className="open-phone-code" aria-label="Código QR para abrir la app en el celular">
              <QRCodeSVG value={url} size={220} level="M" marginSize={2} bgColor="#ffffff" fgColor="#1b1412" />
            </div>
            <div className="muted">
              Vence en <strong>{mmss(remaining)}</strong> · sirve una sola vez
            </div>
          </div>
        ) : (
          <p className="muted">Generando el código…</p>
        )}

        <ol className="open-phone-steps">
          <li>Abrí la cámara del celular y apuntá al código.</li>
          <li>Tocá el enlace que aparece: se abre ALCONBAR con tu sesión iniciada, sin escribir la contraseña.</li>
          <li>
            Para tenerla como una app: en Android, menú <strong>⋮</strong> → <em>Agregar a la pantalla principal</em>. En iPhone (Safari),{' '}
            <strong>Compartir</strong> → <em>Agregar a inicio</em> (ahí te pide entrar una vez con tu email y contraseña).
          </li>
        </ol>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          No compartas ni le saques foto al código: abre la app con tu usuario.
        </p>
      </div>
    </Modal>
  );
}

/** Botón del menú (solo en la compu: en el celular no tiene sentido). */
export function OpenOnPhoneButton({ className = 'btn btn-ghost btn-sm', label = 'Abrir en el celular' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${className} open-phone-btn`} onClick={() => setOpen(true)}>
        <Smartphone /> {label}
      </button>
      {open ? <OpenOnPhoneDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

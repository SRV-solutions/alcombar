import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, FileText, Mountain, Repeat, ScrollText, UserRoundCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import './notifications.css';

interface NotificationItem {
  id: string;
  kind: 'cruz_del_sur' | 'ficha' | 'campamento' | string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const KIND_ICON: Record<string, JSX.Element> = {
  cruz_del_sur: <UserRoundCheck />,
  ficha: <FileText />,
  campamento: <Mountain />,
  servicio: <Repeat />,
  consejo: <ScrollText />,
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'ayer' : `hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-AR');
}

/** Campanita de avisos: altas y bajas para Cruz del Sur, fichas y campamentos de la rama de cada referente. */
export function NotificationBell({ compact }: { compact?: boolean }) {
  const { me } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const count = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get<{ unread: number }>('/notifications/count'),
    enabled: !!me,
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: NotificationItem[]; unread: number }>('/notifications'),
    enabled: !!me && open,
  });
  const unread = count.data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    void qc.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.readAt) await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    refresh();
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api.post('/notifications/read-all').catch(() => undefined);
    refresh();
  };

  if (!me) return null;
  return (
    <div className={`nbell ${compact ? 'nbell-compact' : ''}`} ref={box}>
      <button
        type="button"
        className="btn btn-ghost btn-icon nbell-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        aria-label={unread ? `Avisos: ${unread} sin leer` : 'Avisos'}
        aria-expanded={open}
        title="Avisos"
      >
        <Bell />
        {unread ? <span className="nbell-count">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="nbell-menu" role="dialog" aria-label="Avisos">
          <div className="nbell-head">
            <strong>Avisos</strong>
            {unread ? (
              <button type="button" className="link-btn" onClick={() => void readAll()}>
                <CheckCheck /> Marcar todo como leído
              </button>
            ) : null}
          </div>
          {list.isLoading ? (
            <div className="nbell-empty">Cargando…</div>
          ) : !list.data?.items.length ? (
            <div className="nbell-empty">
              No tenés avisos. Acá te llegan los cambios de servicio de tu unidad, el temario de cada Consejo y, según tu función, las altas y
              bajas para Cruz del Sur o las fichas y campamentos de tu rama.
            </div>
          ) : (
            <ul className="nbell-list">
              {list.data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`nbell-item ${n.readAt ? '' : 'unread'}`} onClick={() => void openItem(n)}>
                    <span className="nbell-icon">{KIND_ICON[n.kind] ?? <Bell />}</span>
                    <span className="nbell-body">
                      <span className="nbell-title">{n.title}</span>
                      {n.body ? <span className="nbell-text">{n.body}</span> : null}
                      <span className="nbell-time">{timeAgo(n.createdAt)}</span>
                    </span>
                    {n.readAt ? null : <span className="nbell-dot" aria-label="Sin leer" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="nbell-foot">Los avisos también llegan por mail.</div>
        </div>
      ) : null}
    </div>
  );
}

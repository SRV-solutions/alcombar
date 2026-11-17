import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ClipboardCheck, Coins, PackageX } from 'lucide-react';
import { CALENDAR_TYPE_LABELS, formatMoney, todayIso, type CalendarType } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Card } from '../../components/ui';

interface CalItem {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  type: string;
  unit: { code: string } | null;
  link: string | null;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (start: string) =>
  new Date(`${start.slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

/** Próximas fechas del calendario (30 días), incluidas las que aportan campamentos, eventos y fichas. */
export function UpcomingCard() {
  const { can } = useAuth();
  const from = todayIso();
  const q = useQuery({
    queryKey: ['calendar', 'proximas', from],
    queryFn: () => api.get<{ items: CalItem[] }>(`/calendar?from=${from}&to=${addDays(from, 30)}`),
    enabled: can('calendar', 'view'),
  });
  if (!can('calendar', 'view')) return null;
  const items = (q.data?.items ?? []).filter((i) => i.start.slice(0, 10) >= from).slice(0, 7);
  return (
    <Card
      title={
        <h2 className="row" style={{ gap: 8 }}>
          <CalendarDays size={18} color="var(--bordo)" /> Próximas fechas
        </h2>
      }
      actions={<Link to="/calendario">Ver calendario</Link>}
    >
      {q.isLoading ? (
        <p className="muted">Cargando…</p>
      ) : items.length ? (
        <ul className="list-plain">
          {items.map((i) => {
            const label = (
              <>
                {i.title}
                {i.unit ? <span className="muted"> · {i.unit.code}</span> : null}
              </>
            );
            return (
              <li key={`${i.type}-${i.id}`} className="row between" style={{ gap: 12 }}>
                <span>{i.link ? <Link to={i.link}>{label}</Link> : label}</span>
                <span className="muted nowrap">
                  {dayLabel(i.start)}
                  {!i.allDay && i.start.length > 10 ? ` ${i.start.slice(11, 16)}` : ''} · {CALENDAR_TYPE_LABELS[i.type as CalendarType] ?? i.type}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No hay fechas cargadas para los próximos 30 días.</p>
      )}
    </Card>
  );
}

/** Lo que espera una acción: fichas para aprobar, préstamos vencidos, bienes en mal estado… */
export function PendingCard() {
  const { can } = useAuth();
  const approver = can('activities', 'approve');
  const inventory = can('inventory', 'view');
  const sheets = useQuery({
    queryKey: ['program-sheets', 'en_revision', 'inicio'],
    queryFn: () => api.get<unknown[]>('/program/sheets?status=en_revision'),
    enabled: approver,
  });
  const alerts = useQuery({
    queryKey: ['inventory', 'alerts', 'inicio'],
    queryFn: () => api.get<{ overdueLoans: unknown[]; badItems: unknown[] }>('/inventory/alerts'),
    enabled: inventory,
  });
  const debtors = useQuery({
    queryKey: ['fees', 'debtors', 'inicio'],
    queryFn: () => api.get<{ rows: { overdue: number }[]; totals: { pending: number; overdue: number } }>('/accounting/fees/debtors'),
    enabled: can('fees', 'view'),
  });

  const rows: { key: string; icon: ReactNode; text: string; to: string; tone?: string }[] = [];
  const late = debtors.data?.rows.filter((r) => r.overdue > 0).length ?? 0;
  if (late)
    rows.push({
      key: 'cuotas',
      icon: <Coins size={16} />,
      text: `${late} protagonista${late === 1 ? '' : 's'} con pagos vencidos (${formatMoney(debtors.data!.totals.overdue)})`,
      to: '/contabilidad/cuotas',
      tone: 'var(--warn)',
    });
  if (sheets.data?.length)
    rows.push({ key: 'fichas', icon: <ClipboardCheck size={16} />, text: `${sheets.data.length} ficha${sheets.data.length === 1 ? '' : 's'} de actividad para revisar`, to: '/programa' });
  if (alerts.data?.overdueLoans.length)
    rows.push({
      key: 'prestamos',
      icon: <AlertTriangle size={16} />,
      text: `${alerts.data.overdueLoans.length} préstamo${alerts.data.overdueLoans.length === 1 ? '' : 's'} vencido${alerts.data.overdueLoans.length === 1 ? '' : 's'}`,
      to: '/inventario/prestamos',
      tone: 'var(--danger)',
    });
  if (alerts.data?.badItems.length)
    rows.push({
      key: 'bienes',
      icon: <PackageX size={16} />,
      text: `${alerts.data.badItems.length} bien${alerts.data.badItems.length === 1 ? '' : 'es'} en mal estado o para reparar`,
      to: '/inventario',
      tone: 'var(--warn)',
    });
  if (!rows.length) return null;
  return (
    <Card title="Pendientes">
      <ul className="list-plain">
        {rows.map((r) => (
          <li key={r.key}>
            <Link to={r.to} className="row" style={{ gap: 8, color: r.tone }}>
              {r.icon} {r.text}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

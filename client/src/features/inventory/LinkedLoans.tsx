import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { formatDate, type LoanInput } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Badge, Button, Card } from '../../components/ui';
import { LoanDialog } from './LoanDialog';
import { LOAN_TONE, loanLabel, type Loan } from './types';

/**
 * Materiales prestados para una ficha de actividad o un campamento. Se muestra solo a quien ve el inventario;
 * con permiso de pedir préstamos, deja pedir materiales ya vinculados.
 */
export function LinkedLoansCard({ link, defaults }: { link: { activitySheetId: string } | { campId: string }; defaults: Partial<LoanInput> }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const canView = can('inventory', 'view');
  const qs = 'activitySheetId' in link ? `activitySheetId=${link.activitySheetId}` : `campId=${link.campId}`;
  const q = useQuery({ queryKey: ['inventory', 'loans', 'vinculados', qs], queryFn: () => api.get<Loan[]>(`/inventory/loans?status=todos&${qs}`), enabled: canView });
  if (!canView) return null;
  const loans = q.data ?? [];
  return (
    <Card
      title="Materiales prestados"
      actions={
        can('inventory', 'create') ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus /> Pedir materiales
          </Button>
        ) : null
      }
    >
      {q.isLoading ? (
        <p className="muted">Cargando…</p>
      ) : !loans.length ? (
        <p className="muted">
          <Package style={{ width: 16, height: 16, verticalAlign: 'text-bottom' }} /> No hay préstamos de inventario vinculados.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {loans.map((l) => (
            <li key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <Link to={`/inventario/prestamos/${l.id}`}>
                <strong>{l.loanItems.map((li) => `${li.quantity} × ${li.item?.name ?? 'Bien'}`).join(', ')}</strong>
              </Link>{' '}
              <Badge tone={l.overdue ? 'danger' : LOAN_TONE[l.status]}>{l.overdue ? 'Vencido' : loanLabel(l.status)}</Badge>
              <div className="muted">
                {l.borrowerLabel ?? ''} · {formatDate(l.outDate)} → {formatDate(l.dueDate)}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open ? <LoanDialog defaults={defaults} onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

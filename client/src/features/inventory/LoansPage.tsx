import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HandHelping, Plus, Search } from 'lucide-react';
import { formatDate } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Badge, Button, Card, Empty, ErrorBox, Input, Loading, PageHeader, UnitBadge } from '../../components/ui';
import { InventoryTabs } from './InventoryTabs';
import { InventoryAlerts } from './ItemsPage';
import { LoanDialog } from './LoanDialog';
import { LOAN_TONE, loanItemsSummary, loanLabel, type Loan } from './types';
import './inventory.css';

const FILTERS = [
  { key: 'activos', label: 'Activos' },
  { key: 'pedido', label: 'Pedidos' },
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'devuelto', label: 'Devueltos' },
  { key: 'todos', label: 'Todos' },
] as const;

export function LoansPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('estado') ?? 'activos';
  const [q, setQ] = useState('');
  const [newLoan, setNewLoan] = useState<{ itemId?: string } | null>(null);
  const loans = useQuery({ queryKey: ['inventory', 'loans', status, q], queryFn: () => api.get<Loan[]>(`/inventory/loans${qs({ status, q })}`) });

  // /inventario/prestamos?nuevo=<id del bien> abre el pedido con ese bien (botón "Prestar" de la ficha del bien)
  useEffect(() => {
    const itemId = params.get('nuevo');
    if (itemId) {
      setNewLoan({ itemId });
      const n = new URLSearchParams(params);
      n.delete('nuevo');
      setParams(n, { replace: true });
    }
  }, [params, setParams]);

  return (
    <>
      <PageHeader
        title="Préstamos"
        sub="Quién retiró qué, para qué y cuándo lo devuelve. Los pedidos los autoriza Intendencia."
        actions={
          can('inventory', 'view') ? (
            <Button onClick={() => setNewLoan({})}>
              <Plus /> Nuevo préstamo
            </Button>
          ) : null
        }
      />
      <InventoryTabs value="prestamos" />
      <InventoryAlerts />

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Estado de los préstamos">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={status === f.key}
              className={status === f.key ? 'on' : ''}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set('estado', f.key);
                setParams(n, { replace: true });
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar por para qué o quién retira" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
      </div>

      <Card bodyClass="table-wrap">
        {loans.isLoading ? (
          <Loading />
        ) : loans.error ? (
          <div className="card-body">
            <ErrorBox error={loans.error} />
          </div>
        ) : !loans.data?.length ? (
          <Empty icon={<HandHelping />}>No hay préstamos {status === 'todos' ? 'cargados' : `en «${FILTERS.find((f) => f.key === status)?.label}»`}.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Retira</th>
                <th>Para qué</th>
                <th>Bienes</th>
                <th>Retiro</th>
                <th>Devolución</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loans.data.map((l) => (
                <tr key={l.id} className="clickable" onClick={() => navigate(`/inventario/prestamos/${l.id}`)}>
                  <td>
                    <strong>{l.borrowerLabel ?? '—'}</strong>
                    {l.unit ? (
                      <div>
                        <UnitBadge unit={l.unit} short />
                      </div>
                    ) : null}
                  </td>
                  <td>{l.purpose}</td>
                  <td>{loanItemsSummary(l)}</td>
                  <td className="nowrap">{formatDate(l.outDate)}</td>
                  <td className="nowrap">{l.returnedAt ? formatDate(l.returnedAt) : <span className={l.overdue ? 'inv-qty-zero' : ''}>{formatDate(l.dueDate)}</span>}</td>
                  <td>
                    <Badge tone={l.overdue ? 'danger' : LOAN_TONE[l.status]}>{l.overdue ? `Vencido (${loanLabel(l.status).toLowerCase()})` : loanLabel(l.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {newLoan ? (
        <LoanDialog initialItemId={newLoan.itemId} onClose={() => setNewLoan(null)} onSaved={(id) => navigate(`/inventario/prestamos/${id}`)} />
      ) : null}
    </>
  );
}

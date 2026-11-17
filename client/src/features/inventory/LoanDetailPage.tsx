import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, PackageCheck, PackageOpen, Pencil, Printer, XCircle } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, ErrorBox, Loading, PageHeader, UnitBadge } from '../../components/ui';
import { LoanDialog, ReturnDialog } from './LoanDialog';
import { conditionLabel, LOAN_TONE, loanLabel, type Loan } from './types';
import './inventory.css';

const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export function LoanDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<'edit' | 'return' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['inventory', 'loan', id], queryFn: () => api.get<Loan>(`/inventory/loans/${id}`) });

  const act = async (action: 'authorize' | 'deliver', ok: string) => {
    setBusy(action);
    try {
      await api.post(`/inventory/loans/${id}/${action}`);
      toast.ok(ok);
      await qc.invalidateQueries({ queryKey: ['inventory'] });
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const l = q.data!;
  const dash = <span className="muted">—</span>;
  const out = l.status === 'autorizado' || l.status === 'entregado';

  return (
    <>
      <div className="print-only print-head">
        <strong>Grupo Scout 155 Divina Providencia · Comprobante de préstamo de materiales</strong>
      </div>
      <PageHeader
        crumbs={[
          { to: '/inventario', label: 'Inventario' },
          { to: '/inventario/prestamos', label: 'Préstamos' },
        ]}
        title={`Préstamo · ${l.borrowerLabel ?? 'sin nombre'}`}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <Badge tone={LOAN_TONE[l.status]}>{loanLabel(l.status)}</Badge>
            {l.overdue ? <Badge tone="danger">Vencido</Badge> : null}
            <span>{l.purpose}</span>
          </span>
        }
        actions={
          <>
            {l.canManage && l.status === 'pedido' ? (
              <Button onClick={() => act('authorize', 'Préstamo autorizado')} loading={busy === 'authorize'}>
                <CheckCircle2 /> Autorizar
              </Button>
            ) : null}
            {l.canManage && (l.status === 'pedido' || l.status === 'autorizado') ? (
              <Button variant={l.status === 'pedido' ? 'secondary' : 'primary'} onClick={() => act('deliver', 'Entrega registrada')} loading={busy === 'deliver'}>
                <PackageOpen /> Entregar
              </Button>
            ) : null}
            {l.canManage && out ? (
              <Button onClick={() => setDialog('return')}>
                <PackageCheck /> Registrar devolución
              </Button>
            ) : null}
            {l.canEdit ? (
              <Button variant="secondary" onClick={() => setDialog('edit')}>
                <Pencil /> Editar
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
            {l.canCancel ? (
              <ConfirmButton
                title="Cancelar préstamo"
                message="¿Cancelar este préstamo? Los bienes vuelven a quedar disponibles."
                confirmLabel="Cancelar préstamo"
                onConfirm={async () => {
                  try {
                    await api.post(`/inventory/loans/${l.id}/cancel`);
                    toast.ok('Préstamo cancelado');
                    await qc.invalidateQueries({ queryKey: ['inventory'] });
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <XCircle /> Cancelar
              </ConfirmButton>
            ) : null}
          </>
        }
      />
      {l.status === 'pedido' && !l.canManage ? (
        <div className="alert alert-info mb no-print">Pedido enviado: lo autoriza Intendencia (o quien gestiona el inventario de esa unidad).</div>
      ) : null}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Datos">
          <dl className="dl">
            <dt>Retira</dt>
            <dd>
              {l.borrower ? (
                <Link to={`/adultos/${l.borrower.id}`}>
                  {l.borrower.firstName} {l.borrower.lastName}
                </Link>
              ) : (
                (l.borrowerName ?? dash)
              )}
            </dd>
            <dt>Para qué</dt>
            <dd>{l.purpose}</dd>
            <dt>Unidad</dt>
            <dd>{l.unit ? <UnitBadge unit={l.unit} /> : 'Grupo'}</dd>
            <dt>Retiro</dt>
            <dd>{formatDate(l.outDate)}</dd>
            <dt>Devolución prevista</dt>
            <dd className={l.overdue ? 'inv-qty-zero' : ''}>{formatDate(l.dueDate)}</dd>
            <dt>Devuelto</dt>
            <dd>{l.returnedAt ? formatDate(l.returnedAt) : dash}</dd>
          </dl>
        </Card>
        <Card title="Seguimiento">
          <dl className="dl">
            <dt>Pedido por</dt>
            <dd>
              {l.createdBy?.name ?? dash} <span className="muted">{dateTime(l.createdAt)}</span>
            </dd>
            <dt>Autorizado por</dt>
            <dd>
              {l.approvedBy?.name ?? dash} <span className="muted">{dateTime(l.approvedAt)}</span>
            </dd>
            <dt>Entregado</dt>
            <dd>{l.deliveredAt ? dateTime(l.deliveredAt) : dash}</dd>
            <dt>Notas</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{l.notes ?? dash}</dd>
            {l.returnNotes ? (
              <>
                <dt>Notas de devolución</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{l.returnNotes}</dd>
              </>
            ) : null}
          </dl>
        </Card>
      </div>

      <div className="mt">
        <Card title="Bienes" bodyClass="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="num">Cant.</th>
                <th>Bien</th>
                <th>Estado al devolver</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {l.loanItems.map((li) => (
                <tr key={li.id}>
                  <td className="num">{li.quantity}</td>
                  <td>{li.item ? <Link to={`/inventario/bienes/${li.item.id}`}>{li.item.name}</Link> : 'Bien eliminado'}</td>
                  <td>{li.returnCondition ? conditionLabel(li.returnCondition) : dash}</td>
                  <td className="muted">{li.returnNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="print-only loan-signatures">
        <div>Entregó (Intendencia)</div>
        <div>Recibió: {l.borrowerLabel}</div>
      </div>

      {dialog === 'edit' ? <LoanDialog loan={l} onClose={() => setDialog(null)} /> : null}
      {dialog === 'return' ? <ReturnDialog loan={l} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

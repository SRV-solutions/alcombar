import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { CHARGE_CONCEPT_LABELS, formatDate, formatMoney, PAYMENT_METHOD_LABELS, type ChargeConcept, type PaymentMethod } from '@shared';
import { api } from '../../lib/api';
import { Button, ErrorBox, Loading, PageHeader } from '../../components/ui';
import type { Receipt } from './types';
import './accounting.css';

/** Recibo imprimible de un pago (R-<año>-0001). */
export function ReceiptPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['fees-member', 'receipt', id], queryFn: () => api.get<Receipt>(`/accounting/fees/payments/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const r = q.data!;
  return (
    <>
      <PageHeader
        title={`Recibo ${r.receiptNumber}`}
        crumbs={[{ to: `/protagonistas/${r.member.id}`, label: `${r.member.lastName}, ${r.member.firstName}` }]}
        actions={
          <Button onClick={() => window.print()} id="receipt-print">
            <Printer /> Imprimir recibo
          </Button>
        }
      />
      <div className="receipt" id="receipt">
        {r.voided ? <div className="receipt-void">ANULADO{r.voidedAt ? ` · ${formatDate(r.voidedAt.slice(0, 10))}` : ''}</div> : null}
        <div className="receipt-head">
          <div>
            <div className="group">Grupo Scout 155 Divina Providencia</div>
            <div className="muted">Recibo de pago</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="number">{r.receiptNumber}</div>
            <div>Fecha: {formatDate(r.date)}</div>
          </div>
        </div>
        <dl className="dl">
          <dt>Recibimos de</dt>
          <dd>{r.payerName || '—'}</dd>
          <dt>Por el protagonista</dt>
          <dd>
            {r.member.lastName}, {r.member.firstName}
            {r.member.dni ? ` · DNI ${r.member.dni}` : ''}
            {r.member.unit ? ` · ${r.member.unit.name}` : ''}
          </dd>
          <dt>Forma de pago</dt>
          <dd>
            {PAYMENT_METHOD_LABELS[r.method as PaymentMethod] ?? r.method}
            {r.account ? ` · ${r.account.name}` : ''}
          </dd>
          {r.notes ? (
            <>
              <dt>Observaciones</dt>
              <dd>{r.notes}</dd>
            </>
          ) : null}
        </dl>
        <table className="table mt">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="num">Importe</th>
            </tr>
          </thead>
          <tbody>
            {r.allocations?.map((a) => (
              <tr key={a.id}>
                <td>{a.charge?.description ?? (a.charge ? CHARGE_CONCEPT_LABELS[a.charge.concept as ChargeConcept] : '—')}</td>
                <td className="num">{formatMoney(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-total">
          <span>Total</span>
          <span>{formatMoney(r.amount)}</span>
        </div>
        <div className="receipt-sign">
          <div>Firma y aclaración · Tesorería</div>
        </div>
      </div>
      <p className="muted no-print" style={{ textAlign: 'center' }}>
        <Link to={`/protagonistas/${r.member.id}`}>Volver a la ficha</Link>
      </p>
    </>
  );
}

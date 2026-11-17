// Tipos de las respuestas de la API de tesorería (contabilidad, cuotas, eventos y campamentos).
import type { UnitRef } from '../../lib/types';

export interface AccountRow {
  id: string;
  name: string;
  type: 'efectivo' | 'banco' | 'billetera';
  holder: string | null;
  initialBalance: number;
  initialDate: string | null;
  active: boolean;
  notes: string | null;
  balance: number | null;
}
export interface CategoryRow {
  id: string;
  code: string | null;
  name: string;
  kind: 'ingreso' | 'egreso';
  active: boolean;
  sortOrder: number;
}
export interface MovementRow {
  id: string;
  date: string;
  kind: 'ingreso' | 'egreso';
  accountId: string;
  categoryId: string | null;
  amount: number;
  description: string | null;
  receiptUrl: string | null;
  eventId: string | null;
  campId: string | null;
  campRubro: string | null;
  paymentId: string | null;
  transferGroup: string | null;
  reversesId: string | null;
  voided: boolean;
  closed?: boolean;
  account?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  event?: { id: string; name: string } | null;
  camp?: { id: string; name: string } | null;
  payment?: { id: string; receiptNumber: string; memberId: string } | null;
  createdBy?: { id: string; name: string } | null;
}
export interface ChargeRow {
  id: string;
  memberId: string;
  concept: 'cuota' | 'afiliacion' | 'campamento' | 'otro';
  period: string | null;
  description: string | null;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  campId: string | null;
  status: 'pendiente' | 'parcial' | 'pagado' | 'anulado';
  camp?: { id: string; name: string } | null;
}
export interface PaymentRow {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  method: string;
  receiptNumber: string;
  payerName: string | null;
  notes: string | null;
  voided: boolean;
  voidedAt: string | null;
  account?: { id: string; name: string } | null;
  allocations?: { id: string; amount: number; charge?: { id: string; concept: string; period: string | null; description: string | null } | null }[];
}
export interface MemberAccount {
  member: { id: string; firstName: string; lastName: string; unitId: string | null; status: string; unit: UnitRef | null };
  setting: { discountPct: number; note: string | null };
  charges: ChargeRow[];
  payments: PaymentRow[];
  totals: { charged: number; paid: number; balance: number; overdue: number };
  payerSuggestion: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
export interface Receipt extends PaymentRow {
  member: { id: string; firstName: string; lastName: string; dni: string | null; unit: UnitRef | null };
}

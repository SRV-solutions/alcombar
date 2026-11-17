import { ITEM_CONDITION_LABELS, LOAN_STATUS_LABELS, type ItemCondition, type LoanStatus } from '@shared';
import type { Tone } from '../../components/ui';

export interface UnitRef {
  id: string;
  name: string;
  code: string;
  branch: string;
}
export interface ItemCategory {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}
export interface ItemLocation {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}
export interface Item {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  condition: ItemCondition;
  locationId: string | null;
  unitId: string | null;
  photoUrl: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  notes: string | null;
  category: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  unit: UnitRef | null;
  committed: number;
  available: number;
  canEdit: boolean;
  canDelete: boolean;
}
export interface ItemLoanRow {
  loanId: string;
  quantity: number;
  status: LoanStatus;
  overdue: boolean;
  purpose: string;
  borrower: string | null;
  outDate: string;
  dueDate: string;
  returnedAt: string | null;
  returnCondition: ItemCondition | null;
  returnNotes: string | null;
}
export interface ItemDetail extends Item {
  loans: ItemLoanRow[];
}
export interface LoanItemRow {
  id: string;
  loanId: string;
  itemId: string;
  quantity: number;
  returnCondition: ItemCondition | null;
  returnNotes: string | null;
  item: { id: string; name: string; unitId: string | null; condition: ItemCondition; quantity: number } | null;
}
export interface Loan {
  id: string;
  borrowerAdultId: string | null;
  borrowerName: string | null;
  purpose: string;
  unitId: string | null;
  activitySheetId: string | null;
  campId: string | null;
  outDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: LoanStatus;
  approvedAt: string | null;
  deliveredAt: string | null;
  returnNotes: string | null;
  notes: string | null;
  createdAt: string;
  borrower: { id: string; firstName: string; lastName: string; totem: string | null } | null;
  unit: UnitRef | null;
  approvedBy: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  loanItems: LoanItemRow[];
  borrowerLabel: string | null;
  overdue: boolean;
  canManage: boolean;
  canEdit: boolean;
  canCancel: boolean;
}
export interface Alerts {
  overdueLoans: Loan[];
  badItems: { id: string; name: string; condition: ItemCondition; quantity: number; unit: UnitRef | null; location: { id: string; name: string } | null }[];
}

export const CONDITION_TONE: Record<ItemCondition, Tone> = {
  nuevo: 'ok',
  bueno: 'ok',
  regular: 'warn',
  malo: 'danger',
  fuera_de_uso: 'neutral',
};
export const LOAN_TONE: Record<LoanStatus, Tone> = {
  pedido: 'info',
  autorizado: 'gold',
  entregado: 'warn',
  devuelto: 'ok',
  cancelado: 'neutral',
};
export const conditionLabel = (c: string) => ITEM_CONDITION_LABELS[c as ItemCondition] ?? c;
export const loanLabel = (s: string) => LOAN_STATUS_LABELS[s as LoanStatus] ?? s;

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => (n === null || n === undefined ? '—' : money.format(n));

/** "2 × Carpa, 1 × Olla grande" */
export const loanItemsSummary = (loan: Loan) =>
  loan.loanItems.map((li) => `${li.quantity} × ${li.item?.name ?? 'bien eliminado'}`).join(', ');

import type { EventStatus, EventType } from '@shared';
import type { MovementRow } from '../accounting/types';

export interface AdultMini {
  id: string;
  firstName: string;
  lastName: string;
  totem: string | null;
}

export interface EventListItem {
  id: string;
  name: string;
  type: EventType;
  date: string | null;
  place: string | null;
  status: EventStatus;
  responsible: AdultMini | null;
  plannedIncome: number;
  plannedExpense: number;
  ingresos: number;
  egresos: number;
  resultado: number;
  tasks: { total: number; done: number };
}

export interface EventTaskRow {
  id: string;
  kind: 'tarea' | 'compra';
  title: string;
  responsibleAdultId: string | null;
  dueDate: string | null;
  done: boolean;
  notes: string | null;
  responsible: AdultMini | null;
}

export interface EventBudgetRow {
  id: string;
  concept: string;
  kind: 'ingreso' | 'egreso';
  planned: number;
}

export interface EventDetail {
  id: string;
  name: string;
  type: EventType;
  date: string | null;
  place: string | null;
  responsibleAdultId: string | null;
  status: EventStatus;
  description: string | null;
  resultNotes: string | null;
  evaluation: string | null;
  renderedAt: string | null;
  responsible: AdultMini | null;
  tasks: EventTaskRow[];
  budgetLines: EventBudgetRow[];
  movements: MovementRow[];
  totals: { plannedIncome: number; plannedExpense: number; ingresos: number; egresos: number; resultado: number };
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canRecord: boolean;
}

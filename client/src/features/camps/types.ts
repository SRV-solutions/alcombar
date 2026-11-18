import type { CampRubro, CampStatus, CampType, DocStatus, Meal } from '@shared';
import type { UnitRef } from '../../lib/types';
import type { MovementRow } from '../accounting/types';
import type { AdultMini } from '../events/types';

export interface CampListItem {
  id: string;
  name: string;
  type: CampType;
  startDate: string;
  endDate: string;
  nights: number;
  status: CampStatus;
  cost: number;
  ownerUnit: UnitRef | null;
  units: UnitRef[];
  place: string | null;
  responsible: AdultMini | null;
  enrolled: { members: number; adults: number };
}

export interface CampSiteRow {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  contact: string | null;
  capacity: number | null;
  services: string | null;
  link: string | null;
  notes: string | null;
  camps?: number;
  rating?: number | null;
  lastUsed?: string | null;
}

export interface LegajoRow {
  id: string;
  kind: 'protagonista' | 'adulto';
  member: { id: string; firstName: string; lastName: string; dni: string | null; unitId: string | null; birthDate: string | null; unit: UnitRef | null; smallGroup: { id: string; name: string } | null } | null;
  adult: (AdultMini & { dni: string | null }) | null;
  cost: number;
  discountPct: number;
  net: number;
  charge: { id: string; amount: number; paid: number; status: 'pendiente' | 'parcial' | 'pagado' | 'anulado' } | null;
  authorizationPresented: boolean;
  authorizationDate: string | null;
  /** Autorización firmada en la app (si hay). */
  signedAuthorization: { id: string; status: 'firmada' | 'completa' | 'anulada'; signedAt: string; signerName: string; hasAval: boolean } | null;
  dniPresented: boolean;
  fichaMedica: DocStatus | null;
  complete: boolean;
  notes: string | null;
}

export interface CampBudgetRow {
  id: string;
  rubro: CampRubro;
  concept: string;
  planned: number;
}
export interface CampMenuRow {
  id: string;
  day: string | null;
  meal: Meal;
  dish: string;
  notes: string | null;
}
export interface CampShoppingRow {
  id: string;
  item: string;
  quantity: string | null;
  bought: boolean;
  notes: string | null;
}

export interface CampDetail {
  id: string;
  name: string;
  type: CampType;
  ownerUnitId: string | null;
  startDate: string;
  endDate: string;
  nights: number;
  campSiteId: string | null;
  place: string | null;
  responsibleAdultId: string | null;
  cost: number;
  status: CampStatus;
  approvedAt: string | null;
  approvedBy: { id: string; name: string } | null;
  description: string | null;
  transportCompany: string | null;
  transportContact: string | null;
  transportSchedule: string | null;
  transportNotes: string | null;
  materials: string | null;
  resultNotes: string | null;
  siteRating: number | null;
  siteReview: string | null;
  renderedAt: string | null;
  ownerUnit: UnitRef | null;
  units: UnitRef[];
  site: CampSiteRow | null;
  responsible: AdultMini | null;
  /** Si el/la Jefe/a de Campo tiene la Insignia de Madera en Programa (null si no hay nadie elegido). */
  responsibleWoodBadge: boolean | null;
  legajo: LegajoRow[];
  program: CampProgram;
  budgetLines: CampBudgetRow[];
  byRubro: { rubro: CampRubro; planned: number; actual: number }[];
  menu: CampMenuRow[];
  shopping: CampShoppingRow[];
  movements: MovementRow[];
  totals: {
    planned: number;
    realExpense: number;
    realIncome: number;
    expectedIncome: number;
    collected: number;
    resultado: number;
    participants: number;
    incomplete: number;
  };
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canRecord: boolean;
}

/** Programa y cronograma: cada día del campamento es el programa del día de la unidad. */
export interface CampProgramItem {
  id: string;
  time: string | null;
  title: string | null;
  durationMin: number | null;
  notes: string | null;
  responsible: AdultMini | null;
  responsibleText: string | null;
  sheet: { id: string; code: string; name: string; status: string } | null;
}
export interface CampProgram {
  units: { unit: UnitRef; canView: boolean; canEdit: boolean }[];
  days: { id: string; unitId: string; date: string; notes: string | null; items: CampProgramItem[] }[];
  sheets: { id: string; code: string; name: string; date: string | null; status: string; unitId: string | null; inSchedule: boolean }[];
}

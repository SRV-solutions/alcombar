// Tipos de las respuestas de /api/v1/progression (esquemas, tablero de la unidad, progresión de cada protagonista).
import type { UnitLite } from '../program/types';

export interface Stage {
  id: string;
  schemeId: string;
  name: string;
  description: string | null;
  sortOrder: number;
}
export interface Scheme {
  id: string;
  branch: string;
  name: string;
  version: number;
  active: boolean;
  stages: Stage[];
}
export interface SchemesResponse {
  schemes: Scheme[];
  canEdit: boolean;
}
export interface Specialty {
  id: string;
  name: string;
  description: string | null;
  /** null = sirve para todas las ramas */
  branch: string | null;
  areaId: string | null;
  active: boolean;
}

export interface Standards {
  year: number;
  descubiertas: number;
  proyectos: number;
  noches: number;
  realizadas: number;
  targets: { descubiertas: number; proyectos: number; noches: number } | null;
}
export interface BoardMember {
  id: string;
  firstName: string;
  lastName: string;
  smallGroup: { id: string; name: string } | null;
  promiseDate: string | null;
  transition: boolean;
  /** Entrega del material de progresión (Cartas de Exploración…). */
  tool: { status: string | null; lost: boolean; payment: string | null };
  currentStage: { id: string; stageId: string; name: string; startedAt: string | null; insigniaAt: string | null } | null;
  competencies: { total: number; achieved: number; byArea: Record<string, { chosen: number; achieved: number }> };
  lastReview: string | null;
}
export interface Board {
  unit: UnitLite;
  areas: { id: string; name: string }[];
  scheme: Scheme | null;
  standards: Standards;
  canEdit: boolean;
  members: BoardMember[];
}

export interface MemberStageRow {
  id: string;
  stageId: string;
  startedAt: string | null;
  insigniaAt: string | null;
  endedAt: string | null;
  notes: string | null;
  stage: { id: string; name: string; sortOrder: number; scheme: { id: string; name: string; version: number } | null } | null;
}
export interface MemberCompetencyRow {
  id: string;
  competencyId: string;
  memberStageId: string | null;
  status: string;
  achievedAt: string | null;
  notes: string | null;
  createdAt: string;
  competency: {
    id: string;
    number: number | null;
    name: string;
    areaId: string | null;
    requiredChallenges: string[];
    optionalChallenges: string[];
    area: { id: string; name: string } | null;
  } | null;
}
export interface MemberRoleRow {
  id: string;
  cycleId: string | null;
  role: string;
  notes: string | null;
  cycle: { id: string; name: string } | null;
}
export interface CycleReviewRow {
  id: string;
  cycleId: string | null;
  date: string | null;
  selfReview: string | null;
  peersReview: string | null;
  educatorReview: string | null;
  cycle: { id: string; name: string } | null;
}
export interface MemberSpecialtyRow {
  id: string;
  specialtyId: string;
  achievedAt: string | null;
  notes: string | null;
  specialty: { id: string; name: string } | null;
}
export interface MemberProgressData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    promiseDate: string | null;
    status: string;
    unit: UnitLite | null;
    branch: string | null;
  };
  canEdit: boolean;
  moments: {
    ambientacionSince: string | null;
    transition: boolean;
    transitionNotes: string | null;
    notes: string | null;
    toolStatus: string | null;
    toolLost: boolean;
    toolDeliveredAt: string | null;
    toolPayment: string | null;
    toolNotes: string | null;
  };
  scheme: Scheme | null;
  stages: MemberStageRow[];
  competencies: MemberCompetencyRow[];
  roles: MemberRoleRow[];
  reviews: CycleReviewRow[];
  specialties: MemberSpecialtyRow[];
  catalog: {
    areas: { id: string; name: string }[];
    competencies: { id: string; number: number | null; name: string; areaId: string | null; active: boolean }[];
    specialties: Specialty[];
    cycles: { id: string; name: string; startDate: string | null }[];
  };
  participation: { total: number; byType: Record<string, number>; recent: { id: string; date: string; name: string; type: string }[] };
}

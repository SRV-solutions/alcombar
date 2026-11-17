// Tipos de las respuestas de /api/v1/program (fichas, ciclos, programa del sábado, catálogos de rama).
export interface UnitLite {
  id: string;
  name: string;
  code: string;
  branch: string;
}
export interface AdultLite {
  id: string;
  firstName: string;
  lastName: string;
  totem: string | null;
}
export interface Area {
  id: string;
  branch: string;
  name: string;
  sortOrder: number;
}
export interface CompetencyItem {
  id: string;
  branch: string;
  areaId: string | null;
  number: number | null;
  name: string;
  description: string | null;
  requiredChallenges: string[];
  optionalChallenges: string[];
  active: boolean;
  area?: { id: string; name: string; sortOrder?: number } | null;
}
export interface SheetSummary {
  id: string;
  code: string;
  unitId: string;
  name: string;
  date: string | null;
  place: string | null;
  durationMin: number | null;
  status: string;
  opportunityType: string;
  scope: string;
  outside: boolean;
  unit: UnitLite;
  cycle: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  responsible: AdultLite | null;
  competencies?: { id: string; number: number | null; name: string }[];
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
}
export interface Sheet extends SheetSummary {
  cycleId: string | null;
  areaId: string | null;
  ageMin: number | null;
  ageMax: number | null;
  participants: number | null;
  objectives: string[];
  exploration: string | null;
  description: string | null;
  closing: string | null;
  otherEducators: string | null;
  materials: string[];
  responsibleAdultId: string | null;
  safety: string | null;
  nights: number | null;
  reviewNotes: string | null;
  approvedAt: string | null;
  approvedBy: { id: string; name: string } | null;
  evalWorked: string | null;
  evalChange: string | null;
  evalAttendance: number | null;
  evaluatedAt: string | null;
  sourceSheetId: string | null;
  competencies: { id: string; number: number | null; name: string; areaId: string | null; area: { id: string; name: string } | null }[];
}
export interface Cycle {
  id: string;
  unitId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  phase: string;
  diagnosis: string | null;
  purposes: string | null;
  evaluation: string | null;
  unit: UnitLite;
  sheetCount?: number;
  doneCount?: number;
  canEdit?: boolean;
}
export interface CycleDetail extends Cycle {
  canEdit: boolean;
  canDelete: boolean;
  canCreateSheets: boolean;
  sheets: SheetSummary[];
  reviews: {
    id: string;
    date: string | null;
    selfReview: string | null;
    peersReview: string | null;
    educatorReview: string | null;
    member: { id: string; firstName: string; lastName: string };
  }[];
}
export interface MeetingItemRow {
  id?: string;
  time: string | null;
  activitySheetId: string | null;
  title: string | null;
  responsibleAdultId: string | null;
  durationMin: number | null;
  notes: string | null;
  sheet?: { id: string; code: string; name: string; durationMin: number | null; place: string | null; status: string } | null;
  responsible?: AdultLite | null;
}
export interface MeetingResponse {
  program: { id: string; unitId: string; date: string; notes: string | null; items: MeetingItemRow[] } | null;
  canEdit: boolean;
}

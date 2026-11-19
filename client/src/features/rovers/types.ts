import { useQuery } from '@tanstack/react-query';
import type { RoverGoalAction } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Tone } from '../../components/ui';

export interface UnitLite {
  id: string;
  name: string;
  code: string;
}
export interface RoverHomeData {
  units: UnitLite[];
  unitId?: string;
  /** Es del equipo de educadores de la Comunidad. */
  educator?: boolean;
  /** Colabora (como adulto) en algún proyecto. */
  collaborator: boolean;
  rover: {
    memberId: string;
    firstName: string;
    hasVision: boolean;
    goals: { total: number; open: number; achieved: number };
    nextGoal: { title: string; dueDate: string } | null;
    projects: { id: string; title: string; kind: string; status: string }[];
  } | null;
  assembly?: { id: string; openedAt: string } | null;
}
/** Qué tiene esta cuenta en la Comunidad Rover (lo usan el menú y el inicio). */
export function useRoverHome() {
  const { me } = useAuth();
  return useQuery({ queryKey: ['rover-home'], queryFn: () => api.get<RoverHomeData>('/rovers/home'), enabled: !!me, staleTime: 30_000 });
}

export interface Goal {
  id: string;
  title: string;
  areaId: string | null;
  competencyId: string | null;
  actions: RoverGoalAction[];
  resources: string | null;
  dueDate: string | null;
  status: string;
  achievedAt: string | null;
  reflection: string | null;
}
export interface PlanData {
  member: { id: string; name: string };
  canEdit: boolean;
  vision: string | null;
  goals: Goal[];
  areas: { id: string; name: string }[];
  competencies: { id: string; areaId: string | null; number: number | null; name: string }[];
}

export interface ProjectSummary {
  id: string;
  unitId: string;
  kind: string;
  field: string | null;
  scope: string | null;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  owner: { id: string; name: string } | null;
  mine: boolean;
  people: number;
}
export interface ProjectDetail extends Omit<ProjectSummary, 'people'> {
  what: string | null;
  why: string | null;
  howWhere: string | null;
  forWhom: string | null;
  schedule: string | null;
  cost: string | null;
  funding: string | null;
  needs: string | null;
  celebration: string | null;
  finalReport: string | null;
  canEdit: boolean;
  canInvite: boolean;
  canProgress: boolean;
  canPostulate: boolean;
  assemblyOpen: boolean;
  people: { id: string; memberId: string | null; adultId: string | null; name: string; kind: 'rover' | 'adulto' }[];
  decisions: { id: string; date: string; status: string; yes: number; no: number; abstain: number; present: number }[];
}
export interface CommunityData {
  units: UnitLite[];
  unit: UnitLite;
  educator: boolean;
  rovers: {
    id: string;
    name: string;
    hasAccount: boolean;
    entered?: boolean;
    plan?: { hasVision: boolean; goals: number; open: number; achieved: number; updatedAt: string | null };
  }[];
  adults: { id: string; name: string; educator: boolean }[];
}
export interface AssemblyItem {
  id: string;
  status: 'pendiente' | 'votando' | 'aprobado' | 'no_aprobado';
  project: { id: string; title: string; kind: string; field: string | null; what: string | null; owner: string };
  mine: boolean;
  yes: number;
  no: number;
  abstain: number;
  present: number;
  votes: { memberId: string; name: string; vote: 'si' | 'no' | 'abstencion' }[];
  myVote: 'si' | 'no' | 'abstencion' | null;
}
export interface AssemblyData {
  units: UnitLite[];
  unit: UnitLite;
  canManage: boolean;
  me: { memberId: string; present: boolean } | null;
  rovers: { id: string; name: string; hasAccount: boolean }[];
  postulable: { id: string; title: string; kind: string }[];
  assembly: { id: string; openedAt: string; present: string[]; items: AssemblyItem[] } | null;
  past: {
    id: string;
    openedAt: string;
    closedAt: string | null;
    notes: string | null;
    present: number;
    items: { id: string; projectId: string; title: string; kind: string; status: string; yes: number; no: number; abstain: number; present: number }[];
  }[];
}

export const STATUS_TONE: Record<string, Tone> = { borrador: 'neutral', postulado: 'info', reformular: 'warn', aprobado: 'ok', en_curso: 'bordo', terminado: 'neutral' };
export const fmtDay = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

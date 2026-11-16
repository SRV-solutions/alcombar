// Tipos de las respuestas de la API (lo que devuelve el servidor en JSON).
import type { DocStatus, Grant } from '@shared';

export interface Me {
  user: { id: string; email: string; name: string; adultId: string | null; adult: AdultRef | null };
  isSuperadmin: boolean;
  grants: Grant[];
  roles: { name: string; unit: { id: string; name: string; code: string } | null }[];
}

export interface UnitRef {
  id: string;
  name: string;
  code: string;
  branch: string;
}
export interface SmallGroup {
  id: string;
  unitId: string;
  name: string;
  kind: string;
  active: boolean;
}
export interface Unit extends UnitRef {
  minAdults: number | null;
  active: boolean;
  smallGroups: SmallGroup[];
  memberCount: number;
  adultCount: number;
}
export interface AdultRef {
  id: string;
  firstName: string;
  lastName: string;
  totem: string | null;
}
export interface SupportTeam {
  id: string;
  name: string;
  description: string | null;
  leaderAdultId: string | null;
  leader: AdultRef | null;
  members: (AdultRef & { position: string })[];
}
export interface Course {
  id: string;
  name: string;
  kind: string;
  /** Cantidad de módulos (Nivel 1: 2, Nivel 2: 9, Nivel 3: 5). */
  totalModules?: number | null;
  active: boolean;
}
export interface DocumentType {
  id: string;
  code: string | null;
  name: string;
  hasExpiry: boolean;
  active: boolean;
  sortOrder: number;
}
export interface Assignment {
  id: string;
  adultId: string;
  year: number;
  position: string;
  unitId: string | null;
  supportTeamId: string | null;
  /** Rama del cargo cuando todavía no tiene unidad (importado de Mi Rincón). */
  branch: string | null;
  notes: string | null;
  unit: UnitRef | null;
  supportTeam: { id: string; name: string } | null;
}
export interface AdultCourse {
  id: string;
  courseId: string;
  completedAt: string | null;
  /** Módulos completados (cursos por módulos). */
  modulesDone?: number | null;
  certificateUrl: string | null;
  notes: string | null;
  course: Course;
}
export interface Adult extends AdultRef {
  dni: string | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  joinedAt: string | null;
  status: string;
  advisorAdultId: string | null;
  notes: string | null;
  assignments: Assignment[];
  courses: AdultCourse[];
  user: { id: string; email?: string; active: boolean } | null;
}
export interface AdultDetail extends Adult {
  advisor: AdultRef | null;
  advisees: AdultRef[];
}

export interface DocSummary {
  ok: number;
  expiring: number;
  expired: number;
  missing: number;
  total: number;
}
export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  birthDate: string | null;
  joinedAt: string | null;
  promiseDate: string | null;
  status: string;
  /** Rama: la de la unidad, o la conocida si está "por asignar". */
  branch: string | null;
  /** null = por asignar unidad */
  unit: UnitRef | null;
  smallGroup: { id: string; name: string; kind: string } | null;
  docs: DocSummary | null;
}
export interface Guardian {
  linkId: string;
  id: string;
  name: string;
  relationship: string | null;
  dni: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}
export interface MemberDoc {
  documentTypeId: string;
  name: string;
  hasExpiry: boolean;
  presented: boolean;
  presentedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  status: DocStatus;
}
export interface MemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  birthDate: string | null;
  /** null = por asignar unidad */
  unitId: string | null;
  branch: string | null;
  smallGroupId: string | null;
  joinedAt: string | null;
  promiseDate: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  leftAt: string | null;
  notes: string | null;
  unit: UnitRef | null;
  smallGroup: { id: string; name: string; kind: string } | null;
  canEdit: boolean;
  canDelete: boolean;
  canViewContacts: boolean;
  canEditContacts: boolean;
  canViewDocuments: boolean;
  canEditDocuments: boolean;
  canViewAttendance: boolean;
  guardians: Guardian[];
  documents: MemberDoc[] | null;
  transfers: { id: string; date: string; reason: string | null; notes: string | null; fromUnit: UnitRef | null; toUnit: UnitRef | null }[];
  affiliations: { id: string; year: number; status: string; date: string | null; notes: string | null }[];
  attendance: { id: string; date: string; status: string; notes: string | null }[];
  siblings: { id: string; firstName: string; lastName: string; unitId: string }[];
}

export interface RoleInfo {
  id: string;
  key: string | null;
  name: string;
  description: string | null;
  scope: 'group' | 'unit';
  isSystem: boolean;
  userCount: number;
  permissions: { module: string; action: string; unitLimited: boolean }[];
}
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  adultId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  hasPassword: boolean;
  adult: AdultRef | null;
  userRoles: { id: string; roleId: string; unitId: string | null; role: { id: string; key: string | null; name: string; scope: string }; unit: { id: string; name: string; code: string } | null }[];
}
export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

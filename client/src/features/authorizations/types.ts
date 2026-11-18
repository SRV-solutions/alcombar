import type { AuthKind, AuthorizationContent, AuthorizationText, AuthStatus, SignatureData } from '@shared';

export interface UnitLite {
  id: string;
  code: string;
  name: string;
  branch: string;
}
export interface AuthRow {
  id: string;
  kind: AuthKind;
  year: number;
  status: AuthStatus;
  signedAt: string;
  member: { id: string; firstName: string; lastName: string; unit: UnitLite | null } | null;
  camp: { id: string; name: string } | null;
  /** Salida o campamento cargado a mano (no está en la app): "Salida · lugar". */
  activity: string | null;
  signerName: string;
  signerRole: string;
  witnesses: string[];
  avalBy: string | null;
  /** Qué le falta para quedar completa (testigos o aval). */
  pending: string | null;
  canWitness: boolean;
  canApprove: boolean;
  canVoid: boolean;
  /** Eliminar (pruebas o errores de carga): solo el Superadmin. */
  canDelete: boolean;
}
export interface AdultSignature {
  adultId: string | null;
  name: string;
  dni: string | null;
  function?: string | null;
  signature: SignatureData;
  signedAt: string;
  onDeviceOf?: string | null;
}
export interface AuthDetail extends AuthRow {
  templateVersion: string;
  content: AuthorizationContent;
  text: AuthorizationText;
  signature: SignatureData;
  custodySignature: SignatureData | null;
  witnessList: AdultSignature[];
  aval: AdultSignature | null;
  attendedBy: { name: string; dni: string | null };
  hash: string;
  voidedAt: string | null;
  voidReason: string | null;
  me: { adultId: string; name: string; hasDni: boolean; function: string | null; isWitness: boolean } | null;
}
export interface Prefill {
  kind: AuthKind;
  year: number;
  today: string;
  group: { number: string; name: string; district: string; zone: string; locality: string };
  member: { id: string; firstName: string; lastName: string; dni: string | null; birthDate: string | null; address: string | null; unit: UnitLite | null };
  camp: { id: string; name: string; type: string; startDate: string; endDate: string; place: string } | null;
  guardians: { name: string; dni: string | null; phone: string | null; address: string | null; relationship: string | null }[];
  last: { signer: AuthorizationContent['signer']; minor: AuthorizationContent['minor']; place: AuthorizationContent['place']; range: string | null } | null;
  existing: { id: string; signerName: string; signedAt: string; status: AuthStatus }[];
  /** Campamentos ya cargados de su unidad, para elegir (enrolled = el chico está inscripto). */
  campOptions: { id: string; name: string; type: string; startDate: string; endDate: string; enrolled: boolean }[];
  attendedBy: { name: string; hasAdult: boolean };
}

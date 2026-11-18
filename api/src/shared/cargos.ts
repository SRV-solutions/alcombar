/**
 * Cargos de los adultos: primero se elige dónde está (Grupo, una unidad, un equipo de apoyo u otro)
 * y después la función, de una lista cerrada. Así el texto del cargo queda parejo y el organigrama,
 * los roles y los avisos lo reconocen.
 */
export type CargoScope = 'grupo' | 'unidad' | 'equipo' | 'otro';

export interface CargoFunction {
  key: string;
  label: string;
  /** Texto que se guarda como cargo. */
  position: string;
  hint?: string;
}

export const CARGO_SCOPES: { key: CargoScope; label: string; hint: string }[] = [
  { key: 'unidad', label: 'Unidad', hint: 'Jefe, subjefe, ayudante o colaborador' },
  { key: 'grupo', label: 'Grupo', hint: 'Jefatura de Grupo' },
  { key: 'equipo', label: 'Equipo de apoyo', hint: 'Encargado o integrante' },
  { key: 'otro', label: 'Otro', hint: 'Acompañante, padre representante…' },
];

export const CARGO_FUNCTIONS: Record<CargoScope, CargoFunction[]> = {
  unidad: [
    { key: 'jefe', label: 'Jefe/a de Unidad', position: 'Jefe/a de Unidad', hint: 'Educador a cargo de la unidad' },
    { key: 'subjefe', label: 'Subjefe/a de Unidad', position: 'Subjefe/a de Unidad', hint: 'Educador' },
    { key: 'ayudante', label: 'Ayudante de Unidad', position: 'Ayudante de Unidad', hint: 'Educador' },
    { key: 'colaborador', label: 'Colaborador/a', position: 'Colaborador/a', hint: 'Da una mano en la unidad' },
  ],
  grupo: [
    { key: 'jefe', label: 'Jefe/a de Grupo', position: 'Jefe/a de Grupo' },
    { key: 'subjefe', label: 'Subjefe/a de Grupo', position: 'Subjefe/a de Grupo' },
  ],
  equipo: [
    { key: 'encargado', label: 'Encargado/a del equipo', position: 'Encargado/a de equipo', hint: 'Queda como responsable del equipo' },
    { key: 'integrante', label: 'Integrante', position: 'Integrante de equipo' },
  ],
  otro: [
    { key: 'acompanante', label: 'Acompañante', position: 'Acompañante' },
    { key: 'padre', label: 'Padre/madre representante', position: 'Padre/madre representante' },
    { key: 'asesor', label: 'Asesor/a personal', position: 'Asesor/a personal' },
  ],
};

/** Función de Programa que solo existe en ese equipo: referente de una rama. */
export const REFERENT_FUNCTION: CargoFunction = { key: 'referente', label: 'Referente de rama', position: '', hint: 'Recibe avisos de fichas y campamentos de su rama' };
/** Cualquier otra función, escrita a mano. */
export const OTHER_FUNCTION_KEY = 'otra';

/** Cargo que conduce el equipo: encargado/a, responsable, coordinador/a, líder o director/a (p. ej. Director Ejecutivo). */
export const isTeamLeaderPosition = (p: string) => /^(encargad|responsable|coordinador|l[ií]der|director)/i.test(p.trim());

/** Dónde está un cargo ya cargado. Los que solo tienen rama (importados sin unidad) cuentan como de unidad. */
export function cargoScopeOf(a: { position: string; unitId?: string | null; supportTeamId?: string | null; branch?: string | null }): CargoScope {
  if (a.unitId) return 'unidad';
  if (a.supportTeamId) return 'equipo';
  if (/de grupo/i.test(a.position)) return 'grupo';
  if (a.branch) return 'unidad';
  return 'otro';
}

/** Qué función de la lista corresponde a un texto de cargo (acepta las variantes que ya están cargadas). */
export function cargoFunctionOf(scope: CargoScope, position: string): string {
  const p = position.trim();
  if (!p) return '';
  if (scope === 'unidad') {
    if (/^sub[\s-]*jef/i.test(p)) return 'subjefe';
    if (/^jef[ea]/i.test(p)) return 'jefe';
    if (/^(ayudante|asistente)/i.test(p)) return 'ayudante';
    if (/^colaborador/i.test(p)) return 'colaborador';
  } else if (scope === 'grupo') {
    if (/sub[\s-]*jef/i.test(p)) return 'subjefe';
    if (/jef[ea]/i.test(p)) return 'jefe';
  } else if (scope === 'equipo') {
    if (/^referente/i.test(p)) return 'referente';
    if (isTeamLeaderPosition(p)) return 'encargado';
    if (/^integrante/i.test(p)) return 'integrante';
  } else {
    if (/acompa[nñ]/i.test(p)) return 'acompanante';
    if (/padre|madre|representante/i.test(p)) return 'padre';
    if (/asesor/i.test(p)) return 'asesor';
  }
  return OTHER_FUNCTION_KEY;
}

/**
 * Quién es Jefe/a de Campo por defecto: la máxima autoridad de la unidad que organiza (su Jefe/a de Unidad) o,
 * si el campamento es de Grupo, el/la Jefe/a de Grupo. Recibe los adultos con sus cargos del año.
 */
export function defaultFieldChief<T extends { assignments?: { position: string; unitId?: string | null; supportTeamId?: string | null; branch?: string | null }[] }>(
  adults: T[],
  ownerUnitId: string | null | undefined,
): T | null {
  const isChief = (a: T) =>
    (a.assignments ?? []).some((c) =>
      ownerUnitId ? c.unitId === ownerUnitId && cargoFunctionOf('unidad', c.position) === 'jefe' : cargoScopeOf(c) === 'grupo' && cargoFunctionOf('grupo', c.position) === 'jefe',
    );
  return adults.find(isChief) ?? null;
}

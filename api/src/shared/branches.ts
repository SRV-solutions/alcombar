export const BRANCHES = ['castores', 'lobatos', 'scouts', 'caminantes', 'rovers'] as const;
export type Branch = (typeof BRANCHES)[number];

/** Cuántos protagonistas puede haber por adulto en cada rama (1 adulto cada N). Cada unidad lo puede cambiar. */
export const KIDS_PER_ADULT: Record<Branch, number> = { castores: 6, lobatos: 6, scouts: 6, caminantes: 8, rovers: 8 };
/** Protagonistas por adulto de una unidad: el suyo o, si no lo tiene cargado, el de su rama. */
export const kidsPerAdultOf = (u: { branch: string; kidsPerAdult?: number | null }): number => u.kidsPerAdult || KIDS_PER_ADULT[u.branch as Branch] || 6;
/** Mínimo de adultos para una cantidad de protagonistas: 1 cada N, redondeando para arriba. */
export const requiredAdults = (kids: number, kidsPerAdult: number): number => Math.ceil(kids / kidsPerAdult);

export interface BranchInfo {
  label: string;
  color: string;
  /** Nombre del pequeño grupo en la rama (singular / plural). */
  smallGroup: { one: string; many: string };
  /** Rango de edad orientativo. */
  ages: [number, number];
  order: number;
}

export const BRANCH_INFO: Record<Branch, BranchInfo> = {
  castores: { label: 'Castores', color: '#8B5A2B', smallGroup: { one: 'Equipo', many: 'Equipos' }, ages: [5, 7], order: 1 },
  lobatos: { label: 'Lobatos y Lobeznas', color: '#E0A800', smallGroup: { one: 'Seisena', many: 'Seisenas' }, ages: [7, 11], order: 2 },
  scouts: { label: 'Scouts', color: '#2E7D32', smallGroup: { one: 'Patrulla', many: 'Patrullas' }, ages: [11, 14], order: 3 },
  caminantes: { label: 'Caminantes', color: '#1565C0', smallGroup: { one: 'Equipo', many: 'Equipos' }, ages: [14, 17], order: 4 },
  rovers: { label: 'Rovers', color: '#C62828', smallGroup: { one: 'Equipo', many: 'Equipos' }, ages: [17, 21], order: 5 },
};

/** Rama a la que se pasa por edad (Rovers egresa a los 21). */
export const NEXT_BRANCH: Record<Branch, Branch | null> = {
  castores: 'lobatos',
  lobatos: 'scouts',
  scouts: 'caminantes',
  caminantes: 'rovers',
  rovers: null,
};

/**
 * Pases del Grupo: se hacen una sola vez al año, en abril.
 * - Castores, Lobatos y Scouts: pasan en abril los que cumplen la edad de pase hasta el 30 de junio de ese año;
 *   los que la cumplen después pasan al año siguiente.
 * - Caminantes → Rovers: tienen que tener 18 cumplidos el día de los pases. Los que los cumplen después pueden pasar
 *   cuando quieran, desde su cumpleaños.
 * - Rovers: egresan con 21 cumplidos.
 */
export const TRANSFER_AGE: Record<Branch, number> = { castores: 7, lobatos: 11, scouts: 14, caminantes: 18, rovers: 21 };
/** Mes y día de corte para las ramas que pasan por «cumple hasta…». */
export const TRANSFER_CUTOFF = '06-30';
/** Ramas en las que cuenta la edad cumplida el día de los pases, no la fecha de corte. */
export const TRANSFER_ON_THE_DAY: readonly Branch[] = ['caminantes', 'rovers'];

/** A qué fecha se mira la edad de alguien de esa rama para los pases de ese año. */
export function transferRefDate(branch: string | null | undefined, year: number, passDay: string): string {
  return TRANSFER_ON_THE_DAY.includes(branch as Branch) ? passDay : `${year}-${TRANSFER_CUTOFF}`;
}

/** ¿Le toca pasar? `age` es su edad a la fecha de `transferRefDate`. */
export function dueForTransfer(branch: string | null | undefined, age: number | null): boolean {
  const min = branch ? TRANSFER_AGE[branch as Branch] : undefined;
  return min !== undefined && age !== null && age >= min;
}

/** Si el día de los pases no está cargado en el calendario: el último sábado de abril. */
export function defaultPassDay(year: number): string {
  const d = new Date(year, 3, 30);
  while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
  return `${year}-04-${String(d.getDate()).padStart(2, '0')}`;
}

export const SMALL_GROUP_KINDS = ['equipo', 'seisena', 'patrulla'] as const;
export type SmallGroupKind = (typeof SMALL_GROUP_KINDS)[number];

export function defaultSmallGroupKind(branch: Branch): SmallGroupKind {
  if (branch === 'lobatos') return 'seisena';
  if (branch === 'scouts') return 'patrulla';
  return 'equipo';
}

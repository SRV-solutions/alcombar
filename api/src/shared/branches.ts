export const BRANCHES = ['castores', 'lobatos', 'scouts', 'caminantes', 'rovers'] as const;
export type Branch = (typeof BRANCHES)[number];

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

/** ¿Ya tiene edad para pasar de rama? Se compara con la edad máxima de su rama a la fecha de referencia. */
export function dueForTransfer(branch: string | null | undefined, age: number | null): boolean {
  const info = branch ? BRANCH_INFO[branch as Branch] : null;
  return !!info && age !== null && age >= info.ages[1];
}

export const SMALL_GROUP_KINDS = ['equipo', 'seisena', 'patrulla'] as const;
export type SmallGroupKind = (typeof SMALL_GROUP_KINDS)[number];

export function defaultSmallGroupKind(branch: Branch): SmallGroupKind {
  if (branch === 'lobatos') return 'seisena';
  if (branch === 'scouts') return 'patrulla';
  return 'equipo';
}

// Modelo de permisos (informe §2.2): un permiso es módulo + acción.
// Un rol agrupa permisos; cada asignación de rol a un usuario tiene alcance Grupo o Unidad.
// En un rol de alcance Unidad, cada permiso puede estar "limitado a la unidad" (unitLimited)
// o valer para todo el Grupo (por ejemplo, un educador ve protagonistas de todas las unidades
// pero solo edita los de la suya).

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<Action, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  export: 'Exportar',
};

export interface ModuleInfo {
  label: string;
  section: string;
  actions: readonly Action[];
  /** Si el recurso pertenece a una unidad (el permiso puede limitarse a la unidad). */
  unitScoped: boolean;
  description?: string;
}

export const MODULES = {
  users: { label: 'Usuarios', section: 'Administración', actions: ['view', 'create', 'edit', 'delete'], unitScoped: false },
  roles: { label: 'Roles y permisos', section: 'Administración', actions: ['view', 'create', 'edit', 'delete'], unitScoped: false },
  audit: { label: 'Auditoría', section: 'Administración', actions: ['view', 'export'], unitScoped: false },
  group: {
    label: 'Grupo y unidades',
    section: 'Grupo',
    actions: ['view', 'create', 'edit', 'delete'],
    unitScoped: false,
    description: 'Unidades, equipos de apoyo, organigrama y catálogos.',
  },
  small_groups: { label: 'Pequeños grupos', section: 'Grupo', actions: ['view', 'create', 'edit', 'delete'], unitScoped: true },
  adults: { label: 'Adultos', section: 'Adultos', actions: ['view', 'create', 'edit', 'delete', 'export'], unitScoped: false },
  training: { label: 'Formación', section: 'Adultos', actions: ['view', 'create', 'edit', 'delete'], unitScoped: false },
  members: {
    label: 'Protagonistas',
    section: 'Protagonistas',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
    unitScoped: true,
    description: 'Padrón, pases de rama y afiliaciones.',
  },
  member_contacts: {
    label: 'Contacto de familias',
    section: 'Protagonistas',
    actions: ['view', 'edit'],
    unitScoped: true,
    description: 'Responsables adultos y sus datos de contacto.',
  },
  member_documents: { label: 'Documentación', section: 'Protagonistas', actions: ['view', 'edit'], unitScoped: true },
  attendance: { label: 'Asistencia', section: 'Protagonistas', actions: ['view', 'edit'], unitScoped: true },
} as const satisfies Record<string, ModuleInfo>;

export type ModuleKey = keyof typeof MODULES;
export const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

export interface Grant {
  module: string;
  action: string;
  /** null = vale para todo el Grupo */
  unitId: string | null;
}

export interface PermissionSubject {
  isSuperadmin: boolean;
  grants: Grant[];
}

/** ¿Puede hacer la acción? Si se pasa unitId, valida contra el alcance; si no, alcanza con tener el permiso en alguna unidad. */
export function can(subject: PermissionSubject | null | undefined, module: ModuleKey, action: Action, unitId?: string | null): boolean {
  if (!subject) return false;
  if (subject.isSuperadmin) return true;
  return subject.grants.some(
    (g) => g.module === module && g.action === action && (g.unitId === null || unitId === undefined || g.unitId === unitId),
  );
}

/** ¿Tiene el permiso para todo el Grupo? */
export function canGroupWide(subject: PermissionSubject | null | undefined, module: ModuleKey, action: Action): boolean {
  if (!subject) return false;
  if (subject.isSuperadmin) return true;
  return subject.grants.some((g) => g.module === module && g.action === action && g.unitId === null);
}

/** Unidades en las que tiene el permiso: 'all' o la lista de ids. */
export function unitsWith(subject: PermissionSubject | null | undefined, module: ModuleKey, action: Action): 'all' | string[] {
  if (!subject) return [];
  if (canGroupWide(subject, module, action)) return 'all';
  return [...new Set(subject.grants.filter((g) => g.module === module && g.action === action && g.unitId).map((g) => g.unitId as string))];
}

// ---- Roles iniciales (informe §2.3) ----
// Notación: 'modulo:accion' vale para todo el Grupo; 'modulo:accion@unidad' queda limitado a la unidad asignada.
export interface RoleSeed {
  key: string;
  name: string;
  scope: 'group' | 'unit';
  description: string;
  permissions: string[];
}

const all = (m: ModuleKey, suffix = '') => MODULES[m].actions.map((a) => `${m}:${a}${suffix}`);

export const ROLE_SEEDS: RoleSeed[] = [
  {
    key: 'superadmin',
    name: 'Superadmin',
    scope: 'group',
    description: 'Todo. Gestiona usuarios, roles, permisos, unidades y catálogos. Ve la auditoría.',
    permissions: [], // fijos en el código: el superadmin puede todo
  },
  {
    key: 'jefatura',
    name: 'Jefatura de Grupo',
    scope: 'group',
    description: 'Ve todos los módulos. Edita adultos, unidades, equipos y calendario del Grupo.',
    permissions: [
      ...all('group'),
      ...all('small_groups'),
      ...all('adults'),
      ...all('training'),
      'members:view',
      'members:export',
      'member_contacts:view',
      'member_documents:view',
      'attendance:view',
      'audit:view',
    ],
  },
  {
    key: 'jefe_unidad',
    name: 'Jefe/a de Unidad',
    scope: 'unit',
    description: 'Gestiona protagonistas, pequeños grupos, documentación y asistencia de su unidad.',
    permissions: [
      'group:view',
      'adults:view',
      'training:view',
      'small_groups:view',
      'small_groups:create@unit',
      'small_groups:edit@unit',
      'small_groups:delete@unit',
      'members:view',
      'members:create@unit',
      'members:edit@unit',
      'members:delete@unit',
      'members:export@unit',
      'member_contacts:view@unit',
      'member_contacts:edit@unit',
      'member_documents:view',
      'member_documents:edit@unit',
      'attendance:view',
      'attendance:edit@unit',
    ],
  },
  {
    key: 'educador',
    name: 'Educador/a',
    scope: 'unit',
    description: 'Registra asistencia y documentación en su unidad. Ve protagonistas de todas las unidades.',
    permissions: [
      'group:view',
      'adults:view',
      'small_groups:view',
      'members:view',
      'members:edit@unit',
      'member_contacts:view@unit',
      'member_documents:view',
      'member_documents:edit@unit',
      'attendance:view',
      'attendance:edit@unit',
    ],
  },
  {
    key: 'tesoreria',
    name: 'Tesorería',
    scope: 'group',
    description: 'Gestiona caja, cuotas, afiliaciones y presupuesto (módulos de las próximas etapas).',
    permissions: ['group:view', 'adults:view', 'small_groups:view', 'members:view', 'members:export', 'member_contacts:view'],
  },
  {
    key: 'secretaria',
    name: 'Secretaría',
    scope: 'group',
    description: 'Altas y bajas de protagonistas y adultos, afiliaciones, documentación y legajos.',
    permissions: [
      'group:view',
      ...all('small_groups'),
      ...all('adults'),
      'training:view',
      ...all('members'),
      ...all('member_contacts'),
      ...all('member_documents'),
      'attendance:view',
    ],
  },
  {
    key: 'programa',
    name: 'Programa / APF',
    scope: 'group',
    description: 'Gestiona la formación de adultos y los asesores personales.',
    permissions: ['group:view', 'small_groups:view', 'adults:view', 'adults:edit', ...all('training'), 'members:view', 'attendance:view'],
  },
  {
    key: 'intendencia',
    name: 'Intendencia',
    scope: 'group',
    description: 'Gestiona inventario y préstamos (módulo de una próxima etapa).',
    permissions: ['group:view', 'adults:view'],
  },
  {
    key: 'consulta',
    name: 'Consulta',
    scope: 'group',
    description: 'Solo lectura de lo no sensible: organigrama y unidades.',
    permissions: ['group:view'],
  },
];

export function parsePermissionCode(code: string): { module: ModuleKey; action: Action; unitLimited: boolean } {
  const [ma, limit] = code.split('@');
  const [module, action] = ma.split(':') as [ModuleKey, Action];
  return { module, action, unitLimited: limit === 'unit' };
}

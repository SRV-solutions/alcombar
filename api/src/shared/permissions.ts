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
  adult_attendance: {
    label: 'Asistencia de educadores',
    section: 'Adultos',
    actions: ['view', 'edit'],
    unitScoped: false,
    description: 'Quiénes de los adultos con cargo vinieron a cada actividad del Grupo. La toma la Jefatura de Grupo.',
  },
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
  member_documents: {
    label: 'Documentación',
    section: 'Protagonistas',
    actions: ['view', 'edit', 'approve'],
    unitScoped: true,
    description: 'Legajo de cada protagonista y autorizaciones firmadas en la app. Editar = cargar documentos y hacer firmar. Aprobar = dar el aval del Jefe/a de Unidad o de Grupo y anular una autorización.',
  },
  attendance: { label: 'Asistencia', section: 'Protagonistas', actions: ['view', 'edit'], unitScoped: true },
  // ---- Etapas 3 y 4: programa y progresión ----
  activities: {
    label: 'Fichas y ciclo de programa',
    section: 'Programa',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
    unitScoped: true,
    description: 'Fichas de actividad, banco de fichas, ciclos de programa y programa del sábado. Aprobar = aprobar fichas.',
  },
  progression: {
    label: 'Progresión personal',
    section: 'Programa',
    actions: ['view', 'edit'],
    unitScoped: true,
    description: 'Etapas, competencias, revisiones de ciclo y especialidades de cada protagonista.',
  },
  // ---- Etapas 5 y 6: tesorería, eventos y campamentos ----
  accounting: {
    label: 'Contabilidad',
    section: 'Tesorería',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
    // Cada cuenta es del Grupo o de una unidad: limitado a la unidad, ve y mueve solo la plata de las cuentas de su unidad
    unitScoped: true,
    description:
      'Cuentas del Grupo y de cada unidad, movimientos, presupuesto, cierres mensuales y reportes. Limitado a la unidad: solo las cuentas de su unidad. Aprobar = presupuesto, plan de cuotas y cierres.',
  },
  fees: {
    label: 'Cuotas y pagos de protagonistas',
    section: 'Tesorería',
    actions: ['view', 'create', 'edit', 'delete'],
    unitScoped: true,
    description: 'Cuenta corriente de cada protagonista: cuotas, afiliación, campamento, pagos y recibos.',
  },
  events: {
    label: 'Eventos',
    section: 'Tesorería',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
    unitScoped: false,
    description: 'Fogones, aniversario y eventos de recaudación: presupuesto, tareas y rendición.',
  },
  camps: {
    label: 'Campamentos y salidas',
    section: 'Tesorería',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
    unitScoped: true,
    description: 'Inscripción, legajos, presupuesto, rendición y logística. Aprobar = aprobar el campamento.',
  },
  // ---- Etapas 7 y 8: inventario, calendario y documentos ----
  inventory: {
    label: 'Inventario y préstamos',
    section: 'Grupo',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
    unitScoped: true,
    description: 'Bienes del Grupo y de cada unidad, préstamos y devoluciones. Aprobar = autorizar préstamos.',
  },
  calendar: {
    label: 'Calendario',
    section: 'Grupo',
    actions: ['view', 'create', 'edit', 'delete'],
    unitScoped: true,
    description: 'Calendario del Grupo y de cada unidad.',
  },
  documents: {
    label: 'Actas y documentos',
    section: 'Grupo',
    actions: ['view', 'create', 'edit', 'delete'],
    unitScoped: false,
    description: 'Actas del Consejo de Grupo y repositorio de documentos (enlaces al Drive).',
  },
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
      ...all('adult_attendance'),
      'members:view',
      'members:export',
      'member_contacts:view',
      'member_documents:view',
      'member_documents:approve',
      'attendance:view',
      'audit:view',
      // Etapas 3 a 8
      'activities:view',
      'activities:approve',
      'activities:export',
      'progression:view',
      'accounting:view',
      'accounting:approve',
      'accounting:export',
      'fees:view',
      ...all('events'),
      'camps:view',
      'camps:approve',
      'inventory:view',
      ...all('calendar'),
      ...all('documents'),
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
      'member_documents:approve@unit',
      'attendance:view',
      'attendance:edit@unit',
      // Etapas 3 a 8
      'activities:view',
      'activities:create@unit',
      'activities:edit@unit',
      'activities:delete@unit',
      'activities:approve@unit',
      'activities:export@unit',
      'progression:view',
      'progression:edit@unit',
      'fees:view@unit',
      'events:view',
      'camps:view',
      'camps:create@unit',
      'camps:edit@unit',
      'camps:delete@unit',
      'inventory:view',
      'inventory:create@unit',
      'inventory:edit@unit',
      'calendar:view',
      'calendar:create@unit',
      'calendar:edit@unit',
      'calendar:delete@unit',
      'documents:view',
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
      // Etapas 3 a 8
      'activities:view',
      'activities:create@unit',
      'activities:edit@unit',
      'progression:view',
      'progression:edit@unit',
      'fees:view@unit',
      'events:view',
      'camps:view@unit',
      'inventory:view',
      'calendar:view',
      'calendar:create@unit',
      'calendar:edit@unit',
      'documents:view',
    ],
  },
  {
    key: 'tesoreria',
    name: 'Tesorería',
    scope: 'group',
    description: 'Gestiona caja, cuotas, afiliaciones, presupuesto y rendiciones de eventos y campamentos.',
    permissions: [
      'group:view',
      'adults:view',
      'small_groups:view',
      'members:view',
      'members:export',
      'member_contacts:view',
      ...all('accounting'),
      ...all('fees'),
      'events:view',
      'events:edit',
      'camps:view',
      'camps:edit',
      'calendar:view',
      'documents:view',
    ],
  },
  {
    key: 'secretaria',
    name: 'Secretaría',
    scope: 'group',
    description:
      'Cobra cuotas, afiliaciones y campamentos (genera los cargos, registra los pagos y emite recibos) y registra lo que entra y sale del Grupo, incluida la plata que se pasa a las unidades. También altas y bajas, documentación y legajos.',
    permissions: [
      'group:view',
      ...all('small_groups'),
      ...all('adults'),
      'training:view',
      ...all('members'),
      ...all('member_contacts'),
      'member_documents:view',
      'member_documents:edit',
      'attendance:view',
      // Etapas 3 a 8
      // Cobra: genera las cuotas del mes y la afiliación, carga cargos, registra pagos y emite recibos.
      // Los montos del plan de cuotas, el presupuesto, los cierres y anular pagos siguen siendo de Tesorería.
      'fees:view',
      'fees:create',
      'fees:edit',
      // Lo que entra y sale del Grupo: ingresos, gastos y transferencias (también a las cajas de las unidades)
      'accounting:view',
      'accounting:create',
      'accounting:edit',
      'accounting:export',
      'events:view',
      'camps:view',
      ...all('calendar'),
      ...all('documents'),
    ],
  },
  {
    key: 'finanzas_unidad',
    name: 'Finanzas de la unidad',
    scope: 'unit',
    description:
      'Lleva la plata de su unidad: las cuentas de la unidad, lo que le pasa el Grupo, lo que entra por eventos y los gastos. Ve lo que deben los protagonistas de su unidad.',
    permissions: [
      'group:view',
      'accounting:view@unit',
      'accounting:create@unit',
      'accounting:edit@unit',
      'accounting:export@unit',
      'fees:view@unit',
      'events:view',
      'camps:view@unit',
      'calendar:view',
      'documents:view',
    ],
  },
  {
    key: 'programa',
    name: 'Programa / APF',
    scope: 'group',
    description: 'Gestiona la formación de adultos y los asesores personales.',
    permissions: [
      'group:view',
      'small_groups:view',
      'adults:view',
      'adults:edit',
      ...all('training'),
      'members:view',
      'attendance:view',
      // Etapas 3 a 8
      'activities:view',
      'activities:export',
      'progression:view',
      'camps:view',
      'calendar:view',
      'documents:view',
    ],
  },
  {
    key: 'intendencia',
    name: 'Intendencia',
    scope: 'group',
    description: 'Gestiona inventario y préstamos.',
    permissions: ['group:view', 'adults:view', ...all('inventory'), 'camps:view', 'calendar:view', 'documents:view'],
  },
  {
    key: 'consulta',
    name: 'Consulta',
    scope: 'group',
    description: 'Solo lectura de lo no sensible: organigrama, calendario y documentos.',
    permissions: ['group:view', 'calendar:view', 'documents:view'],
  },
  {
    key: 'rover',
    name: 'Rover',
    scope: 'unit',
    description: 'Rover de la Comunidad: su Plan Personal, sus proyectos y mingas, y lo no sensible del Grupo (organigrama y calendario).',
    // Sin «Actas y documentos»: las actas del Consejo no son para la Comunidad
    permissions: ['group:view', 'calendar:view'],
  },
];

export function parsePermissionCode(code: string): { module: ModuleKey; action: Action; unitLimited: boolean } {
  const [ma, limit] = code.split('@');
  const [module, action] = ma.split(':') as [ModuleKey, Action];
  return { module, action, unitLimited: limit === 'unit' };
}

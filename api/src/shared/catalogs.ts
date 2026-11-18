export const ADULT_STATUSES = ['alta', 'prueba', 'baja'] as const;
export type AdultStatus = (typeof ADULT_STATUSES)[number];
export const ADULT_STATUS_LABELS: Record<AdultStatus, string> = {
  alta: 'Alta',
  prueba: 'Período de prueba',
  baja: 'Baja',
};

export const MEMBER_STATUSES = ['activo', 'baja'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = { activo: 'Activo/a', baja: 'Baja' };

export const AFFILIATION_STATUSES = ['pendiente', 'en_tramite', 'afiliado', 'no_corresponde'] as const;
export type AffiliationStatus = (typeof AFFILIATION_STATUSES)[number];
export const AFFILIATION_STATUS_LABELS: Record<AffiliationStatus, string> = {
  pendiente: 'Pendiente',
  en_tramite: 'En trámite',
  afiliado: 'Afiliado/a',
  no_corresponde: 'No corresponde',
};

export const ATTENDANCE_STATUSES = ['presente', 'ausente', 'tarde', 'justificado'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  tarde: 'Llegó tarde',
  justificado: 'Ausente con aviso',
};

/** Motivo de un pase de unidad. */
export const TRANSFER_REASONS = ['edad', 'eleccion', 'otro'] as const;
export type TransferReason = (typeof TRANSFER_REASONS)[number];
export const TRANSFER_REASON_LABELS: Record<TransferReason, string> = {
  edad: 'Pase por edad (cambio de rama)',
  eleccion: 'Cambio de unidad por elección',
  otro: 'Otro motivo',
};

export const COURSE_KINDS = ['insignia_madera', 'miembro_activo', 'curso', 'otro'] as const;
export type CourseKind = (typeof COURSE_KINDS)[number];
export const COURSE_KIND_LABELS: Record<CourseKind, string> = {
  insignia_madera: 'Insignia de Madera',
  miembro_activo: 'Miembro Activo',
  curso: 'Curso',
  otro: 'Otro',
};

/** Documentos que se controlan por protagonista (informe §3.3). Solo presentado + vencimiento. */
/** Legajo personal de un protagonista según las planillas de Scouts de Argentina (versión 07-21). */
export const DEFAULT_DOCUMENT_TYPES = [
  { code: 'aut_ingreso', name: 'Autorización de ingreso', hasExpiry: false, required: true, sortOrder: 1 },
  { code: 'ficha_medica', name: 'Declaración jurada de salud (ficha médica)', hasExpiry: true, required: true, sortOrder: 2 },
  { code: 'aut_salidas', name: 'Autorización anual de salidas cercanas', hasExpiry: true, required: true, sortOrder: 3 },
  { code: 'aut_imagen', name: 'Autorización de uso de imagen', hasExpiry: true, required: true, sortOrder: 4 },
  { code: 'vacunas', name: 'Carnet de vacunación (fotocopia)', hasExpiry: false, required: true, sortOrder: 5 },
  { code: 'obra_social', name: 'Credencial de obra social (fotocopia)', hasExpiry: false, required: true, sortOrder: 6 },
  { code: 'dni_protagonista', name: 'DNI del protagonista (fotocopia)', hasExpiry: false, required: true, sortOrder: 7 },
  { code: 'dni_responsables', name: 'DNI de madre, padre o tutor (fotocopia)', hasExpiry: false, required: true, sortOrder: 8 },
  { code: 'partida_nacimiento', name: 'Partida de nacimiento (fotocopia)', hasExpiry: false, required: true, sortOrder: 9 },
  { code: 'aut_retiro', name: 'Autorización para retirarse solo/a', hasExpiry: true, required: false, sortOrder: 10 },
  { code: 'aut_retiro_terceros', name: 'Autorización de retiro por otros adultos', hasExpiry: true, required: false, sortOrder: 11 },
  // Legajo de los adultos
  { code: 'ad_ficha_medica', name: 'Ficha médica / declaración jurada de salud', hasExpiry: true, required: true, appliesTo: 'adult' as const, sortOrder: 1 },
  { code: 'ad_dni', name: 'DNI (fotocopia)', hasExpiry: false, required: true, appliesTo: 'adult' as const, sortOrder: 2 },
  { code: 'ad_obra_social', name: 'Credencial de obra social (fotocopia)', hasExpiry: false, required: true, appliesTo: 'adult' as const, sortOrder: 3 },
  { code: 'ad_antecedentes', name: 'Certificado de antecedentes penales', hasExpiry: true, required: true, appliesTo: 'adult' as const, sortOrder: 4 },
];

/** Unidades del Grupo (informe §3.1). El código es editable desde la app. */
export const DEFAULT_UNITS = [
  { code: 'CCA', name: 'Colonia Castores Alicura', branch: 'castores' },
  { code: 'MIL', name: 'Manada Isla Lukanon', branch: 'lobatos' },
  { code: 'MPL', name: 'Manada Pueblo Libre', branch: 'lobatos' },
  { code: 'USLC', name: 'Unidad Scout Luis Conde', branch: 'scouts' },
  { code: 'USPB', name: 'Unidad Scout Pedro Bártolo', branch: 'scouts' },
  { code: 'CCJB', name: 'Comunidad Caminante Jorge Bergoglio', branch: 'caminantes' },
  { code: 'CCML', name: 'Comunidad Caminante Manu Lozano', branch: 'caminantes' },
  { code: 'CRSLO', name: 'Comunidad Rover San Luis Orione', branch: 'rovers' },
] as const;

/**
 * Contexto institucional que se muestra arriba del organigrama (no sale de la base: se edita acá).
 * Mismo texto que el organigrama del Grupo en el Drive.
 */
export const GROUP_CONTEXT: { title: string; detail: string }[] = [
  { title: 'Distrito 1', detail: 'Director de Distrito: Ignacio Caruso' },
  { title: 'Consejo de Grupo', detail: 'Educadores · padres representantes · parroquia · representantes juveniles' },
  { title: 'Parroquia / COPAPA', detail: 'Entidad patrocinante' },
];

export const DEFAULT_COURSES = [
  { name: 'Insignia de Madera de Programa', kind: 'insignia_madera', totalModules: null },
  { name: 'Insignia de Madera de Gestión', kind: 'insignia_madera', totalModules: null },
  { name: 'Miembro Activo', kind: 'miembro_activo', totalModules: null },
  { name: 'Nivel 1', kind: 'curso', totalModules: 2 },
  { name: 'Nivel 2', kind: 'curso', totalModules: 9 },
  { name: 'Nivel 3', kind: 'curso', totalModules: 5 },
] as const;

/**
 * Resumen de formación de un adulto (como la planilla del Grupo): IM Gestión > IM Programa > Miembro Activo >
 * trayecto en curso (algún módulo) > sin formación. Y si puede ser Jefe/a de Grupo: +25 años e Insignia de Madera
 * (con IM Programa, con compromiso de hacer Gestión).
 */
export function trainingSummary(
  courses: { name: string; modulesDone?: number | null }[],
  age: number | null,
): { summary: string; canLeadGroup: 'si' | 'con_compromiso' | 'no'; reason: string } {
  const has = (n: string) => courses.some((c) => c.name.toLowerCase() === n.toLowerCase());
  const imG = has('Insignia de Madera de Gestión');
  const imP = has('Insignia de Madera de Programa') || has('Insignia de Madera');
  const ma = has('Miembro Activo');
  const modules = courses.some((c) => (c.modulesDone ?? 0) > 0);
  const summary = imG
    ? 'Insignia de Madera (Gestión)'
    : imP
      ? 'Insignia de Madera (Programa)'
      : ma
        ? 'Miembro Activo'
        : modules
          ? 'Trayecto en curso'
          : 'Sin formación registrada';
  const over25 = age !== null && age >= 25;
  if (!over25) return { summary, canLeadGroup: 'no', reason: age === null ? 'Sin fecha de nacimiento' : 'Menor de 25 años' };
  if (imG) return { summary, canLeadGroup: 'si', reason: 'IM Gestión' };
  if (imP) return { summary, canLeadGroup: 'con_compromiso', reason: 'Con compromiso de hacer Gestión' };
  return { summary, canLeadGroup: 'no', reason: 'Le falta la Insignia de Madera' };
}

/** Columnas de la planilla de importación de protagonistas. */
export const MEMBER_IMPORT_COLUMNS = [
  { key: 'unidad', label: 'Unidad', required: true, example: 'Unidad Scout Luis Conde' },
  { key: 'apellido', label: 'Apellido', required: true, example: 'Pérez' },
  { key: 'nombre', label: 'Nombre', required: true, example: 'Juana' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', required: true, example: '14/03/2014' },
  { key: 'dni', label: 'DNI', required: false, example: '50123456' },
  { key: 'pequeno_grupo', label: 'Pequeño grupo', required: false, example: 'Patrulla Halcones' },
  { key: 'fecha_ingreso', label: 'Fecha de ingreso', required: false, example: '01/03/2023' },
  { key: 'fecha_promesa', label: 'Fecha de Promesa', required: false, example: '' },
  { key: 'direccion', label: 'Dirección', required: false, example: 'Av. Siempreviva 742' },
  { key: 'telefono', label: 'Teléfono', required: false, example: '' },
  { key: 'email', label: 'Email', required: false, example: '' },
  { key: 'resp1_nombre', label: 'Responsable 1: nombre', required: false, example: 'María Gómez' },
  { key: 'resp1_vinculo', label: 'Responsable 1: vínculo', required: false, example: 'Madre' },
  { key: 'resp1_telefono', label: 'Responsable 1: teléfono', required: false, example: '11 5555-1234' },
  { key: 'resp1_email', label: 'Responsable 1: email', required: false, example: 'maria@example.com' },
  { key: 'resp1_dni', label: 'Responsable 1: DNI', required: false, example: '' },
  { key: 'resp2_nombre', label: 'Responsable 2: nombre', required: false, example: '' },
  { key: 'resp2_vinculo', label: 'Responsable 2: vínculo', required: false, example: '' },
  { key: 'resp2_telefono', label: 'Responsable 2: teléfono', required: false, example: '' },
  { key: 'resp2_email', label: 'Responsable 2: email', required: false, example: '' },
  { key: 'resp2_dni', label: 'Responsable 2: DNI', required: false, example: '' },
] as const;

export type MemberImportKey = (typeof MEMBER_IMPORT_COLUMNS)[number]['key'];
export type MemberImportRow = Partial<Record<MemberImportKey, string>>;

/** Insignia de Madera en Programa (o la IM a secas): es requisito para ser Jefe/a de Campo. La de Gestión sola no alcanza. */
export const hasProgramWoodBadge = (courses: { name: string }[]): boolean =>
  courses.some((c) => /^insignia de madera/i.test(c.name.trim()) && !/gesti[oó]n/i.test(c.name));

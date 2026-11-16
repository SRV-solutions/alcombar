/**
 * Índice de todo lo que se puede hacer en ALCOMBAR: lo usa el buscador global (Ctrl+K) y la página de Ayuda.
 * Cada entrada sabe adónde lleva y quién puede verla. Las palabras clave están pensadas para cómo lo diría
 * un/a dirigente ("nómina", "quién vino", "ficha médica", "patrulla"), no para cómo se llama el módulo.
 */
import type { Action, ModuleKey } from '@shared';
import { TUTORIALS } from '../tutorials/catalog';

export interface HelpContext {
  can: (module: ModuleKey, action: Action, unitId?: string | null) => boolean;
  isSuperadmin: boolean;
  loggedIn: boolean;
}

export interface HelpEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  section: string;
  keywords: string[];
  /** Quién la ve. Sin filtro = cualquier persona con sesión. */
  show?: (ctx: HelpContext) => boolean;
}

const can = (m: ModuleKey, a: Action) => (c: HelpContext) => c.can(m, a);
const any = (...checks: ((c: HelpContext) => boolean)[]) => (c: HelpContext) => checks.some((f) => f(c));

export const HELP_INDEX: HelpEntry[] = [
  // --- Inicio ---
  {
    id: 'inicio',
    title: 'Inicio',
    description: 'Resumen del Grupo: protagonistas por unidad, adultos, documentación al día y cumpleaños del mes.',
    path: '/',
    section: 'Inicio',
    keywords: ['inicio', 'home', 'resumen', 'tablero', 'panel', 'cumpleaños', 'cuántos chicos', 'totales'],
  },

  // --- Protagonistas ---
  {
    id: 'padron',
    title: 'Padrón de protagonistas',
    description: 'La lista de chicos y chicas del Grupo: buscar por nombre o DNI, filtrar por unidad, patrulla o estado.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['padrón', 'nómina', 'nomina', 'lista de chicos', 'chicos', 'chicas', 'protagonistas', 'scouts', 'lobatos', 'castores', 'caminantes', 'rovers', 'buscar chico', 'beneficiarios'],
    show: can('members', 'view'),
  },
  {
    id: 'importar',
    title: 'Importar protagonistas desde una planilla',
    description: 'Cargar a muchos chicos juntos desde Excel o Google Sheets: subís el CSV o pegás las filas, ves la vista previa y confirmás.',
    path: '/protagonistas/importar',
    section: 'Protagonistas',
    keywords: ['importar', 'cargar chicos', 'cargar planilla', 'excel', 'csv', 'google sheets', 'nómina', 'subir lista', 'carga masiva', 'plantilla'],
    show: can('members', 'create'),
  },
  {
    id: 'por-asignar',
    title: 'Protagonistas por asignar unidad',
    description: 'Chicos que se cargaron con su rama pero sin unidad. Tildás a varios y con "Asignar unidad" los pasás a la suya.',
    path: '/protagonistas?unitId=pendientes',
    section: 'Protagonistas',
    keywords: ['por asignar', 'sin unidad', 'asignar unidad', 'repartir', 'ubicar chicos', 'manada', 'unidad scout', 'comunidad', 'mi rincón', 'pendientes'],
    show: any(can('members', 'edit'), can('members', 'view')),
  },
  {
    id: 'alta-protagonista',
    title: 'Dar de alta a un protagonista',
    description: 'Cargar a un chico o chica nuevo con sus datos, unidad y pequeño grupo. Después se suman sus responsables.',
    path: '/protagonistas/nuevo',
    section: 'Protagonistas',
    keywords: ['alta', 'nuevo chico', 'agregar chico', 'inscribir', 'inscripción', 'sumar protagonista', 'ingreso'],
    show: can('members', 'create'),
  },
  {
    id: 'ficha',
    title: 'Ficha de un protagonista',
    description: 'Datos, responsables, documentación, pases, afiliación y asistencia de cada chico. Se abre tocando su nombre en el padrón.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['ficha', 'legajo', 'datos del chico', 'edad', 'dni', 'promesa', 'fecha de ingreso', 'observaciones'],
    show: can('members', 'view'),
  },
  {
    id: 'responsables',
    title: 'Responsables y hermanos',
    description: 'En la ficha, pestaña Responsables: madre, padre o tutor con teléfono, WhatsApp y email. Los hermanos comparten el mismo responsable.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['responsables', 'padres', 'madre', 'padre', 'tutor', 'familia', 'hermanos', 'teléfono', 'whatsapp', 'contacto', 'mail de los padres'],
    show: can('member_contacts', 'view'),
  },
  {
    id: 'documentacion',
    title: 'Documentación y vencimientos',
    description: 'Semáforo por unidad: ficha médica, autorización anual de salidas, uso de imagen y autorización de retiro. Qué falta y qué vence.',
    path: '/documentacion',
    section: 'Protagonistas',
    keywords: ['documentación', 'ficha médica', 'ficha medica', 'autorización', 'autorizaciones', 'uso de imagen', 'retiro', 'salidas', 'vencimiento', 'vencida', 'qué falta', 'papeles', 'semáforo'],
    show: can('member_documents', 'view'),
  },
  {
    id: 'afiliacion',
    title: 'Afiliación anual a SAAC',
    description: 'En la ficha del protagonista, pestaña Pases y afiliación: estado de la afiliación de cada año.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['afiliación', 'afiliacion', 'saac', 'scouts de argentina', 'afiliado', 'seguro'],
    show: can('members', 'view'),
  },
  {
    id: 'pase',
    title: 'Pases de unidad (por edad o por elección)',
    description:
      'Protagonistas → Pases de unidad: los que ya tienen edad para pasar de rama, pasar a varios juntos (por ejemplo de la Pedro Bártolo a la Luis Conde) y el historial del año. Uno solo: botón "Pase de unidad" en su ficha.',
    path: '/pases',
    section: 'Protagonistas',
    keywords: [
      'pase', 'pases', 'pase de rama', 'cambio de unidad', 'cambiar de unidad', 'pasar de unidad', 'pasar a la manada', 'pasar a la unidad',
      'pasar a caminantes', 'pasar a rovers', 'subir de rama', 'por edad', 'cumple 11', 'cumple 14', 'mover chicos', 'otra patrulla', 'otra unidad',
    ],
    show: can('members', 'edit'),
  },
  {
    id: 'baja',
    title: 'Dar de baja a un protagonista',
    description: 'En la ficha → Editar → Estado "Baja". Se conserva su historial; en el padrón se ven con el filtro "Dados de baja".',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['baja', 'dejó de venir', 'se fue', 'egreso', 'inactivo', 'reincorporar'],
    show: can('members', 'edit'),
  },
  {
    id: 'exportar',
    title: 'Exportar el padrón a Excel',
    description: 'En el padrón, botón "Exportar": descarga un CSV que abre en Excel, con los mismos campos de la planilla de importación.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['exportar', 'descargar', 'excel', 'csv', 'planilla', 'listado', 'imprimir lista'],
    show: can('members', 'export'),
  },
  {
    id: 'asistencia',
    title: 'Tomar asistencia',
    description: 'Elegís unidad y fecha, marcás Presente, Ausente, Tarde o Con aviso y guardás. Muestra el porcentaje del año de cada chico.',
    path: '/asistencia',
    section: 'Protagonistas',
    keywords: ['asistencia', 'tomar asistencia', 'presentes', 'quién vino', 'faltas', 'ausentes', 'sábado', 'reunión', 'lista'],
    show: can('attendance', 'view'),
  },

  // --- Grupo ---
  {
    id: 'unidades',
    title: 'Unidades del Grupo',
    description: 'Colonia, manadas, unidades scouts, comunidades caminantes y rover: cuántos protagonistas y adultos tiene cada una.',
    path: '/grupo/unidades',
    section: 'Grupo',
    keywords: ['unidades', 'ramas', 'colonia', 'manada', 'unidad scout', 'comunidad', 'código de unidad'],
    show: can('group', 'view'),
  },
  {
    id: 'pequenos-grupos',
    title: 'Patrullas, seisenas y equipos',
    description: 'En la unidad, la lista de sus pequeños grupos: crear, renombrar o desactivar patrullas, seisenas y equipos.',
    path: '/grupo/unidades',
    section: 'Grupo',
    keywords: ['patrulla', 'patrullas', 'seisena', 'seisenas', 'equipo', 'equipos', 'pequeño grupo', 'pequeños grupos'],
    show: can('small_groups', 'view'),
  },
  {
    id: 'adultos',
    title: 'Adultos',
    description: 'Educadores y colaboradores del Grupo: datos, tótem, cargos de este año, formación y si tienen usuario.',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['adultos', 'dirigentes', 'educadores', 'jefes', 'ayudantes', 'colaboradores', 'tótem', 'totem', 'nómina de adultos'],
    show: can('adults', 'view'),
  },
  {
    id: 'cargos',
    title: 'Cargos por año',
    description: 'En la ficha del adulto: qué cargo tuvo cada año y en qué unidad o equipo (Jefe/a de Unidad, Ayudante, etc.).',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['cargo', 'cargos', 'jefe de unidad', 'ayudante', 'jefe de grupo', 'función', 'funciones', 'rol en el grupo'],
    show: can('adults', 'view'),
  },
  {
    id: 'formacion',
    title: 'Formación de adultos',
    description: 'Insignia de Madera, Miembro Activo, niveles y cursos con fecha y enlace al certificado; Asesor Personal de Formación (APF).',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['formación', 'formacion', 'insignia de madera', 'im', 'miembro activo', 'curso', 'cursos', 'nivel 1', 'nivel 2', 'apf', 'asesor', 'certificado', 'sin formación'],
    show: can('training', 'view'),
  },
  {
    id: 'equipos',
    title: 'Equipos de apoyo',
    description: 'Equipos del Comité Ejecutivo (intendencia, tesorería, etc.) con su responsable e integrantes.',
    path: '/grupo/equipos',
    section: 'Grupo',
    keywords: ['equipos de apoyo', 'comité ejecutivo', 'intendencia', 'tesorería', 'secretaría', 'responsable'],
    show: can('group', 'view'),
  },
  {
    id: 'organigrama',
    title: 'Organigrama',
    description: 'Quién está en cada unidad y equipo este año, armado solo a partir de los cargos cargados.',
    path: '/grupo/organigrama',
    section: 'Grupo',
    keywords: ['organigrama', 'mapa del grupo', 'quién es quién', 'estructura', 'jefatura', 'conducción'],
    show: can('group', 'view'),
  },

  // --- Administración ---
  {
    id: 'usuarios',
    title: 'Usuarios e invitaciones',
    description: 'Crear el acceso de un adulto, asignarle roles y generar el enlace para que elija su contraseña (se lo mandás por WhatsApp).',
    path: '/admin/usuarios',
    section: 'Administración',
    keywords: ['usuarios', 'crear usuario', 'invitar', 'invitación', 'acceso', 'enlace', 'link', 'contraseña olvidada', 'restablecer', 'desactivar usuario'],
    show: can('users', 'view'),
  },
  {
    id: 'roles',
    title: 'Roles y permisos',
    description: 'Qué puede ver y hacer cada rol, módulo por módulo. "Solo su unidad" limita el permiso a la unidad asignada.',
    path: '/admin/roles',
    section: 'Administración',
    keywords: ['roles', 'permisos', 'jefe de unidad', 'educador', 'secretaría', 'tesorería', 'jefatura', 'qué puede ver', 'solo su unidad'],
    show: can('roles', 'view'),
  },
  {
    id: 'auditoria',
    title: 'Auditoría',
    description: 'Quién cargó, cambió o borró qué y cuándo: altas, modificaciones, bajas, ingresos, importaciones y exportaciones.',
    path: '/admin/auditoria',
    section: 'Administración',
    keywords: ['auditoría', 'auditoria', 'historial', 'quién cambió', 'registro de cambios', 'log'],
    show: can('audit', 'view'),
  },
  {
    id: 'catalogos',
    title: 'Catálogos',
    description: 'Tipos de documentación que se controlan y cursos de formación disponibles.',
    path: '/admin/catalogos',
    section: 'Administración',
    keywords: ['catálogos', 'tipos de documento', 'cursos', 'agregar documento', 'configuración'],
    show: any(can('group', 'edit'), can('training', 'create'), can('training', 'edit')),
  },

  // --- Mi cuenta ---
  {
    id: 'perfil',
    title: 'Mi perfil',
    description: 'Tus datos, tus roles, el tema de la app, tus tutoriales y el cambio de contraseña.',
    path: '/perfil',
    section: 'Mi cuenta',
    keywords: ['perfil', 'mi perfil', 'mi cuenta', 'mis datos', 'mis roles'],
  },
  {
    id: 'tema',
    title: 'Modo oscuro',
    description: 'Cambiar entre tema claro, oscuro o el del sistema. También desde el botón de la luna, abajo en el menú.',
    path: '/perfil',
    section: 'Mi cuenta',
    keywords: ['modo oscuro', 'dark mode', 'tema', 'oscuro', 'claro', 'noche', 'colores'],
  },
  {
    id: 'contrasena',
    title: 'Cambiar mi contraseña',
    description: 'En Mi perfil → Cambiar contraseña. Se cierran tus sesiones en otros dispositivos.',
    path: '/perfil',
    section: 'Mi cuenta',
    keywords: ['contraseña', 'clave', 'password', 'cambiar contraseña', 'cambiar clave', 'seguridad'],
  },
];

// --- Tutoriales de Luisito: también se encuentran buscando "tutorial", "ayuda", "cómo hago"... ---
const HELP_WORDS = ['tutorial', 'tutoriales', 'ayuda', 'necesito ayuda', 'como hago', 'cómo', 'guía', 'paso a paso', 'luisito', 'enseñame'];
HELP_INDEX.push(
  {
    id: 'tutoriales',
    title: 'Tutoriales y ayuda con Luisito',
    description: 'La guía con todos los tutoriales para tu rol: te muestro dónde tocar para hacer cada cosa.',
    path: '/perfil#tutoriales',
    section: 'Tutoriales',
    keywords: HELP_WORDS,
  },
  ...TUTORIALS.map((t) => ({
    id: `tutorial-${t.id}`,
    title: `Tutorial: ${t.title}`,
    description: t.description,
    path: `/?tutorial=${t.id}`,
    section: 'Tutoriales',
    keywords: [...HELP_WORDS, ...t.keywords],
    show: t.audience,
  })),
);

export const normalize = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Entradas visibles para quien mira. */
export const visibleHelp = (ctx: HelpContext) => HELP_INDEX.filter((e) => !e.show || e.show(ctx));

/**
 * Búsqueda tolerante: coincide por título, palabra clave o descripción, sin acentos ni mayúsculas.
 * Puntúa más el título y las palabras clave que la descripción; con varias palabras, todas deben aparecer.
 */
export const searchHelp = (ctx: HelpContext, query: string, limit = 8) => {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  return visibleHelp(ctx)
    .map((e) => {
      const title = normalize(e.title);
      const keys = e.keywords.map(normalize);
      const desc = normalize(e.description);
      let score = 0;
      for (const w of words) {
        if (title.startsWith(w)) score += 6;
        else if (title.includes(w)) score += 4;
        if (keys.some((k) => k === w)) score += 5;
        else if (keys.some((k) => k.startsWith(w))) score += 4;
        else if (keys.some((k) => k.includes(w))) score += 3;
        if (desc.includes(w)) score += 1;
      }
      const all = words.every((w) => title.includes(w) || keys.some((k) => k.includes(w)) || desc.includes(w));
      // Los tutoriales quedan un poco por debajo de la pantalla misma, salvo que se busque "tutorial".
      const tutorialPenalty = e.section === 'Tutoriales' && !words.some((w) => 'tutorial'.startsWith(w) || w.startsWith('tutorial')) ? 1 : 0;
      return { entry: e, score: all ? score - tutorialPenalty : 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
};

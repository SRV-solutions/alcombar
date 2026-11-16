/**
 * Tutoriales de Luisito: qué ve cada rol y en qué orden. Cada paso puede llevar a una pantalla (route) y
 * señalar un elemento (target: selector CSS + texto opcional). Si el elemento no está visible (por ejemplo,
 * en el celular con el menú cerrado), Luisito lo explica igual en el centro de la pantalla.
 *
 * El orden de la lista es el recorrido sugerido: al terminar uno, Luisito ofrece el siguiente que le
 * corresponde a esa persona (así va aprendiendo de a poco).
 */
import type { LuisitoPose } from '../components/Luisito';
import type { HelpContext } from '../help/helpIndex';

export interface TutorialStep {
  title: string;
  text: string;
  /** Pantalla a la que lleva antes de mostrar el paso (ruta con query, ej: /protagonistas?unitId=pendientes). */
  route?: string;
  /** Elemento a señalar: selector CSS y, opcionalmente, un texto que tiene que contener. */
  target?: { selector: string; text?: string };
  pose?: LuisitoPose;
  /** Al tocar "Siguiente", Luisito toca el elemento por la persona (ej: abrir una pestaña o una ficha). */
  clickOnNext?: boolean;
}
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  /** Para el buscador ("tutorial asistencia", "ayuda planilla"...). */
  keywords: string[];
  audience: (c: HelpContext) => boolean;
  steps: TutorialStep[];
}

const nav = (path: string) => ({ selector: `.sidebar a[href="${path}"]` });
const button = (text: string) => ({ selector: 'button, a, label, select', text });
// Pestañas: solo [role=tab], así "Documentación" no se confunde con el link del menú.
const tab = (text: string) => ({ selector: '[role=tab]', text });
const firstRow = { selector: 'table tbody tr.clickable' };

export const TUTORIALS: Tutorial[] = [
  {
    id: 'bienvenida',
    title: 'Primeros pasos en ALCOMBAR',
    description: 'El menú, el buscador, el modo oscuro y dónde volver a ver estos tutoriales.',
    keywords: ['primeros pasos', 'empezar', 'inicio', 'cómo se usa', 'intro', 'introducción'],
    audience: (c) => c.loggedIn,
    steps: [
      {
        pose: 'wave',
        title: '¡Hola! Soy Luisito 👋',
        text: 'Soy Luisito, del Grupo Scout 155. Te voy a mostrar dónde tocar para hacer cada cosa. Podés omitir el tutorial cuando quieras: después lo volvés a ver desde tu perfil.',
      },
      {
        route: '/',
        target: { selector: '.sidebar .nav' },
        pose: 'point',
        title: 'El menú',
        text: 'Desde acá entrás a cada sección: protagonistas, asistencia, documentación, unidades, adultos… Solo ves lo que corresponde a tu rol en el Grupo.',
      },
      {
        target: { selector: '.gsearch-input' },
        pose: 'point',
        title: 'El buscador',
        text: 'Escribí lo que querés hacer, como "asistencia", "ficha médica" o "patrulla", o el nombre de un chico, y te llevo directo. También se abre con Ctrl+K.',
      },
      {
        target: { selector: '.sidebar .theme-toggle' },
        pose: 'point',
        title: 'Modo oscuro',
        text: 'Con este botón pasás de tema claro a oscuro, ideal para los fogones a la noche 🔥.',
      },
      {
        target: { selector: '.sidebar a[href="/perfil"]' },
        pose: 'think',
        title: 'Tu perfil y tus tutoriales',
        text: 'En Mi perfil están tus datos, el tema, el cambio de contraseña y la guía con todos los tutoriales para repasarlos cuando quieras.',
      },
      {
        target: nav('/ayuda'),
        pose: 'point',
        title: 'Ayuda',
        text: 'Si no te acordás dónde estaba algo, en Ayuda está el índice completo de todo lo que se puede hacer.',
      },
      { pose: 'cheer', title: '¡Siempre listos! ⚜️', text: 'Ya conocés lo básico. Si querés, seguimos con lo que más vas a usar.' },
    ],
  },

  // ---------- Protagonistas ----------
  {
    id: 'importar-protagonistas',
    title: 'Cargar chicos desde una planilla',
    description: 'Importar la nómina desde Excel o Google Sheets, con vista previa antes de guardar.',
    keywords: ['importar', 'planilla', 'excel', 'csv', 'cargar chicos', 'nómina', 'google sheets'],
    audience: (c) => c.can('members', 'create'),
    steps: [
      { route: '/protagonistas', target: nav('/protagonistas'), pose: 'point', title: 'El padrón', text: 'Acá está la lista de todos los chicos y chicas del Grupo.' },
      { target: button('Importar planilla'), pose: 'point', title: 'Importar planilla', text: 'Con este botón cargás a muchos juntos. Te llevo.' },
      {
        route: '/protagonistas/importar',
        target: button('Descargar plantilla'),
        pose: 'point',
        title: 'La plantilla',
        text: 'Si no tenés planilla, bajá la plantilla y completala. Obligatorio: unidad, apellido, nombre y fecha de nacimiento. Lo demás es opcional.',
      },
      {
        target: { selector: '.dropzone' },
        pose: 'point',
        title: 'Subí el archivo',
        text: 'Arrastrá el CSV acá o tocá para elegirlo. En Google Sheets: Archivo → Descargar → CSV. En Excel: Guardar como → CSV UTF-8.',
      },
      {
        target: { selector: 'textarea' },
        pose: 'point',
        title: 'O pegá las filas',
        text: 'Más fácil todavía: seleccioná las filas en la planilla (con los encabezados), copiá y pegá acá.',
      },
      {
        pose: 'think',
        title: 'La vista previa',
        text: 'Antes de guardar te muestro cada fila: Nuevo, Actualiza (ya estaba cargado) o Error. Las filas con error no se importan; las corregís en la planilla y la volvés a subir sin duplicar a nadie.',
      },
      { pose: 'cheer', title: '¡Listo!', text: 'Al confirmar, los chicos quedan en el padrón con sus responsables. Los hermanos comparten el mismo responsable.' },
    ],
  },
  {
    id: 'asignar-unidades',
    title: 'Repartir protagonistas por unidad',
    description: 'Ubicar en su unidad a los chicos que se cargaron solo con su rama.',
    keywords: ['asignar unidad', 'por asignar', 'sin unidad', 'repartir', 'manada', 'unidad scout', 'comunidad'],
    audience: (c) => c.can('members', 'edit'),
    steps: [
      {
        route: '/protagonistas?unitId=pendientes',
        pose: 'wave',
        title: 'Chicos por asignar',
        text: 'Algunos chicos se cargaron con su rama pero sin unidad (por ejemplo, Manada sin saber si Isla Lukanon o Pueblo Libre). Este filtro los muestra.',
      },
      {
        target: { selector: 'table input[type=checkbox]' },
        pose: 'point',
        title: 'Tildá a los tuyos',
        text: 'Marcá a los chicos que van en la misma unidad. Podés tildar varios a la vez.',
      },
      {
        target: button('Asignar unidad'),
        pose: 'point',
        title: 'Asignar unidad',
        text: 'Tocá "Asignar unidad" y elegí a cuál van. Solo podés asignar a las unidades en las que tenés permiso.',
      },
      { pose: 'cheer', title: '¡Ya están en casa!', text: 'Los chicos asignados aparecen en el padrón, la asistencia y la documentación de su unidad.' },
    ],
  },
  {
    id: 'ficha-protagonista',
    title: 'La ficha de un protagonista',
    description: 'Datos, responsables, documentación, pases, afiliación y asistencia de cada chico.',
    keywords: ['ficha', 'legajo', 'datos del chico', 'responsables', 'padres', 'whatsapp', 'hermanos'],
    audience: (c) => c.can('members', 'view'),
    steps: [
      {
        route: '/protagonistas',
        target: firstRow,
        clickOnNext: true,
        pose: 'point',
        title: 'Abrí una ficha',
        text: 'Tocando el nombre de un chico se abre su ficha. Te abro el primero de la lista.',
      },
      { target: tab('Datos'), pose: 'point', title: 'Datos', text: 'Fecha de nacimiento y edad, DNI, ingreso, Promesa, contacto y sus hermanos en el Grupo.' },
      {
        target: tab('Responsables'),
        clickOnNext: true,
        pose: 'point',
        title: 'Responsables',
        text: 'Madre, padre o tutor con su teléfono. Desde acá les escribís por WhatsApp con un toque.',
      },
      {
        target: button('Agregar'),
        pose: 'point',
        title: 'Agregar responsable',
        text: 'Podés cargar uno nuevo o vincular uno que ya existe (por ejemplo, la mamá de un hermano), así no se carga dos veces.',
      },
      {
        target: tab('Documentación'),
        clickOnNext: true,
        pose: 'point',
        title: 'Documentación',
        text: 'Ficha médica y autorizaciones: si se entregó y cuándo vence. No se guarda el contenido, solo el control.',
      },
      { target: tab('Pases y afiliación'), pose: 'point', title: 'Pases y afiliación', text: 'El historial de pases de rama y la afiliación anual a SAAC.' },
      { target: tab('Asistencia'), pose: 'point', title: 'Asistencia', text: 'Los últimos encuentros y su porcentaje de asistencia.' },
      { target: button('Editar'), pose: 'think', title: 'Editar o dar de baja', text: 'Con "Editar" cambiás sus datos o su estado. Si deja de venir, dalo de baja: se conserva su historial.' },
      { pose: 'cheer', title: '¡Todo en un solo lugar!', text: 'Ya no hace falta buscar en distintas planillas.' },
    ],
  },
  {
    id: 'tomar-asistencia',
    title: 'Tomar asistencia',
    description: 'Marcar quién vino a cada encuentro, desde la compu o el celular.',
    keywords: ['asistencia', 'presentes', 'quién vino', 'faltas', 'sábado', 'lista'],
    audience: (c) => c.can('attendance', 'edit'),
    steps: [
      { route: '/asistencia', target: nav('/asistencia'), pose: 'point', title: 'Asistencia', text: 'Desde acá tomás la asistencia de tu unidad.' },
      { target: { selector: 'select[aria-label="Unidad"]' }, pose: 'point', title: 'La unidad', text: 'Elegí la unidad. Si estás en una sola, ya aparece elegida.' },
      { target: { selector: 'input[type=date]' }, pose: 'point', title: 'La fecha', text: 'Por defecto es el último sábado. Podés elegir otro día, pero no uno futuro.' },
      {
        target: { selector: '.att-table .segmented' },
        pose: 'point',
        title: 'Marcá a cada uno',
        text: 'Presente, Ausente, Tarde o Con aviso. Si tocás de nuevo el mismo, se desmarca.',
      },
      { target: button('Resto presentes'), pose: 'point', title: 'Resto presentes', text: 'Atajo: marca como presentes a todos los que todavía no marcaste.' },
      { target: button('Guardar asistencia'), pose: 'point', title: 'Guardar', text: 'No te olvides de guardar. Después podés corregirla cuando quieras.' },
      { target: { selector: '.card', text: 'Encuentros' }, pose: 'think', title: 'Encuentros del año', text: 'Acá ves las fechas en que ya se tomó asistencia. Tocando una, la abrís.' },
      { pose: 'cheer', title: '¡Listo!', text: 'Con la asistencia cargada, cada ficha muestra el porcentaje del año.' },
    ],
  },
  {
    id: 'documentacion',
    title: 'Controlar la documentación',
    description: 'El semáforo de fichas médicas y autorizaciones de cada unidad.',
    keywords: ['documentación', 'ficha médica', 'autorizaciones', 'vencimientos', 'semáforo', 'papeles'],
    audience: (c) => c.can('member_documents', 'view'),
    steps: [
      { route: '/documentacion', target: nav('/documentacion'), pose: 'point', title: 'Documentación', text: 'Un tablero por unidad con lo que entregó cada chico.' },
      { target: { selector: 'select[aria-label="Unidad"]' }, pose: 'point', title: 'Elegí la unidad', text: 'Cambiá de unidad desde acá.' },
      {
        target: { selector: '.doc-cell' },
        pose: 'point',
        title: 'El semáforo',
        text: 'Verde: al día. Amarillo: vence en menos de 30 días. Rojo: vencido. Gris: falta. Si tenés permiso, tocando la celda marcás la entrega y el vencimiento.',
      },
      { target: { selector: 'label.checkbox', text: 'Solo con pendientes' }, pose: 'point', title: 'Solo pendientes', text: 'Para ver rápido a quién le falta algo antes de una salida.' },
      { pose: 'cheer', title: '¡A salir tranquilos!', text: 'En Inicio también ves el porcentaje al día de cada unidad.' },
    ],
  },
  {
    id: 'pase-de-unidad',
    title: 'Pase de unidad',
    description: 'Pasar a un chico a otra unidad (por ejemplo, de la Manada a la Unidad Scout) dejando el historial.',
    keywords: ['pase', 'pase de rama', 'cambio de unidad', 'pasar a la manada', 'pasar de rama', 'subir de rama'],
    audience: (c) => c.can('members', 'edit'),
    steps: [
      {
        route: '/protagonistas',
        target: firstRow,
        clickOnNext: true,
        pose: 'point',
        title: 'Abrí la ficha',
        text: 'El pase se hace desde la ficha del chico. Te abro una para mostrarte.',
      },
      {
        target: button('Pase de unidad'),
        pose: 'point',
        title: 'Pase de unidad',
        text: 'Elegís la unidad nueva, el pequeño grupo y la fecha. Queda registrado de dónde a dónde pasó y cuándo.',
      },
      { target: tab('Pases y afiliación'), pose: 'think', title: 'El historial', text: 'Todos los pases quedan en esta pestaña.' },
      { pose: 'cheer', title: '¡Buen camino!', text: 'Si solo hay que corregir un error de carga, mejor editá la ficha en vez de hacer un pase.' },
    ],
  },

  // ---------- Grupo ----------
  {
    id: 'unidades-y-patrullas',
    title: 'Unidades y pequeños grupos',
    description: 'Las unidades del Grupo y sus patrullas, seisenas o equipos.',
    keywords: ['unidades', 'patrullas', 'seisenas', 'equipos', 'pequeños grupos', 'ramas'],
    audience: (c) => c.can('group', 'view'),
    steps: [
      { route: '/grupo/unidades', target: nav('/grupo/unidades'), pose: 'point', title: 'Unidades', text: 'Todas las unidades, por rama, con cuántos protagonistas y adultos tiene cada una.' },
      {
        target: { selector: 'table a[href^="/grupo/unidades/"]' },
        clickOnNext: true,
        pose: 'point',
        title: 'Entrá a una unidad',
        text: 'Tocando el nombre ves su detalle. Te abro una.',
      },
      {
        target: button('Agregar'),
        pose: 'point',
        title: 'Pequeños grupos',
        text: 'Acá se crean las patrullas, seisenas o equipos de la unidad. Después, en cada ficha, elegís a cuál pertenece cada chico.',
      },
      { pose: 'cheer', title: '¡Listo!', text: 'También ves los protagonistas y los adultos de la unidad en esta misma pantalla.' },
    ],
  },
  {
    id: 'adultos-y-cargos',
    title: 'Adultos, cargos y formación',
    description: 'La ficha de cada adulto, sus cargos por año y su formación.',
    keywords: ['adultos', 'dirigentes', 'educadores', 'cargos', 'formación', 'insignia de madera', 'apf'],
    audience: (c) => c.can('adults', 'view'),
    steps: [
      { route: '/adultos', target: nav('/adultos'), pose: 'point', title: 'Adultos', text: 'Todos los adultos del Grupo con sus cargos de este año y su formación.' },
      { target: button('Nuevo adulto'), pose: 'point', title: 'Nuevo adulto', text: 'Para sumar a alguien que se incorpora al Grupo.' },
      { target: firstRow, clickOnNext: true, pose: 'point', title: 'Abrí una ficha', text: 'Tocando un nombre ves su ficha. Te abro la primera.' },
      { target: button('Agregar cargo'), pose: 'point', title: 'Cargos por año', text: 'Qué cargo tiene cada año y en qué unidad o equipo. Con esto se arma solo el organigrama.' },
      { target: button('Registrar formación'), pose: 'point', title: 'Formación', text: 'Insignia de Madera, Miembro Activo, niveles y cursos, con la fecha y el enlace al certificado.' },
      { pose: 'cheer', title: '¡Gracias por tu servicio!', text: 'En Inicio ves cuántos adultos no tienen formación registrada.' },
    ],
  },
  {
    id: 'organigrama',
    title: 'El organigrama',
    description: 'Quién está en cada unidad y equipo, armado con los cargos cargados.',
    keywords: ['organigrama', 'mapa del grupo', 'quién es quién', 'estructura'],
    audience: (c) => c.can('group', 'view'),
    steps: [
      { route: '/grupo/organigrama', target: nav('/grupo/organigrama'), pose: 'point', title: 'Organigrama', text: 'Se arma solo con los cargos de cada adulto: no hay que dibujarlo.' },
      { target: { selector: 'select[aria-label="Año"]' }, pose: 'point', title: 'El año', text: 'Podés ver cómo estaba el Grupo en años anteriores.' },
      { target: { selector: '.org-unit' }, pose: 'think', title: 'Cada unidad', text: 'Con el color de su rama y sus adultos. Si falta alguien, cargale el cargo en su ficha.' },
      { pose: 'cheer', title: '¡Listo!', text: 'Ideal para mostrar en el Consejo de Grupo.' },
    ],
  },

  // ---------- Administración ----------
  {
    id: 'usuarios-e-invitaciones',
    title: 'Usuarios e invitaciones',
    description: 'Darle acceso a un adulto y mandarle el enlace para que elija su contraseña.',
    keywords: ['usuarios', 'crear usuario', 'invitar', 'invitación', 'enlace', 'acceso', 'contraseña'],
    audience: (c) => c.can('users', 'create'),
    steps: [
      { route: '/admin/usuarios', target: nav('/admin/usuarios'), pose: 'point', title: 'Usuarios', text: 'Quiénes tienen acceso a la app y con qué roles. No hay registro público: los usuarios se crean acá.' },
      {
        target: button('Nuevo usuario'),
        pose: 'point',
        title: 'Nuevo usuario',
        text: 'Elegís al adulto, su email y sus roles. Los roles de unidad (Jefe/a de Unidad, Educador/a) piden la unidad.',
      },
      {
        target: button('Generar enlace'),
        pose: 'point',
        title: 'El enlace de acceso',
        text: 'Genera un enlace de un solo uso para que la persona elija su contraseña (o la restablezca si se la olvidó). Copialo y mandáselo por WhatsApp.',
      },
      { pose: 'cheer', title: '¡Bienvenidos!', text: 'Si alguien deja el Grupo, desactivá su usuario: se conserva lo que cargó.' },
    ],
  },
  {
    id: 'roles-y-permisos',
    title: 'Roles y permisos',
    description: 'Qué puede ver y hacer cada rol, y qué significa "solo su unidad".',
    keywords: ['roles', 'permisos', 'solo su unidad', 'jefe de unidad', 'educador', 'qué puede ver'],
    audience: (c) => c.can('roles', 'view'),
    steps: [
      { route: '/admin/roles', target: nav('/admin/roles'), pose: 'point', title: 'Roles', text: 'Cada rol agrupa permisos: ver, crear, editar, eliminar, exportar…' },
      { target: firstRow, pose: 'point', title: 'Abrí un rol', text: 'Tocando un rol ves su matriz de permisos módulo por módulo.' },
      {
        pose: 'think',
        title: '"Solo su unidad"',
        text: 'En los roles de unidad, un permiso marcado como "solo su unidad" vale únicamente para la unidad asignada. Si no, vale para todo el Grupo: por ejemplo, un educador ve a los chicos de todas las unidades pero edita solo los suyos.',
      },
      { pose: 'cheer', title: '¡Listo!', text: 'Los permisos del Superadmin están fijos, así el Grupo nunca se queda sin administrador.' },
    ],
  },
  {
    id: 'auditoria',
    title: 'La auditoría',
    description: 'Quién cambió qué y cuándo.',
    keywords: ['auditoría', 'historial', 'quién cambió', 'registro'],
    audience: (c) => c.can('audit', 'view'),
    steps: [
      { route: '/admin/auditoria', target: nav('/admin/auditoria'), pose: 'point', title: 'Auditoría', text: 'Cada alta, cambio, baja, ingreso, importación y exportación queda registrada.' },
      { target: { selector: 'select' }, pose: 'point', title: 'Filtros', text: 'Filtrá por tipo de dato o por acción.' },
      { target: firstRow, pose: 'point', title: 'El detalle', text: 'Tocando una fila ves qué valores cambiaron: antes → después.' },
      { pose: 'cheer', title: '¡Todo queda registrado!', text: 'Así hay confianza en los datos de todos.' },
    ],
  },

  // ---------- Mi cuenta ----------
  {
    id: 'mi-perfil',
    title: 'Tu perfil',
    description: 'Tema claro u oscuro, tus tutoriales y el cambio de contraseña.',
    keywords: ['perfil', 'mi cuenta', 'tema', 'modo oscuro', 'contraseña'],
    audience: (c) => c.loggedIn,
    steps: [
      { route: '/perfil', target: { selector: '.sidebar a[href="/perfil"]' }, pose: 'point', title: 'Mi perfil', text: 'Tus datos y tus roles en el Grupo.' },
      { target: { selector: '.theme-segmented' }, pose: 'point', title: 'Apariencia', text: 'Claro, oscuro o como tenga configurado tu celular o tu compu.' },
      { target: { selector: '#tutoriales' }, pose: 'think', title: 'Tus tutoriales', text: 'Todos los tutoriales para tu rol, con cuáles hiciste. Los podés repasar cuando quieras.' },
      { target: { selector: 'form', text: 'Contraseña actual' }, pose: 'point', title: 'Cambiar contraseña', text: 'Mínimo 10 caracteres. Al cambiarla se cierran tus sesiones en otros dispositivos.' },
      { pose: 'cheer', title: '¡Siempre listos!', text: 'Cualquier duda, buscá en el buscador o en Ayuda.' },
    ],
  },
];

/** Tutoriales que le corresponden a quien mira, en el orden sugerido. */
export const tutorialsFor = (c: HelpContext) => TUTORIALS.filter((t) => t.audience(c));
export const tutorialById = (id: string) => TUTORIALS.find((t) => t.id === id);

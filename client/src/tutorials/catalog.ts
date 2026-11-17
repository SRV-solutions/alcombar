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
    title: 'Pases de unidad',
    description: 'Pasar chicos de unidad: por edad (cambio de rama) o por elección (por ejemplo, de la Pedro Bártolo a la Luis Conde), de a varios.',
    keywords: ['pase', 'pases', 'pase de rama', 'cambio de unidad', 'pasar a la manada', 'pasar de rama', 'subir de rama', 'por edad', 'mover chicos'],
    audience: (c) => c.can('members', 'edit'),
    steps: [
      {
        route: '/pases',
        target: nav('/pases'),
        pose: 'point',
        title: 'Pases de unidad',
        text: 'Desde acá pasás chicos de una unidad a otra, de a uno o de a muchos. Cada pase queda en el historial de cada chico.',
      },
      {
        target: tab('Sugeridos por edad'),
        pose: 'think',
        title: 'Los que ya tienen edad',
        text: 'Te muestro quiénes cumplen la edad máxima de su rama (a fin de año o a hoy), agrupados por unidad. Los tildás y tocás "Pasar" para mandarlos a la rama siguiente.',
      },
      {
        target: tab('Elegir chicos'),
        clickOnNext: true,
        pose: 'point',
        title: 'Elegir chicos a mano',
        text: 'Para cambios dentro de la misma rama (por ejemplo, de una Unidad Scout a la otra): elegís la unidad de origen y tildás a los que se van.',
      },
      {
        target: button('Pasar a otra unidad'),
        pose: 'point',
        title: 'Hacer el pase',
        text: 'Elegís la unidad nueva, el pequeño grupo, la fecha y el motivo: "por edad" o "por elección" (se completa solo según la rama, pero lo podés cambiar).',
      },
      { target: tab('Historial'), pose: 'think', title: 'El historial del año', text: 'Todos los pases del año, con fecha, de dónde a dónde y el motivo.' },
      {
        pose: 'cheer',
        title: '¡Buen camino!',
        text: 'Para uno solo también está el botón "Pase de unidad" en su ficha. Si solo hay que corregir un error de carga, mejor editá la ficha en vez de hacer un pase.',
      },
    ],
  },

  // ---------- Programa ----------
  {
    id: 'fichas-de-actividad',
    title: 'Fichas de actividad',
    description: 'Planificar una actividad, mandarla a revisión, aprobarla, imprimirla y evaluarla después.',
    keywords: ['ficha', 'actividad', 'planificar', 'aprobar', 'evaluar', 'imprimir'],
    audience: (c) => c.can('activities', 'view'),
    steps: [
      {
        route: '/programa',
        target: nav('/programa'),
        pose: 'point',
        title: 'Fichas de actividad',
        text: 'Acá están las fichas de tu unidad: cada actividad planificada con sus objetivos, competencias, desarrollo, materiales y seguridad.',
      },
      {
        target: { selector: 'select[aria-label="Estado"]' },
        pose: 'point',
        title: 'Filtrar',
        text: 'Podés ver solo las de una unidad, un estado o un ciclo, o buscar por nombre.',
      },
      {
        target: { selector: '.page-header .actions a[href^="/programa/fichas/nueva"]' },
        pose: 'point',
        title: 'Nueva ficha',
        text: 'Completás la actividad, destinatarios y propósito (área y competencias), el desarrollo por momentos y la seguridad. Si es fuera de la sede, te pido los datos del lugar.',
      },
      {
        pose: 'think',
        title: 'El circuito de la ficha',
        text: 'Borrador → "Enviar a revisión" → Jefatura la aprueba o la devuelve con un comentario → después de hacerla, "Marcar realizada" y "Evaluar". Si editás una ficha aprobada, vuelve a borrador.',
      },
      {
        pose: 'point',
        title: 'Imprimir y duplicar',
        text: 'Desde cada ficha la podés imprimir o guardar en PDF, y duplicarla para otra unidad o para repetirla.',
      },
      { pose: 'cheer', title: '¡A jugar!', text: 'Con buenas fichas, el sábado sale solo y queda todo para la próxima vez.' },
    ],
  },
  {
    id: 'banco-de-fichas',
    title: 'Banco de fichas',
    description: 'Buscar actividades que ya hicieron otras unidades y usarlas en la tuya.',
    keywords: ['banco', 'ideas', 'reutilizar', 'copiar ficha'],
    audience: (c) => c.can('activities', 'view'),
    steps: [
      {
        route: '/programa/banco',
        target: nav('/programa/banco'),
        pose: 'point',
        title: 'Banco de fichas',
        text: 'Todas las fichas aprobadas, realizadas y evaluadas del Grupo, de todas las unidades.',
      },
      {
        target: { selector: 'select[aria-label="Rama"]' },
        pose: 'point',
        title: 'Buscar',
        text: 'Filtrá por rama, área, competencia, tipo de actividad y lugar, o escribí una palabra.',
      },
      {
        target: firstRow,
        pose: 'think',
        title: 'Vista previa',
        text: 'Tocá una ficha para verla. Con "Usar en mi unidad" se copia como borrador para tu unidad (si es de otra rama, adapto las edades).',
      },
      { pose: 'cheer', title: '¡No hace falta inventar todo!', text: 'Lo que funcionó en una unidad le sirve a las demás.' },
    ],
  },
  {
    id: 'ciclos-de-programa',
    title: 'Ciclos de programa',
    description: 'Armar el ciclo: diagnóstico, propósitos, actividades y evaluación.',
    keywords: ['ciclo', 'diagnóstico', 'propósitos', 'evaluación'],
    audience: (c) => c.can('activities', 'view'),
    steps: [
      {
        route: '/programa/ciclos',
        target: nav('/programa/ciclos'),
        pose: 'point',
        title: 'Ciclos de programa',
        text: 'Cada unidad trabaja por ciclos. Acá ves los ciclos de cada unidad con sus fechas y en qué fase están.',
      },
      {
        target: button('Nuevo ciclo'),
        pose: 'point',
        title: 'Nuevo ciclo',
        text: 'Elegís la unidad, el nombre y las fechas. Después vas completando el diagnóstico, los propósitos y la evaluación.',
      },
      {
        pose: 'think',
        title: 'Adentro del ciclo',
        text: 'Desde el ciclo creás las fichas de sus actividades ("Nueva ficha en este ciclo") y ves las revisiones de fin de ciclo de los chicos.',
      },
      { pose: 'cheer', title: '¡Ciclo en marcha!', text: 'Diagnóstico, propósitos, actividades y evaluación: todo en un lugar.' },
    ],
  },
  {
    id: 'programa-del-sabado',
    title: 'Programa del sábado',
    description: 'Armar el cronograma de la reunión por momentos e imprimirlo.',
    keywords: ['sábado', 'reunión', 'cronograma', 'horarios', 'momentos'],
    audience: (c) => c.can('activities', 'view'),
    steps: [
      {
        route: '/programa/sabado',
        target: nav('/programa/sabado'),
        pose: 'point',
        title: 'Programa del sábado',
        text: 'El cronograma de la reunión: qué se hace en cada momento, a qué hora y quién está a cargo.',
      },
      {
        target: button('Próximo sábado'),
        pose: 'point',
        title: 'Elegir la fecha',
        text: 'Por defecto te muestro el próximo sábado. También podés abrir uno que ya guardaste.',
      },
      {
        target: { selector: 'button.meeting-add' },
        pose: 'point',
        title: 'Agregar momentos',
        text: 'Cada momento tiene hora, duración, actividad (o una ficha ya cargada) y responsable. Los podés subir y bajar para ordenarlos.',
      },
      {
        target: button('Guardar programa'),
        pose: 'think',
        title: 'Guardar e imprimir',
        text: 'Guardalo para que lo vea el resto del equipo, e imprimilo para tenerlo a mano en la reunión.',
      },
      { pose: 'cheer', title: '¡Siempre listos!', text: 'Con el programa armado, el sábado fluye.' },
    ],
  },
  {
    id: 'progresion',
    title: 'Progresión personal',
    description: 'Seguir la etapa, las competencias, los roles y las revisiones de cada protagonista.',
    keywords: ['progresión', 'etapas', 'competencias', 'insignia', 'revisión'],
    audience: (c) => c.can('progression', 'view'),
    steps: [
      {
        route: '/progresion',
        target: nav('/progresion'),
        pose: 'point',
        title: 'Progresión',
        text: 'El camino de cada protagonista de tu unidad: etapa, insignia, competencias por área y última revisión.',
      },
      {
        target: { selector: '.toolbar select[aria-label="Unidad"]' },
        pose: 'point',
        title: 'Unidad y año',
        text: 'Elegí la unidad y el año que querés ver.',
      },
      {
        target: { selector: '.std-grid' },
        pose: 'think',
        title: 'Estándares de la unidad',
        text: 'Cuántas actividades de cada tipo hizo la unidad en el año (para Scouts, con las metas de descubiertas, proyectos y noches de campamento).',
      },
      {
        target: { selector: 'table.progression-board' },
        pose: 'point',
        title: 'Cada protagonista',
        text: 'Tocá un chico para ver y cargar su progresión: registrar etapa, elegir competencias y marcar cómo va cada una, roles por ciclo, revisiones de fin de ciclo y especialidades.',
      },
      {
        pose: 'think',
        title: 'También desde la ficha',
        text: 'En la ficha de cada protagonista hay una pestaña "Progresión" con el resumen y el botón "Abrir en Progresión".',
      },
      { pose: 'cheer', title: '¡Buen camino!', text: 'Así cada chico sabe dónde está y hacia dónde va.' },
    ],
  },
  {
    id: 'esquemas-y-catalogos',
    title: 'Esquemas y catálogos',
    description: 'Cargar las competencias, áreas, etapas y especialidades de cada rama.',
    keywords: ['esquema', 'catálogo', 'competencias', 'etapas', 'especialidades', 'importar'],
    audience: (c) => c.can('progression', 'view'),
    steps: [
      {
        route: '/progresion/esquemas',
        pose: 'point',
        title: 'Esquemas y catálogos',
        text: 'Lo que usa la progresión de cada rama. Lo editan Jefatura de Grupo y el equipo de Programa; el resto lo ve.',
      },
      {
        target: { selector: 'select[aria-label="Rama"]' },
        pose: 'point',
        title: 'Elegí la rama',
        text: 'Cada rama tiene sus propias competencias, etapas y especialidades.',
      },
      {
        target: tab('Competencias'),
        pose: 'point',
        title: 'Competencias',
        text: 'Con "Importar lista" pegás las competencias del cuadernillo de la rama, una por renglón, y te muestro la vista previa antes de crearlas.',
      },
      {
        target: tab('Etapas'),
        pose: 'think',
        title: 'Etapas',
        text: 'El esquema de etapas de la rama (por ejemplo, Rumbo Sur en Scouts). Las ramas "a definir" se completan acá.',
      },
      {
        target: tab('Especialidades'),
        pose: 'point',
        title: 'Especialidades',
        text: 'El catálogo de especialidades que después se registran en cada protagonista.',
      },
      { pose: 'cheer', title: '¡Listo el catálogo!', text: 'Con esto cargado, cada dirigente puede llevar la progresión de sus chicos.' },
    ],
  },

  // ---------- Tesorería ----------
  {
    id: 'contabilidad',
    title: 'La contabilidad del Grupo',
    description: 'Registrar ingresos y gastos, armar el presupuesto, ver reportes y cerrar el mes.',
    keywords: ['contabilidad', 'tesorería', 'gastos', 'ingresos', 'presupuesto', 'cierre'],
    audience: (c) => c.can('accounting', 'view'),
    steps: [
      {
        route: '/contabilidad',
        target: nav('/contabilidad'),
        pose: 'point',
        title: 'Contabilidad',
        text: 'Acá está la plata del Grupo: saldo de cada cuenta (caja, banco, Mercado Pago), ingresos y gastos del año.',
      },
      {
        target: tab('Movimientos'),
        clickOnNext: true,
        pose: 'point',
        title: 'Movimientos',
        text: 'Cada ingreso y cada gasto, con su cuenta, categoría y comprobante.',
      },
      {
        target: button('Registrar gasto'),
        pose: 'point',
        title: 'Registrar',
        text: 'Con "Registrar ingreso" o "Registrar gasto" lo cargás. Si es de un evento o campamento, lo vinculás y queda en su rendición. Para pasar plata entre cuentas está "Transferencia entre cuentas".',
      },
      {
        pose: 'think',
        title: 'Corregir sin borrar',
        text: 'Si te equivocaste en un mes ya cerrado, se usa "Anular": crea un contra-asiento con fecha de hoy y queda el registro de todo.',
      },
      {
        target: tab('Presupuesto'),
        pose: 'point',
        title: 'Presupuesto',
        text: 'Lo previsto para el año por categoría, comparado con lo real. Jefatura o Tesorería lo aprueban.',
      },
      {
        target: tab('Reportes'),
        pose: 'point',
        title: 'Reportes',
        text: 'Caja por período y cuánto dejó (o costó) cada evento y campamento.',
      },
      {
        target: tab('Cuentas y cierres'),
        pose: 'think',
        title: 'Cerrar el mes',
        text: 'Cuando controlaste el mes, lo cerrás y ya no se puede modificar. Acá también se crean cuentas y categorías.',
      },
      { pose: 'cheer', title: '¡Cuentas claras!', text: 'Con todo registrado, rendir cuentas al Consejo es un trámite.' },
    ],
  },
  {
    id: 'cuotas-y-pagos',
    title: 'Cuotas y pagos',
    description: 'Ver quién debe, armar el plan de cuotas, generar las cuotas del mes y las becas.',
    keywords: ['cuotas', 'deudores', 'generar cuotas', 'becas', 'afiliación'],
    audience: (c) => c.can('fees', 'view'),
    steps: [
      {
        route: '/contabilidad/cuotas',
        target: nav('/contabilidad/cuotas'),
        pose: 'point',
        title: 'Cuotas y pagos',
        text: 'Las cuotas, la afiliación y los cargos de campamento de cada protagonista.',
      },
      {
        target: tab('Deudores'),
        pose: 'point',
        title: 'Quién debe',
        text: 'La lista de quién debe y cuánto, con lo vencido primero. Se puede filtrar por unidad e imprimir.',
      },
      {
        target: tab('Plan de cuotas'),
        pose: 'point',
        title: 'El plan del año',
        text: 'El valor de la cuota, el día de vencimiento, los meses que se cobran, la afiliación y el descuento por hermanos.',
      },
      {
        target: tab('Generar cuotas'),
        pose: 'think',
        title: 'Generar las cuotas',
        text: 'Elegís el mes, mirás la vista previa y las generás para todos los protagonistas activos. Si ya estaban generadas, no se duplican.',
      },
      {
        target: tab('Becas'),
        pose: 'point',
        title: 'Becas',
        text: 'Los chicos con descuento. Se cargan desde la pestaña Pagos de su ficha.',
      },
      {
        pose: 'cheer',
        title: '¿Y los pagos?',
        text: 'Se registran en la ficha de cada protagonista, pestaña "Pagos". Hay un tutorial para eso.',
      },
    ],
  },
  {
    id: 'registrar-pago',
    title: 'Registrar un pago',
    description: 'Cobrar una cuota o un campamento desde la ficha del protagonista e imprimir el recibo.',
    keywords: ['pago', 'cobrar', 'recibo', 'cuota', 'pagos'],
    audience: (c) => c.can('fees', 'create'),
    steps: [
      {
        route: '/protagonistas',
        target: firstRow,
        clickOnNext: true,
        pose: 'point',
        title: 'Abrí la ficha',
        text: 'Los pagos se registran en la ficha de cada protagonista. Abramos una.',
      },
      {
        target: tab('Pagos'),
        clickOnNext: true,
        pose: 'point',
        title: 'La pestaña Pagos',
        text: 'Acá ves lo que debe (cuotas, afiliación, campamentos) y lo que ya pagó.',
      },
      {
        target: { selector: '#btn-register-payment' },
        pose: 'point',
        title: 'Registrar pago',
        text: 'Elegís qué paga (o se aplica a lo más viejo), el monto, la cuenta y el medio. Puede ser un pago parcial.',
      },
      {
        pose: 'think',
        title: 'El recibo',
        text: 'Al guardar se genera el recibo numerado, listo para imprimir o mandar. El ingreso queda solo en la contabilidad.',
      },
      { pose: 'cheer', title: '¡Cobrado!', text: 'Y si te equivocaste, el pago se puede anular y queda registrado.' },
    ],
  },
  {
    id: 'eventos',
    title: 'Eventos del Grupo',
    description: 'Organizar un evento con tareas, presupuesto y movimientos, y rendirlo al final.',
    keywords: ['evento', 'fogón', 'rifa', 'aniversario', 'rendición'],
    audience: (c) => c.can('events', 'view'),
    steps: [
      {
        route: '/eventos',
        target: nav('/eventos'),
        pose: 'point',
        title: 'Eventos',
        text: 'Fogones, aniversario, rifas y todo lo que organiza el Grupo.',
      },
      {
        target: { selector: '#btn-new-event' },
        pose: 'point',
        title: 'Nuevo evento',
        text: 'Nombre, tipo, fecha, lugar y responsable. Aparece solo en el calendario.',
      },
      {
        pose: 'think',
        title: 'Adentro del evento',
        text: 'Tareas y compras para repartir el trabajo, el presupuesto, los ingresos y gastos (quedan en la contabilidad) y la rendición con el resultado final.',
      },
      { pose: 'cheer', title: '¡A organizar!', text: 'Con todo anotado, nadie se olvida de nada y al final se sabe cuánto dejó.' },
    ],
  },
  {
    id: 'campamentos',
    title: 'Campamentos y salidas',
    description: 'Armar un campamento: inscripción y legajo, presupuesto y rendición, menú, compras y transporte.',
    keywords: ['campamento', 'salida', 'legajo', 'inscripción', 'menú', 'rendición'],
    audience: (c) => c.can('camps', 'view'),
    steps: [
      {
        route: '/campamentos',
        target: nav('/campamentos'),
        pose: 'point',
        title: 'Campamentos y salidas',
        text: 'Los campamentos, acantonamientos y salidas del Grupo y de cada unidad.',
      },
      {
        target: { selector: '#btn-new-camp' },
        pose: 'point',
        title: 'Nuevo campamento',
        text: 'Tipo, fechas, lugar, unidades que van, responsable y costo por chico. Queda en borrador hasta que Jefatura lo aprueba.',
      },
      {
        target: firstRow,
        pose: 'think',
        title: 'Adentro del campamento',
        text: '"Inscripción y legajo": inscribís a los chicos (se les genera el cargo) y el semáforo te dice a quién le falta la autorización, el DNI o la ficha médica. "Presupuesto y rendición": lo previsto, los gastos y la rendición. "Logística": menú, compras, transporte y los materiales prestados del inventario.',
      },
      {
        target: button('Lugares de acampe'),
        pose: 'point',
        title: 'Lugares de acampe',
        text: 'Los lugares donde fuimos, con contacto, servicios y la calificación de cada vez.',
      },
      { pose: 'cheer', title: '¡Siempre listos!', text: 'Las noches de campamento realizadas suman solas a los estándares de progresión de la unidad.' },
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
  {
    id: 'app-en-el-celular',
    title: 'La app en tu celular',
    description: 'Abrir ALCOMBAR en el celular escaneando un código QR, sin escribir la contraseña.',
    keywords: ['celular', 'qr', 'app', 'instalar', 'teléfono'],
    audience: (c) => c.loggedIn,
    steps: [
      {
        target: { selector: '.sidebar .open-phone-btn' },
        pose: 'point',
        title: 'Abrir en el celular',
        text: 'Desde la compu, tocá acá y te muestro un código QR. También está en Mi perfil.',
      },
      {
        pose: 'think',
        title: 'Escaneá con la cámara',
        text: 'Apuntá la cámara del celular al código y tocá el enlace: se abre ALCOMBAR con tu sesión iniciada. El código sirve una sola vez y vence en 3 minutos.',
      },
      {
        pose: 'cheer',
        title: '¡Como una app!',
        text: 'En el celular, agregala a la pantalla de inicio (Android: menú ⋮; iPhone: Compartir → Agregar a inicio) y la abrís con mi cara 😄.',
      },
    ],
  },
  // ---------- Grupo: inventario, calendario y actas ----------
  {
    id: 'inventario-y-prestamos',
    title: 'Inventario y préstamos',
    description: 'Cargar los bienes del Grupo, ver su estado y prestar materiales para actividades y campamentos.',
    keywords: ['inventario', 'préstamo', 'prestar', 'carpas', 'materiales', 'devolución'],
    audience: (c) => c.can('inventory', 'view'),
    steps: [
      {
        route: '/inventario',
        target: nav('/inventario'),
        pose: 'point',
        title: 'Inventario',
        text: 'Acá están los bienes del Grupo y de cada unidad: cuántos hay, en qué estado y dónde están guardados.',
      },
      {
        target: button('Nuevo bien'),
        pose: 'point',
        title: 'Cargar un bien',
        text: 'Nombre, categoría, cantidad, estado, ubicación y si es del Grupo o de una unidad. Podés poner el enlace a una foto.',
      },
      {
        target: tab('Préstamos'),
        clickOnNext: true,
        pose: 'point',
        title: 'Préstamos',
        text: 'Cuando alguien necesita materiales, se pide un préstamo.',
      },
      {
        target: button('Nuevo préstamo'),
        pose: 'point',
        title: 'Pedir un préstamo',
        text: 'Quién retira, para qué, la fecha de devolución y qué bienes con sus cantidades. Te aviso si no alcanza lo disponible.',
      },
      {
        pose: 'think',
        title: 'Autorizar, entregar y devolver',
        text: 'Intendencia lo autoriza y lo entrega. Al volver, se registra la devolución con el estado en que llegó cada cosa. Los vencidos aparecen en rojo.',
      },
      { pose: 'cheer', title: '¡Todo en su lugar!', text: 'Con el inventario al día sabemos qué tenemos y quién tiene cada cosa.' },
    ],
  },
  {
    id: 'calendario',
    title: 'El calendario',
    description: 'Ver y cargar las fechas del Grupo y de tu unidad, y armar el servicio rotativo.',
    keywords: ['calendario', 'fechas', 'agenda', 'servicio rotativo', 'consejo'],
    audience: (c) => c.can('calendar', 'view'),
    steps: [
      {
        route: '/calendario',
        target: nav('/calendario'),
        pose: 'point',
        title: 'Calendario',
        text: 'Las fechas del Grupo y de cada unidad: reuniones, Consejos, eventos, campamentos, formación y feriados.',
      },
      {
        target: { selector: '.segmented[aria-label="Vista"]' },
        pose: 'point',
        title: 'Mes o agenda',
        text: 'Lo podés ver como mes o como lista. En el celular se muestra como agenda.',
      },
      {
        target: button('Nuevo evento'),
        pose: 'point',
        title: 'Cargar una fecha',
        text: 'Título, día y hora, si es del Grupo o de una unidad, tipo y lugar. También podés tocar un día vacío del mes.',
      },
      {
        target: button('Servicio rotativo'),
        pose: 'think',
        title: 'Servicio rotativo',
        text: 'Elegís las unidades y el rango de fechas, y te armo los turnos de los sábados. Antes de crearlos ves la vista previa.',
      },
      { pose: 'cheer', title: '¡Agendado!', text: 'Con todo en el calendario nadie se pierde una fecha.' },
    ],
  },
  {
    id: 'actas-y-documentos',
    title: 'Actas y documentos',
    description: 'Cargar las actas del Consejo de Grupo y tener a mano los documentos del Drive.',
    keywords: ['actas', 'consejo', 'documentos', 'reglamento', 'drive'],
    audience: (c) => c.can('documents', 'view'),
    steps: [
      {
        route: '/actas',
        target: nav('/actas'),
        pose: 'point',
        title: 'Actas y documentos',
        text: 'Las actas del Consejo de Grupo y los documentos importantes, todo en un lugar.',
      },
      {
        target: button('Nueva acta'),
        pose: 'point',
        title: 'Nueva acta',
        text: 'Fecha, tipo de reunión, asistentes, orden del día y decisiones. Se numera sola por año. Cuando está lista, se aprueba y se puede imprimir con las firmas.',
      },
      {
        target: tab('Documentos'),
        clickOnNext: true,
        pose: 'point',
        title: 'Documentos',
        text: 'Reglamentos, planillas, formularios y autorizaciones, guías de SAAC…',
      },
      {
        target: button('Nuevo documento'),
        pose: 'think',
        title: 'Sumar un documento',
        text: 'Título, categoría y el enlace al Drive. Se abre en otra pestaña; si lo borrás de acá, el archivo del Drive no se toca.',
      },
      { pose: 'cheer', title: '¡Ordenado!', text: 'Nada de buscar en mil carpetas: está todo acá.' },
    ],
  },
  // ---------- Soporte ----------
  {
    id: 'reportar-problema',
    title: 'Reportar un problema',
    description: 'Avisar si algo no funciona en la plataforma, mandar una sugerencia o una consulta, y ver la respuesta.',
    keywords: ['reportar', 'error', 'bug', 'falla', 'no funciona', 'sugerencia', 'soporte'],
    audience: (c) => c.loggedIn,
    steps: [
      {
        target: { selector: '.sidebar .report-problem-btn' },
        pose: 'point',
        title: 'Reportar un problema',
        text: 'Si algo no anda como esperabas, tocá acá. Elegís si es un error, una sugerencia o una consulta, y contás qué estabas haciendo.',
      },
      {
        pose: 'think',
        title: 'Va con la pantalla',
        text: 'El reporte se manda con la pantalla en la que estabas y los errores técnicos del navegador, así es más fácil encontrar el problema. Por ahora no se pueden adjuntar imágenes.',
      },
      {
        pose: 'cheer',
        title: '¡Gracias por ayudar!',
        text: 'En la pestaña "Mis reportes" ves en qué quedó cada uno y la respuesta. También te llega un mail cuando lo respondemos.',
      },
    ],
  },
];

/** Tutoriales que le corresponden a quien mira, en el orden sugerido. */
export const tutorialsFor = (c: HelpContext) => TUTORIALS.filter((t) => t.audience(c));
export const tutorialById = (id: string) => TUTORIALS.find((t) => t.id === id);

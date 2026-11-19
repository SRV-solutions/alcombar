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
    audience: (c) => c.loggedIn && !c.rover,
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
        text: 'Desde acá entrás a todo. Cada sección —Protagonistas, Programa, Tesorería, Grupo…— se despliega al tocarla y queda abierta la que estás usando. Solo ves lo que corresponde a tu rol en el Grupo.',
      },
      {
        target: { selector: '.gsearch-input' },
        pose: 'point',
        title: 'El buscador',
        text: 'Escribí lo que querés hacer, como "asistencia", "ficha médica" o "patrulla", o el nombre de un chico, y te llevo directo. También se abre con Ctrl+K.',
      },
      {
        target: { selector: '.theme-toggle' },
        pose: 'point',
        title: 'Modo oscuro',
        text: 'Arriba, junto a los avisos: la luna pasa la app a modo oscuro, ideal para los fogones a la noche 🔥, y el sol la vuelve a claro.',
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
  // ---------- Comunidad Rover (para los rovers) ----------
  {
    id: 'bienvenida-rover',
    title: 'Primeros pasos en ALCOMBAR',
    description: 'Qué tenés en la app como rover y dónde está cada cosa.',
    keywords: ['primeros pasos', 'empezar', 'inicio', 'cómo se usa', 'intro'],
    audience: (c) => c.rover,
    steps: [
      { pose: 'wave', title: '¡Hola! Soy Luisito 👋', text: 'Soy Luisito, del Grupo Scout 155. Esta es la app del Grupo y de tu Comunidad Rover. Te muestro dónde está cada cosa; podés omitir el tutorial y volver a verlo desde tu perfil.' },
      { route: '/', target: { selector: '.sidebar .nav' }, pose: 'point', title: 'El menú', text: 'Tu Plan Personal, los proyectos y mingas, la Asamblea y lo del Grupo: su historia, el organigrama y el calendario.' },
      { target: { selector: '.gsearch-input' }, pose: 'point', title: 'El buscador', text: 'Escribí lo que querés hacer, como "minga" o "asamblea", y te llevo directo.' },
      { target: { selector: '.sidebar a[href="/perfil"]' }, pose: 'think', title: 'Tu perfil', text: 'Ahí cargás tu mail (lo confirmás con un código de 6 números), cambiás tu contraseña y volvés a ver estos tutoriales.' },
      { pose: 'cheer', title: '¡Buen camino!', text: 'Seguí con el tutorial de tu Plan Personal cuando quieras.' },
    ],
  },
  {
    id: 'mi-plan-personal',
    title: 'Tu Plan Personal',
    description: 'Tu visión a futuro, tus metas con acciones y plazos, y los altos en el camino.',
    keywords: ['plan personal', 'ppa', 'metas', 'visión', 'alto en el camino'],
    audience: (c) => c.rover,
    steps: [
      { route: '/rover/plan', target: nav('/rover/plan'), pose: 'point', title: 'Mi Plan Personal', text: 'Tu carta de navegación: hacia dónde querés ir y qué vas a hacer para llegar. Lo ven solo vos y tus educadores.' },
      { target: { selector: '.card', text: 'Mi visión a futuro' }, pose: 'point', title: 'Tu visión', text: 'Empezá por acá: cómo te imaginás dentro de tres o cuatro años. De esa visión salen tus metas.' },
      { target: button('Nueva meta'), pose: 'point', title: 'Tus metas', text: 'Una meta es algo concreto que querés lograr en menos de un año. Le ponés acciones, recursos y un plazo, y vas tildando las acciones a medida que las hacés.' },
      { target: button('Hacer un alto'), pose: 'think', title: 'Un alto en el camino', text: 'Cada tanto pará a mirar cómo venís: qué aprendiste, qué conservás, qué dejás atrás. Compartilo con tu Comunidad y tus educadores, y ajustá tu Plan.' },
      { pose: 'cheer', title: '¡A caminar!', text: 'Cuando logres una meta, marcala como lograda y contá cómo te fue: queda en tu historia.' },
    ],
  },
  {
    id: 'mis-proyectos-y-mingas',
    title: 'Proyectos y mingas',
    description: 'Armar tu propuesta, invitar a otros y postularla en la Asamblea.',
    keywords: ['proyecto', 'minga', 'ficha', 'postular', 'invitar'],
    audience: (c) => c.rover,
    steps: [
      { route: '/rover/proyectos', target: nav('/rover/proyectos'), pose: 'point', title: 'Proyectos y mingas', text: 'Tus propuestas y las de la Comunidad que ya pasaron por la Asamblea o a las que te invitaron.' },
      { target: button('Nuevo proyecto'), pose: 'point', title: 'Un proyecto', text: 'Con la ficha de la Rama: qué, por qué, cómo y dónde, para quiénes, con quiénes, cuándo, cuánto cuesta, cómo se financia y cómo lo evaluamos y festejamos.' },
      { target: button('Nueva minga'), pose: 'point', title: 'Una minga', text: 'Trabajo solidario y organizado que la Comunidad hace junto con otros —vecinos, una escuela, una organización— y que termina en festejo. Tiene su plantilla: propósito, participantes, actividades, recursos, difusión y cierre. Puede ser parte de un proyecto.' },
      { pose: 'think', title: 'Borrador e invitados', text: 'Mientras es borrador lo ven solo vos, tus educadores y a quienes sumes con «Invitar»: otros rovers o adultos del Grupo. A la gente de afuera la anotás en la ficha.' },
      { pose: 'cheer', title: '¡A la Asamblea!', text: 'Cuando haya Asamblea lo postulás. Si se aprueba, lo ponés en marcha y al terminar escribís el cierre: aprendizajes, impacto y próximos pasos.' },
    ],
  },
  {
    id: 'asamblea-como-rover',
    title: 'Participar de la Asamblea',
    description: 'Dar el presente, postular y votar desde el celular.',
    keywords: ['asamblea', 'votar', 'presente', 'postular'],
    audience: (c) => c.rover,
    steps: [
      { route: '/rover/asamblea', target: nav('/rover/asamblea'), pose: 'point', title: 'Asamblea', text: 'Donde la Comunidad decide. Cuando tu educador activa el modo Asamblea, te aparece un aviso en el inicio y acá pasa todo.' },
      { pose: 'think', title: 'Dá el presente', text: 'Es lo primero: sin presente no se puede votar. Arriba vas a ver para qué es la Asamblea, el orden del día y quién preside.' },
      { pose: 'think', title: 'Postulá lo tuyo', text: 'Tus borradores aparecen listos para postular. Para postular hace falta haber escrito al menos de qué se trata.' },
      { pose: 'point', title: 'Votá', text: 'A favor, en contra o abstención. El voto es a la vista y lo podés cambiar hasta que se cierre la votación. Se aprueba con más de la mitad de los presentes a favor.' },
      { pose: 'cheer', title: '¡Listo!', text: 'Si tu propuesta no se aprueba, vuelve a vos para reformularla con lo que se habló y postularla de nuevo.' },
    ],
  },
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
      { route: '/', target: { selector: '.my-units' }, pose: 'point', title: 'Tu unidad, en el inicio', text: 'Si sos educador de una unidad, al entrar ves su tarjeta: «Pasar lista» a un toque, el programa del próximo encuentro, a quién le falta documentación y los cumpleaños de la semana.' },
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
      { route: '/documentacion', target: nav('/documentacion'), pose: 'point', title: 'Documentación', text: 'El legajo de cada chico, como lo pide Scouts de Argentina: autorización de ingreso, declaración jurada de salud, autorizaciones anuales, vacunas, obra social, DNI y partida de nacimiento.' },
      { target: { selector: 'select[aria-label="Unidad"]' }, pose: 'point', title: 'Elegí la unidad', text: 'Cambiá de unidad desde acá.' },
      {
        target: { selector: '.doc-cell' },
        pose: 'point',
        title: 'El semáforo',
        text: 'Verde: al día. Amarillo: vence en menos de 30 días. Rojo: vencido. Gris: falta. Si tenés permiso, tocando la celda marcás la entrega y el vencimiento.',
      },
      {
        pose: 'think',
        title: 'Lo que vence y lo que no corresponde',
        text: 'La declaración jurada de salud vale un año desde su fecha, y las autorizaciones de imagen y de salidas cercanas se firman cada año. Si algo no aplica (por ejemplo, no tiene obra social), marcá "No corresponde" y deja de figurar como faltante.',
      },
      { target: { selector: 'label.checkbox', text: 'Solo con pendientes' }, pose: 'point', title: 'Solo pendientes', text: 'Para ver rápido a quién le falta algo antes de una salida.' },
      { pose: 'cheer', title: '¡A salir tranquilos!', text: 'En Inicio también ves el porcentaje al día de cada unidad.' },
    ],
  },
  {
    id: 'firmar-autorizaciones',
    title: 'Hacer firmar una autorización',
    description: 'La madre, el padre o el tutor firma con el dedo en tu celular, sobre la planilla de Scouts de Argentina, y queda el PDF.',
    keywords: ['firmar', 'firma', 'autorización', 'con el dedo', 'planilla', 'pdf', 'salidas cercanas', 'uso de imagen', 'ingreso'],
    audience: (c) => c.can('member_documents', 'edit'),
    steps: [
      {
        route: '/autorizaciones',
        target: nav('/autorizaciones'),
        pose: 'point',
        title: 'Autorizaciones',
        text: 'Acá están las autorizaciones firmadas en la app. Se firman en persona: la madre, el padre o el tutor firma con el dedo en tu celular o tablet.',
      },
      {
        target: button('Hacer firmar'),
        pose: 'point',
        title: 'Hacer firmar',
        text: 'Elegís al chico y la autorización: salidas cercanas, uso de imagen, ingreso, retirarse solo/a o retiro por otros adultos. Si el campamento está cargado, firmala desde su legajo con «Firmar acá»: sale todo completo. Si no, cargás el lugar y las fechas a mano.',
      },
      {
        pose: 'think',
        title: 'Primero los datos',
        text: 'Completás con la persona sus datos tal como figuran en el DNI. Quedan guardados en la ficha: la próxima vez ya aparecen.',
      },
      {
        pose: 'point',
        title: 'Lee y firma',
        text: 'Le pasás el dispositivo: ve la planilla oficial ya completa, firma con el dedo y tilda que leyó y autoriza. Queda registrado que firmó delante tuyo.',
      },
      {
        pose: 'think',
        title: 'Testigos y aval',
        text: 'La de ingreso la firman además dos educadores como testigos, ahí mismo. Las de salidas y campamentos llevan el aval del Jefe/a de Unidad o de Grupo.',
      },
      {
        pose: 'cheer',
        title: '¡Y queda el PDF!',
        text: 'Cada autorización se baja en PDF con el mismo formato de la planilla de Scouts de Argentina, lista para imprimir. También podés bajar todas las de la unidad o de un campamento en un solo PDF, o la planilla sin firmar para hacerla firmar en papel.',
      },
    ],
  },
  {
    id: 'aval-autorizaciones',
    title: 'Dar el aval a las autorizaciones',
    description: 'El Jefe/a de Unidad o de Grupo avala las autorizaciones de salidas y campamentos, varias con una sola firma.',
    keywords: ['aval', 'avalar', 'autorizaciones', 'jefe de unidad', 'firmar aval'],
    audience: (c) => c.can('member_documents', 'approve'),
    steps: [
      {
        route: '/autorizaciones',
        target: { selector: 'select[aria-label="Estado"]' },
        pose: 'point',
        title: 'Las que esperan tu aval',
        text: 'Elegí «Les falta el aval o un testigo» para ver las que están pendientes en tu unidad.',
      },
      {
        pose: 'think',
        title: 'Qué certificás',
        text: 'Con el aval certificás, como dice la planilla, que el chico tiene el legajo completo y que quien firmó tiene su firma registrada en la autorización de ingreso.',
      },
      {
        pose: 'point',
        title: 'Varias con una firma',
        text: 'Tildá las que correspondan (o «Elegir las que esperan tu aval») y tocá «Dar el aval con una firma»: firmás una vez con el dedo y vale para todas.',
      },
      { pose: 'cheer', title: '¡Listas!', text: 'Si una tiene un error, se anula con el motivo y se firma otra: nunca se borra.' },
    ],
  },
  {
    id: 'rover-en-rotacion-y-partida',
    title: 'Rovers: rotación y partida',
    description: 'Marcar a un rover en su último tiempo como «en rotación» y, cuando hace la partida, pasarlo a adulto del Grupo sin perder su historia.',
    keywords: ['rover', 'rovers', 'rotación', 'rover en rotación', 'partida', 'hizo la partida', 'pasar a adulto', 'egreso', 'último año', 'historial'],
    audience: (c) => c.can('members', 'edit'),
    steps: [
      {
        route: '/protagonistas',
        target: nav('/protagonistas'),
        pose: 'point',
        title: 'Desde la ficha del rover',
        text: 'Entrá a la ficha de un rover de la Comunidad. Arriba vas a ver dos botones que solo aparecen en los rovers: «Pasar a rotación» e «Hizo la partida».',
      },
      {
        pose: 'think',
        title: 'Rover en rotación',
        text: 'Es para los que están en su último tiempo en la rama. Sigue siendo rover (aparece en la lista, en la asistencia y en todo), pero con la marca «En rotación». Se puede sacar cuando quieras.',
      },
      {
        pose: 'point',
        title: 'La partida',
        text: 'Cuando hace la partida, poné la fecha y confirmá. Se crea su ficha de adulto con sus datos y queda avisado el equipo que carga Cruz del Sur. Después le cargás el cargo desde Adultos.',
      },
      {
        pose: 'cheer',
        title: 'Su historia no se pierde',
        text: 'La ficha de protagonista queda como «Hizo la partida», con sus pases, progresión y asistencia, y enlazada a su ficha de adulto. Así queda toda su vida en el Grupo.',
      },
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
  {
    id: 'cruz-del-sur',
    title: 'Altas y bajas para Cruz del Sur',
    description: 'Las altas y bajas que hay que cargar en la plataforma de SAAC, y marcarlas como hechas.',
    keywords: ['cruz del sur', 'altas', 'bajas', 'saac', 'cargar en saac'],
    audience: (c) => c.isSuperadmin || c.canAll('members', 'edit') || c.canAll('adults', 'edit'),
    steps: [
      {
        route: '/cruz-del-sur',
        target: nav('/cruz-del-sur'),
        pose: 'point',
        title: 'Altas y bajas',
        text: 'Cada vez que se da de alta o de baja a un protagonista o a un adulto en ALCOMBAR, queda acá para cargarlo en Cruz del Sur, la plataforma de SAAC.',
      },
      {
        target: tab('Pendientes'),
        pose: 'point',
        title: 'Lo que falta cargar',
        text: 'Tildá los que ya cargaste y tocá "Marcar como hechos en Cruz del Sur", así el resto del equipo sabe que está. Si alguno no va, "No corresponde".',
      },
      {
        target: { selector: 'select[aria-label="Filtrar por tipo"]' },
        pose: 'point',
        title: 'Solo altas o solo bajas',
        text: 'Para cargarlas de a tandas.',
      },
      {
        pose: 'think',
        title: 'Quién recibe los avisos',
        text: 'El equipo marcado en Equipos de apoyo ("Recibe los avisos de altas y bajas") recibe cada alta y baja en la campanita y por mail.',
      },
      { pose: 'cheer', title: '¡Al día con SAAC!', text: 'Si alguien se da de alta y de baja antes de cargarlo, los dos movimientos se anulan solos.' },
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
        title: 'Descargar en PDF y duplicar',
        text: 'Desde cada ficha, "Descargar PDF" la baja con el formato de SAAC (con sus logos). También la podés duplicar para otra unidad o para repetirla, y ves en qué cronograma de campamento está.',
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
        text: 'Cada momento tiene hora, duración, actividad (o una ficha ya cargada) y responsable. El responsable puede ser alguien de la unidad, otro adulto del Grupo o un «Otro» que escribís vos: Jefatura de Grupo para el izado, el Párroco para la misa, un rover en servicio…',
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
    id: 'referentes-de-rama',
    title: 'Referentes de rama',
    description: 'A quién consultar por cada rama y qué ven los referentes.',
    keywords: ['referentes', 'rama', 'equipo de programa', 'a quién consulto'],
    audience: (c) => c.can('activities', 'view'),
    steps: [
      {
        route: '/programa/referentes',
        target: nav('/programa/referentes'),
        pose: 'point',
        title: 'Referentes de rama',
        text: 'Los integrantes del equipo de Programa que acompañan a cada rama. Son por rama, no por unidad.',
      },
      {
        pose: 'think',
        title: 'Les llega un aviso',
        text: 'Cuando una unidad carga una ficha de actividad o un campamento, al referente de su rama le llega un aviso en la campanita y por mail.',
      },
      {
        pose: 'think',
        title: 'Qué pueden ver',
        text: 'Ser referente sale del cargo en el equipo de Programa: ven, sin poder editar, las fichas, campamentos, progresión y calendario de las unidades de su rama.',
      },
      { pose: 'cheer', title: '¡Nadie camina solo!', text: 'Si cambia el referente, cambiale el cargo y los permisos se acomodan solos.' },
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
        title: 'El seguimiento',
        text: 'Abajo de todo está "Seguimiento": cualquier adulto de la unidad anota cómo viene el chico, y queda el historial de todo lo que se hizo con el adulto que lo hizo. Así todo el equipo sabe quién lo viene acompañando.',
      },
      {
        pose: 'think',
        title: 'También desde la ficha',
        text: 'En la ficha de cada protagonista hay una pestaña "Progresión" con el resumen y el botón "Abrir en Progresión".',
      },
      { pose: 'cheer', title: '¡Buen camino!', text: 'Así cada chico sabe dónde está y hacia dónde va.' },
    ],
  },
  // ---------- Comunidad Rover (para sus educadores) ----------
  {
    id: 'acceso-rovers',
    title: 'Darle acceso a un rover',
    description: 'Los rovers entran con su DNI: su educador les genera una contraseña provisoria desde la ficha.',
    keywords: ['rover', 'rovers', 'acceso', 'dni', 'contraseña provisoria', 'cuenta de rover'],
    audience: (c) => c.roverEducator && c.can('members', 'edit'),
    steps: [
      { route: '/protagonistas', target: nav('/protagonistas'), pose: 'point', title: 'Desde la ficha del rover', text: 'Los rovers son mayores de 18 y pueden usar la app. El acceso se lo das vos, desde su ficha en el padrón.' },
      { pose: 'think', title: 'La tarjeta «Acceso a la app»', text: 'Aparece en la ficha de un rover activo, mayor de 18 y con el DNI cargado. Si falta el DNI, cargalo primero.' },
      { pose: 'point', title: 'Generar acceso', text: 'Te muestra una sola vez su DNI y una contraseña provisoria para dictársela ahí mismo. No se manda ningún mail.' },
      { pose: 'think', title: 'Su primera entrada', text: 'Entra con el DNI y la provisoria, y la app le pide elegir su propia contraseña. Después carga su mail y lo confirma con un código de 6 números.' },
      { pose: 'cheer', title: '¡Listo!', text: 'Si se olvida la contraseña y todavía no tiene mail, le generás otra desde la misma tarjeta. En Adultos ves la lista de rovers con acceso.' },
    ],
  },
  {
    id: 'comunidad-rover',
    title: 'La Comunidad Rover',
    description: 'Cómo viene el Plan Personal de cada rover y qué proyectos y mingas propone la Comunidad.',
    keywords: ['rovers', 'comunidad', 'plan personal', 'ppa', 'proyectos', 'mingas'],
    audience: (c) => c.roverEducator,
    steps: [
      { route: '/rover', target: nav('/rover'), pose: 'point', title: 'La Comunidad', text: 'Cada rover, si ya entró a la app y cómo viene su Plan Personal: metas en curso y logradas.' },
      { pose: 'think', title: 'El Plan Personal', text: 'Tocando a un rover leés su Plan: su visión, sus metas con acciones y plazos, y sus «altos en el camino». Lo escribe él; vos lo acompañás. Lo ven solo el rover y sus educadores.' },
      { route: '/rover/proyectos', target: nav('/rover/proyectos'), pose: 'point', title: 'Proyectos y mingas', text: 'Todo lo que propone la Comunidad, desde el borrador: los proyectos con la ficha de la Rama y las mingas con su plantilla de organización.' },
      { pose: 'think', title: 'Qué es una minga', text: 'Trabajo solidario y organizado que la Comunidad hace junto con otros y que termina en festejo. Puede ser parte de un proyecto. La ficha la escribe cada rover.' },
      { pose: 'cheer', title: 'Se aprueban en Asamblea', text: 'Mirá el tutorial «Conducir una Asamblea» para ver cómo se postulan y se votan.' },
    ],
  },
  {
    id: 'asamblea-rover',
    title: 'Conducir una Asamblea',
    description: 'Activar el modo Asamblea, tomar los presentes, abrir cada votación y cerrar.',
    keywords: ['asamblea', 'modo asamblea', 'votación', 'votar', 'presentes', 'orden del día'],
    audience: (c) => c.roverEducator,
    steps: [
      { route: '/rover/asamblea', target: nav('/rover/asamblea'), pose: 'point', title: 'Asamblea de Comunidad', text: 'Donde la Comunidad decide: acá se presentan y se votan las mingas y los proyectos.' },
      { target: button('Activar el modo Asamblea'), pose: 'point', title: 'Activar el modo Asamblea', text: 'Cuando la Comunidad está reunida. Podés anotar para qué se reúnen, el orden del día y qué rover preside; conviene un solo objetivo por Asamblea.' },
      { pose: 'think', title: 'Presentes y postulaciones', text: 'Cada rover da el presente desde su celular; a quien no tiene cuenta lo marcás vos. Los rovers postulan sus borradores.' },
      { pose: 'point', title: 'Las votaciones', text: 'Abrís una votación por vez. Votan solo los rovers presentes, a la vista; a quien no tiene celular le cargás el voto. Se aprueba con más de la mitad de los presentes a favor; si no, vuelve a su responsable para reformular.' },
      { pose: 'cheer', title: 'Cerrar la Asamblea', text: 'Escribís las notas de lo que se habló. Lo que no se llegó a votar vuelve a borrador para la próxima. Queda todo en «Asambleas anteriores».' },
    ],
  },
  {
    id: 'representantes-juveniles',
    title: 'Representantes juveniles en el Consejo',
    description: 'Marcar a quienes eligieron sus pares: dos por Comunidad Rover y uno por Comunidad Caminante.',
    keywords: ['representante', 'representantes juveniles', 'consejo de grupo', 'caminantes', 'rovers'],
    audience: (c) => c.can('members', 'edit') || c.can('progression', 'edit'),
    steps: [
      { route: '/protagonistas', target: nav('/protagonistas'), pose: 'point', title: 'Desde la ficha', text: 'Los rovers eligen entre ellos a dos representantes en el Consejo de Grupo; cada Comunidad Caminante, a uno. Quién es lo marca el equipo de educadores de la unidad, en la ficha del protagonista.' },
      { pose: 'think', title: 'El botón «Representante juvenil»', text: 'Está arriba, en la ficha de un caminante o un rover activo. Si la Comunidad ya tiene sus representantes, primero hay que quitar a uno.' },
      { pose: 'point', title: 'La etiqueta', text: 'Queda a la vista en su ficha, en el padrón y en La Comunidad. No cambia permisos: es para saber quién es.' },
      { pose: 'cheer', title: 'El temario del Consejo', text: 'Cuando la Jefatura manda el temario, a los representantes rovers que usan la app les llega el aviso. A los caminantes no se les manda nada: avisales vos.' },
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
    audience: (c) => c.canAll('accounting', 'view'),
    steps: [
      {
        route: '/contabilidad',
        target: nav('/contabilidad'),
        pose: 'point',
        title: 'Contabilidad',
        text: 'Acá está la plata del Grupo y de las cajas de cada unidad: saldo de cada cuenta (caja, banco, Mercado Pago), ingresos y gastos del año.',
      },
      {
        target: { selector: 'select[aria-label="Ámbito"]' },
        pose: 'point',
        title: 'Todo, el Grupo o una unidad',
        text: 'Con este selector mirás todo junto, solo las cuentas del Grupo o las de una unidad. Si todavía ninguna unidad tiene caja, no aparece.',
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
        text: 'Con "Registrar ingreso" o "Registrar gasto" lo cargás. Si es de un evento o campamento, lo vinculás y queda en su rendición. Para pasar plata entre cuentas (o a la caja de una unidad) está "Transferencia".',
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
    id: 'cajas-de-las-unidades',
    title: 'Cajas de las unidades',
    description: 'Abrir la caja de una unidad, elegir quién la lleva y pasarle plata desde el Grupo.',
    keywords: ['caja de la unidad', 'plata de programa', 'pasar plata', 'finanzas de la unidad', 'transferencia'],
    audience: (c) => c.canAll('accounting', 'create'),
    steps: [
      {
        route: '/contabilidad?tab=config',
        target: tab('Cuentas y cierres'),
        pose: 'point',
        title: 'Cada unidad, su caja',
        text: 'Las unidades pueden manejar su propia plata: lo que juntan en sus eventos y lo que les pasa el Grupo. Las cuentas se ven separadas: las del Grupo y las de cada unidad.',
      },
      {
        target: button('Nueva cuenta'),
        pose: 'point',
        title: 'Abrir la caja',
        text: 'Con "Nueva cuenta", en "Es de" elegís la unidad. Puede ser efectivo, banco o una billetera virtual.',
      },
      {
        pose: 'think',
        title: 'Quién la lleva',
        text: 'La plata de cada unidad la lleva una persona de la unidad. En Usuarios le das el rol "Finanzas de la unidad" con su unidad: ve y mueve solo las cuentas de esa unidad.',
      },
      {
        route: '/contabilidad?tab=movimientos',
        target: button('Transferencia'),
        pose: 'point',
        title: 'Pasarle plata',
        text: 'Para darle plata a una unidad (por ejemplo, la de programa), hacé una transferencia: desde una cuenta del Grupo hacia la caja de la unidad. A la unidad le aparece sola.',
      },
      { pose: 'cheer', title: '¡Cuentas claras!', text: 'Arriba podés mirar todo junto, solo el Grupo o una unidad.' },
    ],
  },
  {
    id: 'plata-de-la-unidad',
    title: 'La plata de tu unidad',
    description: 'Ver el saldo de tu unidad, registrar ingresos y gastos y saber cuánto pasó el Grupo.',
    keywords: ['plata de la unidad', 'caja de la unidad', 'gastos', 'ingresos', 'finanzas de la unidad'],
    audience: (c) => c.can('accounting', 'view') && !c.canAll('accounting', 'view'),
    steps: [
      {
        route: '/contabilidad',
        target: nav('/contabilidad'),
        pose: 'point',
        title: 'La plata de tu unidad',
        text: 'Acá ves las cuentas de tu unidad: cuánto hay, lo que entró y lo que se gastó en el año.',
      },
      {
        pose: 'think',
        title: 'Lo que pasa el Grupo',
        text: 'Cuando el Grupo le pasa plata a la unidad (por ejemplo, la de programa), aparece como transferencia y suma al saldo. La registran Secretaría o Tesorería: vos no tenés que cargar nada.',
      },
      {
        target: tab('Movimientos'),
        clickOnNext: true,
        pose: 'point',
        title: 'Movimientos',
        text: 'Cada ingreso y cada gasto de tu unidad, con su comprobante.',
      },
      {
        target: button('Registrar gasto'),
        pose: 'point',
        title: 'Registrar',
        text: 'Con "Registrar ingreso" (una venta, un evento de la unidad) o "Registrar gasto" (materiales, transporte) lo cargás en la caja de la unidad. Si es de un campamento, vinculalo.',
      },
      {
        pose: 'think',
        title: 'Corregir sin borrar',
        text: 'Si te equivocaste, "Anular" deja el movimiento tachado y crea el contra-asiento: así siempre queda el registro.',
      },
      {
        target: tab('Cuentas'),
        pose: 'point',
        title: 'Las cuentas de la unidad',
        text: 'Si la unidad abre otra cuenta (por ejemplo, un Mercado Pago), la podés sumar acá.',
      },
      { pose: 'cheer', title: '¡Cuentas claras!', text: 'Con todo anotado, rendirle al Grupo es un trámite.' },
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
        text: 'El valor de la cuota, el día de vencimiento, los meses que se cobran, la afiliación y el descuento por hermanos. Los montos los define Tesorería.',
      },
      {
        target: tab('Generar cuotas'),
        pose: 'think',
        title: 'Generar las cuotas',
        text: 'Secretaría o Tesorería eligen el mes, miran la vista previa y las generan para todos los protagonistas activos. Si ya estaban generadas, no se duplican. La afiliación anual se genera igual.',
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
      { pose: 'cheer', title: '¡Cobrado!', text: 'Y si te equivocaste, pedile a Tesorería que anule el pago: queda registrado igual.' },
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
        text: 'Tipo, fechas, lugar, unidades que van, Jefe/a de Campo y costo por chico. Queda en borrador hasta que Jefatura lo aprueba.',
      },
      {
        target: firstRow,
        pose: 'think',
        title: 'Adentro del campamento',
        text: '"Inscripción y legajo": inscribís a los chicos (se les genera el cargo) y el semáforo te dice a quién le falta la autorización, el DNI o la ficha médica. Con «Firmar acá», la madre, el padre o el tutor firma la autorización con el dedo en tu celular, con el lugar y las fechas del campamento ya completos. «Autorizaciones en PDF» baja las de todos los inscriptos juntas. "Presupuesto y rendición": lo previsto, los gastos y la rendición. "Logística": menú, compras, transporte y los materiales prestados del inventario.',
      },
      {
        pose: 'think',
        title: 'Programa y cronograma',
        text: 'En la pestaña "Programa y cronograma" está la propuesta, el cronograma de cada día y las fichas del campamento. Cada día se arma con el mismo editor del "Programa del sábado", así las fichas quedan enlazadas sin cargar nada dos veces.',
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
    id: 'sobre-el-grupo',
    title: 'Sobre el Grupo',
    description: 'La historia del Grupo, sus jefes y jefas, la tribu.',
    keywords: ['historia', 'sobre el grupo', 'jefes de grupo', 'tribu', 'quiénes somos'],
    audience: (c) => c.loggedIn,
    steps: [
      { route: '/grupo/sobre', target: nav('/grupo/sobre'), pose: 'point', title: 'Sobre el Grupo', text: 'Nuestra historia y lo que nos hace quienes somos, para que lo conozca cualquiera que llega al Grupo.' },
      { target: { selector: '.about-index' }, pose: 'point', title: 'Las secciones', text: 'El índice te lleva a cada una: la historia, los jefes y jefas de Grupo, la tribu.' },
      { target: button('Nueva sección'), pose: 'think', title: 'Escribirlo', text: 'Si administrás el Grupo, con «Nueva sección» y «Editar» cargás el texto. Dejá una línea en blanco entre párrafos; «## » arma un subtítulo y «- » una lista. Una sección vacía solo la ve quien puede editarla.' },
      { target: button('Sumar un aporte'), pose: 'point', title: 'Sumá lo que sabés', text: 'Cualquiera puede dejar un aporte en una sección: un dato, una anécdota, una corrección. Queda con tu nombre, y lo podés borrar vos o quien administra el Grupo.' },
      { pose: 'cheer', title: '¡Siempre listos!', text: 'Por ahora es solo texto: las fotos vienen más adelante.' },
    ],
  },
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
      { route: '/adultos', target: nav('/adultos'), pose: 'point', title: 'Adultos', text: 'Todos los adultos del Grupo con sus cargos de este año, su formación y su acceso a la app.' },
      { target: button('Nuevo adulto'), pose: 'point', title: 'Nuevo adulto', text: 'Para sumar a alguien que se incorpora al Grupo.' },
      { target: firstRow, clickOnNext: true, pose: 'point', title: 'Abrí una ficha', text: 'Tocando un nombre ves su ficha. Te abro la primera.' },
      {
        target: button('Agregar cargo'),
        pose: 'point',
        title: 'Cargos por año',
        text: 'Primero elegís dónde (una unidad, el Grupo, un equipo de apoyo u otro) y después la función, con menús que se pueden buscar. Con esto se arma solo el organigrama y, si es de una unidad, sus permisos.',
      },
      {
        pose: 'think',
        title: 'Documentación del adulto',
        text: 'Cada adulto tiene su legajo: ficha médica, DNI, obra social y certificado de antecedentes penales, con vencimiento. En la lista de adultos ves quién la tiene completa.',
      },
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
    title: 'Dar acceso a la app',
    description: 'Desde Adultos: darle acceso a una persona, elegir sus roles y mandarle el enlace para que elija su contraseña.',
    keywords: ['usuarios', 'crear usuario', 'invitar', 'invitación', 'enlace', 'acceso', 'contraseña', 'roles', 'desactivar'],
    audience: (c) => c.can('users', 'create') && c.can('adults', 'view'),
    steps: [
      { route: '/adultos', target: nav('/adultos'), pose: 'point', title: 'Personas y accesos, juntos', text: 'Los adultos del Grupo y su acceso a la app están en una sola pantalla. No hay registro público: el acceso se da desde acá.' },
      { target: { selector: 'th', text: 'Acceso a la app' }, pose: 'point', title: 'La columna «Acceso a la app»', text: 'Muestra quién puede entrar, con qué roles y si ya entró alguna vez. Con el filtro «Con o sin acceso» encontrás a quién le falta o quién todavía no entró.' },
      {
        target: button('Dar acceso'),
        pose: 'point',
        title: 'Dar acceso',
        text: 'A quien no tiene usuario: su mail y sus roles. Los roles de unidad (Jefe/a de Unidad, Educador/a, Finanzas de la unidad) piden la unidad. Secretaría es quien cobra cuotas, afiliaciones y campamentos. Al guardar se genera su invitación.',
      },
      {
        target: button('Acceso'),
        pose: 'point',
        title: 'Cambiar un acceso',
        text: 'Para sumar o quitar roles, corregir el mail o generar un enlace nuevo si la persona se olvidó la contraseña: es de un solo uso, copialo y mandáselo por WhatsApp. Lo mismo tenés en la ficha de cada adulto.',
      },
      { pose: 'cheer', title: '¡Bienvenidos!', text: 'Si alguien deja el Grupo, desactivá su usuario: se conserva lo que cargó. Los rovers entran con su DNI y su acceso se da desde la ficha de cada uno.' },
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
      { target: { selector: '.avatar-grid' }, pose: 'point', title: 'Tu foto de perfil', text: 'Si tenés tótem, elegí el dibujo de tu animal: se ve al lado de tu nombre en el menú y en la lista de adultos. Tocando tu foto se abre grande, con el animal completo. Por ahora no se suben fotos.' },
      { target: { selector: '#tutoriales' }, pose: 'think', title: 'Tus tutoriales', text: 'Todos los tutoriales para tu rol, con cuáles hiciste. Los podés repasar cuando quieras.' },
      { target: { selector: 'form', text: 'Contraseña actual' }, pose: 'point', title: 'Cambiar contraseña', text: 'Mínimo 10 caracteres. Al cambiarla se cierran tus sesiones en otros dispositivos.' },
      { pose: 'cheer', title: '¡Siempre listos!', text: 'Cualquier duda, buscá en el buscador o en Ayuda.' },
    ],
  },
  {
    id: 'avisos',
    title: 'Los avisos',
    description: 'La campanita: lo que te toca, sin tener que andar buscando.',
    keywords: ['avisos', 'notificaciones', 'campanita', 'mails'],
    audience: (c) => c.loggedIn,
    steps: [
      {
        target: { selector: '.nbell-btn' },
        pose: 'point',
        title: 'La campanita',
        text: 'Acá te aviso lo que te toca: fichas y campamentos de tu rama, cambios de servicio, el temario del Consejo, altas y bajas… El número rojo son los que no leíste.',
      },
      {
        pose: 'think',
        title: 'Tocá un aviso',
        text: 'Te lleva directo a lo que corresponde. Los avisos también te llegan por mail.',
      },
      { pose: 'cheer', title: '¡Siempre al tanto!', text: 'Así nadie se entera tarde de nada.' },
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
    id: 'sabados-y-servicio',
    title: 'Sábados y servicio',
    description: 'Qué rama está de servicio cada sábado, qué pasa ese día y cómo cambiar el día de tu unidad.',
    keywords: ['sábados', 'servicio', 'rama de servicio', 'cambiar día', 'limpieza', 'merienda'],
    audience: (c) => c.can('calendar', 'view'),
    steps: [
      {
        route: '/calendario/sabados',
        target: nav('/calendario/sabados'),
        pose: 'point',
        title: 'Los sábados del año',
        text: 'Qué rama está de servicio cada sábado y qué pasa ese día: Consejo, feriado, campamento…',
      },
      {
        target: { selector: '.sat-help-toggle' },
        pose: 'point',
        title: '¿Qué hace la rama de servicio?',
        text: 'Acá está lo que le toca a la rama de servicio: limpieza, merienda, la Misa y sacar la basura.',
      },
      {
        target: { selector: 'select[aria-label="Filtrar por servicio"]' },
        pose: 'point',
        title: 'Cuándo te toca',
        text: 'Elegí "Cuando está de servicio mi unidad" y ves solo tus sábados.',
      },
      {
        target: button('Cambiar día'),
        pose: 'think',
        title: 'Cambiar el día',
        text: 'Si tu unidad no puede, tocá "Cambiar día" y elegí con qué sábado cambiarlo. A los adultos de las unidades que se mueven les llega un aviso al instante.',
      },
      { pose: 'cheer', title: '¡Sede impecable!', text: 'También lo podés imprimir para la cartelera.' },
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
  {
    id: 'temario-del-consejo',
    title: 'Enviar el temario del Consejo',
    description: 'Cargar el orden del día del próximo Consejo y mandárselo a todos.',
    keywords: ['temario', 'orden del día', 'consejo de grupo', 'convocatoria'],
    audience: (c) => c.can('documents', 'edit'),
    steps: [
      {
        route: '/actas',
        target: firstRow,
        clickOnNext: true,
        pose: 'point',
        title: 'El acta del Consejo',
        text: 'Unos días antes del Consejo, creá el acta (o abrila) y cargá el orden del día. Abramos una.',
      },
      {
        target: button('temario'),
        pose: 'point',
        title: 'Enviar temario',
        text: 'Con "Enviar temario" el orden del día les llega a todos los del Consejo en la campanita y por mail, y también a los representantes juveniles rovers que usan la app. Si lo cambiás, lo podés reenviar.',
      },
      { pose: 'cheer', title: '¡Todos al Consejo!', text: 'Después, en la misma acta, se anotan las decisiones y se aprueba.' },
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

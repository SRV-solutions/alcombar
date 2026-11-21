/**
 * Índice de todo lo que se puede hacer en ALCONBAR: lo usa el buscador global (Ctrl+K) y la página de Ayuda.
 * Cada entrada sabe adónde lleva y quién puede verla. Las palabras clave están pensadas para cómo lo diría
 * un/a dirigente ("nómina", "quién vino", "ficha médica", "patrulla"), no para cómo se llama el módulo.
 */
import type { Action, ModuleKey } from '@shared';
import { TUTORIALS } from '../tutorials/catalog';

export interface HelpContext {
  can: (module: ModuleKey, action: Action, unitId?: string | null) => boolean;
  /** ¿Tiene el permiso para todo el Grupo? (no solo en su unidad) */
  canAll: (module: ModuleKey, action: Action) => boolean;
  isSuperadmin: boolean;
  loggedIn: boolean;
  /** Es la cuenta de un rover (entra con su DNI). */
  rover: boolean;
  /** Es del equipo de educadores de una Comunidad Rover. */
  roverEducator: boolean;
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
    description:
      'El legajo de cada protagonista según Scouts de Argentina, con semáforo por unidad: autorización de ingreso, declaración jurada de salud (ficha médica), autorizaciones anuales de salidas cercanas y de uso de imagen, vacunas, obra social, DNI y partida de nacimiento. Qué falta, qué vence y qué no corresponde.',
    path: '/documentacion',
    section: 'Protagonistas',
    keywords: ['documentación', 'legajo', 'legajos', 'ficha médica', 'ficha medica', 'declaración jurada de salud', 'djs', 'autorización', 'autorizaciones', 'autorización de ingreso', 'uso de imagen', 'retiro', 'salidas', 'vacunas', 'obra social', 'partida de nacimiento', 'fotocopia dni', 'vencimiento', 'vencida', 'qué falta', 'no corresponde', 'papeles', 'semáforo'],
    show: can('member_documents', 'view'),
  },
  {
    id: 'autorizaciones-firmadas',
    title: 'Firmar autorizaciones con el dedo',
    description:
      'Autorizaciones: la madre, el padre o el tutor firma en persona, con el dedo, en el celular o la tablet del educador, sobre la planilla oficial de Scouts de Argentina (ingreso, uso de imagen, anual de salidas cercanas y salidas/campamentos) y dos planillas del Grupo (retirarse solo/a y retiro por otros adultos). Cada una se baja en PDF con el mismo formato de la planilla, sola o todas juntas, y también sin firmar para firmarla en papel. El legajo queda al día. La de ingreso lleva dos educadores testigos; las de salidas y campamentos, el aval del Jefe/a de Unidad o de Grupo.',
    path: '/autorizaciones',
    section: 'Protagonistas',
    keywords: ['firmar', 'firma digital', 'firma electrónica', 'firmar con el dedo', 'autorización', 'autorizaciones', 'planilla saac', 'aval', 'testigos', 'pdf autorización', 'descargar autorización', 'imprimir autorización', 'uso de imagen', 'salidas cercanas', 'ingreso', 'retirarse solo', 'retiro', 'quién lo retira', 'autorizados a retirar'],
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
      'Protagonistas → Pases de unidad: a quiénes les toca pasar de rama en abril (los que cumplen la edad de pase hasta el 30 de junio de ese año; los Caminantes, con 18 cumplidos el día de los pases), pasar a varios juntos (por ejemplo de la Pedro Bártolo a la Luis Conde) y el historial del año. Uno solo: botón "Pase de unidad" en su ficha.',
    path: '/pases',
    section: 'Protagonistas',
    keywords: [
      'pase', 'pases', 'pase de rama', 'cambio de unidad', 'cambiar de unidad', 'pasar de unidad', 'pasar a la manada', 'pasar a la unidad',
      'pasar a caminantes', 'pasar a rovers', 'subir de rama', 'por edad', 'cumple 11', 'cumple 14', 'cumple 18', 'pases de abril', '30 de junio', 'fecha de corte', 'mover chicos', 'otra patrulla', 'otra unidad',
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

  // --- Programa y Progresión (etapas 3 y 4) ---
  {
    id: 'fichas-actividad',
    title: 'Fichas de actividad',
    description:
      'Planificar cada actividad: objetivos, competencias, desarrollo por momentos, materiales y seguridad. Circuito: borrador → en revisión → aprobada → realizada → evaluada. El buscador encuentra las fichas por su nombre o por lo que dicen adentro.',
    path: '/programa',
    section: 'Programa',
    keywords: ['ficha', 'fichas', 'ficha de actividad', 'actividad', 'planificar', 'planificación', 'juego', 'objetivos', 'materiales', 'seguridad', 'qué hacemos el sábado', 'buscar ficha', 'buscar actividad', 'buscar por contenido'],
    show: can('activities', 'view'),
  },
  {
    id: 'nueva-ficha',
    title: 'Nueva ficha de actividad',
    description: 'Programa → "Nueva ficha": la actividad, destinatarios y propósito (área y competencias), desarrollo y seguridad. Queda en borrador hasta que la mandás a revisión.',
    path: '/programa/fichas/nueva',
    section: 'Programa',
    keywords: ['nueva ficha', 'crear ficha', 'cargar actividad', 'armar actividad', 'planificar actividad'],
    show: can('activities', 'create'),
  },
  {
    id: 'aprobar-fichas',
    title: 'Revisar y aprobar fichas',
    description: 'Abrí la ficha "En revisión" y tocá "Aprobar" o "Devolver" (con un comentario). Si se edita una ficha aprobada, vuelve a borrador.',
    path: '/programa',
    section: 'Programa',
    keywords: ['aprobar', 'aprobar ficha', 'revisión', 'devolver ficha', 'enviar a revisión', 'visto bueno'],
    show: can('activities', 'view'),
  },
  {
    id: 'evaluar-ficha',
    title: 'Evaluar una actividad',
    description: 'Después de hacerla: "Marcar realizada" y "Evaluar" (qué salió bien, qué cambiar, cumplimiento de objetivos). Así la ficha suma al banco y a los estándares.',
    path: '/programa',
    section: 'Programa',
    keywords: ['evaluar', 'evaluación', 'realizada', 'cómo salió', 'después de la actividad'],
    show: can('activities', 'view'),
  },
  {
    id: 'imprimir-ficha',
    title: 'Descargar una ficha en PDF (formato SAAC)',
    description: 'En la ficha, "Imprimir": abre la vista para papel con el botón "Imprimir o guardar PDF".',
    path: '/programa',
    section: 'Programa',
    keywords: ['imprimir ficha', 'pdf', 'papel', 'llevar la ficha'],
    show: can('activities', 'view'),
  },
  {
    id: 'banco-fichas',
    title: 'Banco de fichas',
    description:
      'Fichas aprobadas y realizadas de todas las unidades. Buscás por nombre o por contenido, filtrás por rama, área, competencia, tipo y lugar, y con "Usar en mi unidad" la copiás para tu unidad.',
    path: '/programa/banco',
    section: 'Programa',
    keywords: ['banco', 'banco de fichas', 'ideas', 'actividades de otros', 'reutilizar', 'copiar ficha', 'duplicar ficha', 'buscar actividades'],
    show: can('activities', 'view'),
  },
  {
    id: 'ciclos-programa',
    title: 'Ciclos de programa',
    description: 'Cada ciclo tiene diagnóstico, propósitos, las actividades del ciclo y la evaluación con las revisiones de fin de ciclo.',
    path: '/programa/ciclos',
    section: 'Programa',
    keywords: ['ciclo', 'ciclos', 'ciclo de programa', 'diagnóstico', 'propósitos', 'evaluación del ciclo', 'trimestre'],
    show: can('activities', 'view'),
  },
  {
    id: 'programa-sabado',
    title: 'Programa del sábado',
    description:
      'El cronograma de la reunión o de un día de campamento, por momentos (hora, actividad o ficha, responsable). Se ordenan solos por hora y quedan plegados en un renglón; tocás uno para editarlo. Se guarda por fecha y se imprime.',
    path: '/programa/sabado',
    section: 'Programa',
    keywords: ['programa del sábado', 'reunión', 'cronograma', 'horarios', 'momentos', 'sábado', 'qué hacemos hoy', 'agenda de la reunión'],
    show: can('activities', 'view'),
  },
  {
    id: 'progresion',
    title: 'Progresión de la unidad',
    description: 'Tablero con la etapa, insignia, competencias por área y última revisión de cada protagonista, más los estándares anuales de la unidad.',
    path: '/progresion',
    section: 'Programa',
    keywords: ['progresión', 'progresion', 'etapas', 'insignia', 'competencias', 'tablero', 'estándares', 'cómo va cada chico', 'avance'],
    show: can('progression', 'view'),
  },
  {
    id: 'progresion-protagonista',
    title: 'Progresión de un protagonista',
    description: 'Tocá un chico en el tablero (o la pestaña "Progresión" de su ficha): etapas, momentos, competencias, roles por ciclo, revisiones de fin de ciclo y especialidades.',
    path: '/progresion',
    section: 'Programa',
    keywords: ['etapa', 'registrar etapa', 'pasó de etapa', 'competencias del chico', 'revisión de fin de ciclo', 'rol', 'especialidad', 'promesa'],
    show: can('progression', 'view'),
  },
  {
    id: 'esquemas',
    title: 'Esquemas y catálogos de progresión',
    description: 'Progresión → Esquemas y catálogos: competencias, áreas, etapas y especialidades de cada rama. Las competencias se pegan de a muchas con "Importar lista".',
    path: '/progresion/esquemas',
    section: 'Programa',
    keywords: ['esquema', 'esquemas', 'catálogo', 'cargar competencias', 'importar competencias', 'áreas', 'etapas de la rama', 'rumbo sur', 'cuadernillo'],
    show: can('progression', 'view'),
  },
  {
    id: 'especialidades',
    title: 'Especialidades',
    description: 'El catálogo de especialidades se carga en Esquemas y catálogos → Especialidades; después se registran en la progresión de cada protagonista.',
    path: '/progresion/esquemas?tab=especialidades',
    section: 'Programa',
    keywords: ['especialidad', 'especialidades', 'insignia de especialidad'],
    show: can('progression', 'view'),
  },

  {
    id: 'seguimiento-progresion',
    title: 'Seguimiento de la progresión (historial)',
    description:
      'En la progresión de cada protagonista, tarjeta "Seguimiento": anotá cómo viene y mirá el historial de todo lo que se hizo (etapas, competencias, revisiones, cambios de patrulla) con el adulto que lo hizo.',
    path: '/progresion',
    section: 'Programa',
    keywords: ['seguimiento', 'historial', 'quién hizo', 'nota', 'anotar', 'bitácora', 'cómo viene', 'acompañamiento'],
    show: can('progression', 'view'),
  },
  {
    id: 'ficha-desde-competencia',
    title: 'Crear una ficha desde una competencia',
    description: 'Progresión → Esquemas y catálogos → Competencias: "Crear ficha" abre una ficha nueva con esa competencia y su área ya elegidas.',
    path: '/progresion/esquemas',
    section: 'Programa',
    keywords: ['crear ficha', 'ficha desde competencia', 'trabajar competencia', 'actividad para una competencia'],
    show: can('activities', 'create'),
  },

  // --- Tesorería, eventos y campamentos (etapas 5 y 6) ---
  {
    id: 'contabilidad',
    title: 'Contabilidad del Grupo',
    description:
      'Ingresos y gastos por cuenta (caja, banco, Mercado Pago) y categoría, saldos, presupuesto anual, reportes y cierre de mes. Incluye las cajas de las unidades: arriba elegís mirar todo, solo el Grupo o una unidad.',
    path: '/contabilidad',
    section: 'Tesorería',
    keywords: ['contabilidad', 'tesorería', 'plata', 'dinero', 'caja', 'banco', 'mercado pago', 'saldo', 'cuánta plata hay', 'balance', 'finanzas'],
    show: can('accounting', 'view'),
  },
  {
    id: 'registrar-movimiento',
    title: 'Registrar un ingreso o un gasto',
    description: 'Contabilidad → Movimientos: "Registrar ingreso" o "Registrar gasto", con cuenta, categoría, comprobante y, si corresponde, el evento o campamento. Para corregir uno de un mes cerrado, se anula (contra-asiento).',
    path: '/contabilidad?tab=movimientos',
    section: 'Tesorería',
    keywords: ['ingreso', 'gasto', 'egreso', 'movimiento', 'cargar gasto', 'compra', 'factura', 'comprobante', 'anular movimiento', 'transferencia entre cuentas'],
    show: can('accounting', 'view'),
  },
  {
    id: 'cajas-unidades',
    title: 'Cajas de las unidades y plata para cada unidad',
    description:
      'Cada unidad puede tener su propia caja. Contabilidad → Cuentas y cierres → "Nueva cuenta" → "Es de: Unidad …". Para pasarle plata (por ejemplo, la de programa): Movimientos → "Transferencia", desde una cuenta del Grupo hacia la caja de la unidad. Quién la lleva se elige en Usuarios con el rol "Finanzas de la unidad".',
    path: '/contabilidad?tab=config',
    section: 'Tesorería',
    keywords: ['caja de la unidad', 'plata de la unidad', 'pasar plata', 'plata de programa', 'transferir a una unidad', 'finanzas de la unidad', 'tesorero de unidad'],
    show: (c) => c.canAll('accounting', 'create'),
  },
  {
    id: 'plata-de-la-unidad',
    title: 'La plata de tu unidad',
    description:
      'Contabilidad muestra las cuentas de tu unidad: saldo, lo que entró (eventos, lo que pasó el Grupo) y lo que se gastó. Registrás ingresos y gastos en la caja de la unidad; la plata que el Grupo le pasa la registran Secretaría o Tesorería.',
    path: '/contabilidad',
    section: 'Tesorería',
    keywords: ['plata de la unidad', 'caja de la unidad', 'gastos de la unidad', 'finanzas de la unidad', 'tesorero de unidad', 'cuánta plata tenemos'],
    show: (c) => c.can('accounting', 'view') && !c.canAll('accounting', 'view'),
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto anual',
    description: 'Contabilidad → Presupuesto: lo previsto por categoría para el año, comparado con lo real. Se aprueba y se puede volver a borrador.',
    path: '/contabilidad?tab=presupuesto',
    section: 'Tesorería',
    keywords: ['presupuesto', 'previsto', 'planificación financiera', 'cuánto vamos a gastar'],
    show: (c) => c.canAll('accounting', 'view'),
  },
  {
    id: 'reportes-contables',
    title: 'Reportes de caja y resultados',
    description: 'Contabilidad → Reportes: caja por período y resultado de cada evento y campamento. Exportar movimientos a CSV.',
    path: '/contabilidad?tab=reportes',
    section: 'Tesorería',
    keywords: ['reporte', 'caja por período', 'resultado', 'ganancia', 'cuánto dejó', 'exportar', 'csv', 'excel', 'rendición de cuentas'],
    show: can('accounting', 'view'),
  },
  {
    id: 'cierre-mes',
    title: 'Cuentas, categorías y cierre de mes',
    description: 'Contabilidad → Cuentas y cierres: crear cuentas y categorías, y cerrar el mes para que nadie modifique lo ya controlado.',
    path: '/contabilidad?tab=config',
    section: 'Tesorería',
    keywords: ['cerrar mes', 'cierre', 'reabrir mes', 'nueva cuenta', 'categorías', 'arqueo'],
    show: can('accounting', 'view'),
  },
  {
    id: 'cuotas',
    title: 'Cuotas y pagos',
    description: 'Quién debe y cuánto (deudores), el plan de cuotas del año, generar las cuotas del mes o la afiliación, y las becas.',
    path: '/contabilidad/cuotas',
    section: 'Tesorería',
    keywords: ['cuota', 'cuotas', 'deudores', 'quién debe', 'deuda', 'atrasados', 'afiliación', 'mensualidad', 'cobrar'],
    show: can('fees', 'view'),
  },
  {
    id: 'generar-cuotas',
    title: 'Generar las cuotas del mes',
    description:
      'Cuotas y pagos → Generar cuotas (Secretaría o Tesorería): con vista previa antes de crear. También genera la afiliación anual. Aplica el descuento por hermanos y las becas. Los montos del plan de cuotas los define Tesorería.',
    path: '/contabilidad/cuotas?tab=generar',
    section: 'Tesorería',
    keywords: ['generar cuotas', 'cuota del mes', 'afiliación anual', 'descuento hermanos'],
    show: can('fees', 'create'),
  },
  {
    id: 'becas',
    title: 'Becas y descuentos',
    description: 'Cuotas y pagos → Becas: protagonistas con descuento en la cuota. Se cargan desde la pestaña Pagos de su ficha ("Beca / descuento").',
    path: '/contabilidad/cuotas?tab=becas',
    section: 'Tesorería',
    keywords: ['beca', 'becas', 'descuento', 'no paga', 'media cuota'],
    show: can('fees', 'view'),
  },
  {
    id: 'registrar-pago',
    title: 'Registrar un pago y dar el recibo',
    description:
      'En la ficha del protagonista → pestaña Pagos → "Registrar pago": elegís qué cuotas, afiliación o campamento paga, la cuenta y el medio. Genera el recibo para imprimir. Lo hacen Secretaría y Tesorería; anular un pago, Tesorería.',
    path: '/protagonistas',
    section: 'Tesorería',
    keywords: ['pago', 'pagar', 'cobrar cuota', 'registrar pago', 'recibo', 'comprobante de pago', 'pagó', 'imprimir recibo'],
    show: can('fees', 'view'),
  },
  {
    id: 'eventos',
    title: 'Eventos del Grupo',
    description: 'Fogones, aniversario, rifas y otros eventos: tareas y compras, presupuesto, ingresos y gastos, y la rendición final.',
    path: '/eventos',
    section: 'Tesorería',
    keywords: ['evento', 'eventos', 'fogón', 'aniversario', 'rifa', 'recaudación', 'kermesse', 'tareas', 'rendir evento'],
    show: can('events', 'view'),
  },
  {
    id: 'campamentos',
    title: 'Campamentos y salidas',
    description: 'Cada campamento, acantonamiento o salida: datos, inscripción y legajo (autorizaciones, DNI y ficha médica), presupuesto y rendición, menú, compras y transporte.',
    path: '/campamentos',
    section: 'Tesorería',
    keywords: ['campamento', 'campamentos', 'acantonamiento', 'salida', 'campa', 'inscripción', 'legajo', 'autorización', 'menú', 'compras', 'transporte', 'micro'],
    show: can('camps', 'view'),
  },
  {
    id: 'legajo-campamento',
    title: 'Inscripción y legajo del campamento',
    description: 'En el campamento → "Inscripción y legajo": inscribir a todos o elegir, ver con el semáforo quién tiene la autorización firmada, DNI y ficha médica vigente, e imprimir el legajo.',
    path: '/campamentos',
    section: 'Tesorería',
    keywords: ['legajo', 'inscriptos', 'autorización firmada', 'semáforo', 'quién va', 'lista de acampantes', 'imprimir legajo'],
    show: can('camps', 'view'),
  },
  {
    id: 'lugares-acampe',
    title: 'Lugares de acampe',
    description: 'Campamentos → "Lugares de acampe": datos de contacto, servicios, costo y la calificación de cada vez que se fue.',
    path: '/campamentos/lugares',
    section: 'Tesorería',
    keywords: ['lugar', 'lugares de acampe', 'dónde acampar', 'predio', 'campo', 'contacto del lugar'],
    show: can('camps', 'view'),
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
    id: 'mover-pequeno-grupo',
    title: 'Cambiar a un chico de patrulla, seisena o equipo',
    description:
      'En la unidad, tabla de protagonistas: el desplegable de cada fila lo cambia al instante; con las casillas movés a varios juntos ("Mover a…"). Lo hacen los adultos de esa unidad, solo en su unidad.',
    path: '/grupo/unidades',
    section: 'Grupo',
    keywords: ['mover', 'cambiar de patrulla', 'pasar de patrulla', 'cambiar de seisena', 'cambiar de equipo', 'armar patrullas', 'repartir'],
    show: can('members', 'edit'),
  },
  {
    id: 'adultos',
    title: 'Adultos',
    description: 'Educadores y colaboradores del Grupo: datos, tótem, cargos de este año, formación y su acceso a la app (mail, roles y enlace para entrar).',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['adultos', 'dirigentes', 'educadores', 'jefes', 'ayudantes', 'colaboradores', 'tótem', 'totem', 'nómina de adultos', 'usuarios', 'acceso'],
    show: can('adults', 'view'),
  },
  {
    id: 'sobre-el-grupo',
    title: 'Sobre el Grupo',
    description: 'La historia del Grupo, sus jefes y jefas, la tribu. Lo escribe quien administra el Grupo, lo lee cualquiera que entra a la app, y todos pueden sumar un aporte en cada sección.',
    path: '/grupo/sobre',
    section: 'Grupo',
    keywords: ['historia', 'historia del grupo', 'jefes de grupo', 'tribu', 'tótems', 'quiénes somos', 'sobre el grupo'],
    show: (c) => c.loggedIn,
  },
  {
    id: 'representantes-juveniles',
    title: 'Representantes juveniles en el Consejo',
    description: 'Dos por Comunidad Rover y uno por Comunidad Caminante, elegidos por sus pares. Los marca el equipo de educadores desde la ficha del protagonista; a los rovers con cuenta les llega el temario del Consejo.',
    path: '/protagonistas',
    section: 'Protagonistas',
    keywords: ['representante', 'representantes juveniles', 'consejo de grupo', 'caminantes', 'rovers', 'etiqueta'],
    show: (c) => c.can('members', 'view'),
  },
  {
    id: 'foto-de-perfil',
    title: 'Foto de perfil (el animal de tu tótem)',
    description: 'Quien tiene tótem elige en Mi perfil el dibujo de su animal. Se ve en el menú, en la lista de adultos y en su ficha; tocándola se abre grande, con el animal completo.',
    path: '/perfil',
    section: 'Mi cuenta',
    keywords: ['foto', 'foto de perfil', 'avatar', 'tótem', 'totem', 'animal'],
    show: (c) => c.loggedIn && !c.rover,
  },
  {
    id: 'rover-plan',
    title: 'Mi Plan Personal',
    description: 'Tu visión a futuro, tus metas con acciones y plazos, y tus «altos en el camino». Lo ven solo vos y tus educadores.',
    path: '/rover/plan',
    section: 'Comunidad Rover',
    keywords: ['plan personal', 'ppa', 'metas', 'visión', 'alto en el camino', 'evaluación'],
    show: (c) => c.rover,
  },
  {
    id: 'rover-comunidad',
    title: 'La Comunidad Rover',
    description: 'Cada rover, si ya entra a la app y cómo viene su Plan Personal.',
    path: '/rover',
    section: 'Comunidad Rover',
    keywords: ['rovers', 'comunidad', 'plan personal', 'ppa', 'planes'],
    show: (c) => c.roverEducator,
  },
  {
    id: 'rover-proyectos',
    title: 'Proyectos y mingas',
    description: 'La ficha del Proyecto Rover y la plantilla de organización de la Minga. Se arman en borrador, se postulan en la Asamblea y, aprobados, se ponen en marcha.',
    path: '/rover/proyectos',
    section: 'Comunidad Rover',
    keywords: ['proyecto', 'proyectos', 'minga', 'mingas', 'ficha de proyecto', 'servicio', 'solidario'],
    show: (c) => c.rover || c.roverEducator,
  },
  {
    id: 'rover-asamblea',
    title: 'Asamblea de Comunidad',
    description: 'El educador activa el modo Asamblea; los rovers dan el presente, postulan y votan desde el celular. Se aprueba con más de la mitad de los presentes.',
    path: '/rover/asamblea',
    section: 'Comunidad Rover',
    keywords: ['asamblea', 'votar', 'votación', 'postular', 'orden del día', 'presentes'],
    show: (c) => c.rover || c.roverEducator,
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
    id: 'documentacion-adultos',
    title: 'Documentación de los adultos',
    description:
      'En la ficha de cada adulto: ficha médica, DNI, credencial de obra social y certificado de antecedentes penales, con su vencimiento. La lista de adultos muestra quién la tiene completa. Los documentos que se piden se cambian en Administración → Catálogos.',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['documentación de adultos', 'legajo del adulto', 'antecedentes penales', 'ficha médica adulto', 'certificado de antecedentes'],
    show: can('adults', 'view'),
  },
  {
    id: 'formacion',
    title: 'Formación de adultos',
    description: 'Insignia de Madera, Miembro Activo, etapas, habilitaciones y experiencias de formación con su certificado; Asesor Personal de Formación (APF).',
    path: '/adultos',
    section: 'Grupo',
    keywords: ['formación', 'formacion', 'insignia de madera', 'im', 'miembro activo', 'curso', 'cursos', 'nivel 1', 'nivel 2', 'etapa básica', 'etapa intermedia', 'etapa avanzada', 'habilitación', 'habilitaciones', 'experiencia', 'experiencias de formación', 'mi rincón', 'registro saac', 'apf', 'asesor', 'certificado', 'sin formación'],
    show: can('training', 'view'),
  },
  {
    id: 'equipos',
    title: 'Equipos de apoyo',
    description: 'Equipos del Comité Ejecutivo (intendencia, tesorería, etc.) con su encargado/a e integrantes.',
    path: '/grupo/equipos',
    section: 'Grupo',
    keywords: ['equipos de apoyo', 'comité ejecutivo', 'intendencia', 'tesorería', 'secretaría', 'responsable', 'encargado de equipo'],
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

  // --- Grupo: inventario, calendario, actas y documentos (etapas 7 y 8) ---
  {
    id: 'inventario',
    title: 'Inventario del Grupo',
    description: 'Bienes del Grupo y de cada unidad: cantidad, estado, ubicación, foto y unidad dueña. Alertas de bienes en mal estado. Exportar a CSV.',
    path: '/inventario',
    section: 'Grupo',
    keywords: ['inventario', 'bienes', 'materiales', 'carpas', 'ollas', 'cocina', 'herramientas', 'banderas', 'depósito', 'intendencia', 'qué tenemos', 'estado de las carpas'],
    show: can('inventory', 'view'),
  },
  {
    id: 'prestamos',
    title: 'Préstamos de materiales',
    description: 'Inventario → Préstamos: pedir materiales para una actividad o campamento, autorizar, entregar y registrar la devolución (con el estado en que volvió). Muestra los vencidos.',
    path: '/inventario/prestamos',
    section: 'Grupo',
    keywords: ['préstamo', 'prestamo', 'prestar', 'pedir carpa', 'pedir materiales', 'devolver', 'devolución', 'vencido', 'autorizar préstamo', 'quién tiene'],
    show: can('inventory', 'view'),
  },
  {
    id: 'calendario',
    title: 'Calendario del Grupo y de cada unidad',
    description: 'Reuniones, Consejos de Grupo, eventos, campamentos, formación y feriados, por mes o como agenda. Filtrás por unidad y tipo.',
    path: '/calendario',
    section: 'Grupo',
    keywords: ['calendario', 'fechas', 'agenda', 'cronograma', 'cuándo', 'próximo sábado', 'feriado', 'consejo de grupo', 'reunión', 'actividades del año'],
    show: can('calendar', 'view'),
  },
  {
    id: 'servicio-rotativo',
    title: 'Servicio rotativo',
    description: 'Calendario → "Servicio rotativo": asigna las unidades por turno a los sábados entre dos fechas (con vista previa antes de crear).',
    path: '/calendario',
    section: 'Grupo',
    keywords: ['servicio rotativo', 'turnos', 'limpieza', 'quién le toca', 'servicio', 'rotación'],
    show: can('calendar', 'create'),
  },
  {
    id: 'actas',
    title: 'Actas del Consejo de Grupo',
    description: 'Actas numeradas por año: asistentes, orden del día y decisiones. Se aprueban, se imprimen con firmas y pueden enlazar al Drive.',
    path: '/actas',
    section: 'Grupo',
    keywords: ['acta', 'actas', 'consejo de grupo', 'minuta', 'reunión del consejo', 'decisiones', 'asistentes', 'orden del día'],
    show: can('documents', 'view'),
  },
  {
    id: 'documentos',
    title: 'Documentos del Grupo',
    description: 'Actas y documentos → Documentos: reglamentos, planillas, formularios y autorizaciones, guías SAAC… con el enlace al Drive.',
    path: '/actas?tab=documentos',
    section: 'Grupo',
    keywords: ['documentos', 'reglamento', 'planilla', 'formulario', 'autorización', 'drive', 'guías saac', 'archivo', 'dónde está el formulario'],
    show: can('documents', 'view'),
  },

  // --- Administración ---
  {
    id: 'cruz-del-sur',
    title: 'Altas y bajas para cargar en Cruz del Sur',
    description:
      'Cada alta o baja de un protagonista o un adulto queda en "Altas y bajas · Cruz del Sur" para cargarla en la plataforma de SAAC. Cuando está cargada, se marca como hecha. El equipo que recibe los avisos se elige en Equipos de apoyo.',
    path: '/cruz-del-sur',
    section: 'Protagonistas',
    keywords: ['cruz del sur', 'altas', 'bajas', 'saac', 'cargar en saac', 'afiliar', 'registro'],
    show: (c) => c.isSuperadmin || c.canAll('members', 'edit') || c.canAll('adults', 'edit'),
  },
  {
    id: 'referentes',
    title: 'Referentes de rama',
    description:
      'Programa → Referentes de rama: a quién consultar por cada rama. Les llega un aviso cuando una unidad de su rama carga una ficha o un campamento, y pueden ver (sin editar) las fichas, campamentos, progresión y calendario de esas unidades.',
    path: '/programa/referentes',
    section: 'Programa',
    keywords: ['referente', 'referentes', 'rama', 'equipo de programa', 'a quién consulto'],
    show: can('activities', 'view'),
  },
  {
    id: 'sabados',
    title: 'Sábados y servicio',
    description:
      'Calendario → Sábados y servicio: qué rama está de servicio cada sábado y qué pasa ese día (Consejo, feriado, campamento). Si tu unidad no puede, "Cambiar día" y les llega un aviso a los adultos de las unidades que se mueven.',
    path: '/calendario/sabados',
    section: 'Grupo',
    keywords: ['sábado', 'sábados', 'servicio', 'rama de servicio', 'cambiar día', 'limpieza', 'merienda'],
    show: can('calendar', 'view'),
  },
  {
    id: 'temario-consejo',
    title: 'Enviar el temario del Consejo',
    description:
      'En el acta del próximo Consejo, cargá el orden del día y tocá "Enviar temario": les llega a todos los del Consejo en la campanita y por mail.',
    path: '/actas',
    section: 'Grupo',
    keywords: ['temario', 'orden del día', 'consejo de grupo', 'convocatoria', 'avisar al consejo'],
    show: can('documents', 'edit'),
  },
  {
    id: 'avisos',
    title: 'Los avisos (la campanita)',
    description:
      'La campanita de arriba muestra lo que te toca: fichas y campamentos de tu rama, cambios de servicio, el temario del Consejo, altas y bajas. Tocando un aviso vas a lo que corresponde. También llegan por mail.',
    path: '/',
    section: 'Mi cuenta',
    keywords: ['avisos', 'notificaciones', 'campanita', 'mails', 'me llegó un mail'],
    show: (c) => c.loggedIn,
  },
  {
    id: 'usuarios',
    title: 'Acceso a la app (usuarios e invitaciones)',
    description: 'Desde Adultos: darle acceso a una persona, asignarle roles, desactivarla y generar el enlace para que elija su contraseña (se lo mandás por WhatsApp).',
    path: '/adultos',
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

  {
    id: 'celular',
    title: 'Usar la app en el celular',
    description: 'Botón "Abrir en el celular" (abajo en el menú) o Mi perfil → ALCONBAR en tu celular: escaneás un código QR y se abre la app con tu sesión iniciada. Después la agregás a la pantalla de inicio.',
    path: '/perfil#celular',
    section: 'Mi cuenta',
    keywords: ['celular', 'celu', 'teléfono', 'móvil', 'qr', 'código qr', 'escanear', 'app', 'instalar', 'pantalla de inicio', 'android', 'iphone'],
  },

  // --- Soporte ---
  {
    id: 'reportar-problema',
    title: 'Reportar un problema',
    description:
      'Si algo no funciona, tenés una sugerencia o una consulta sobre la plataforma: botón "Reportar un problema" abajo en el menú. Va con la pantalla en la que estabas. En "Mis reportes" ves la respuesta.',
    path: '/?tutorial=reportar-problema',
    section: 'Ayuda',
    keywords: ['reportar', 'reporte', 'error', 'bug', 'falla', 'no anda', 'no funciona', 'problema', 'sugerencia', 'soporte', 'ayuda técnica', 'se rompió'],
  },
  {
    id: 'reportes-admin',
    title: 'Reportes de problemas (superadmin)',
    description: 'Administración → Reportes: lo que reportan los usuarios, con la pantalla y los errores del navegador. Cambiá el estado y respondé.',
    path: '/admin/reportes',
    section: 'Administración',
    keywords: ['reportes', 'bugs', 'errores reportados', 'soporte', 'responder reporte'],
    show: (c) => c.isSuperadmin,
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

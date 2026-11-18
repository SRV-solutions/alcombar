/**
 * Autorizaciones de madres, padres y tutores firmadas en pantalla (con el dedo), sobre las planillas oficiales de
 * Scouts de Argentina (versión 07-21). El texto se arma acá, igual en el servidor, en la pantalla y en el PDF: lo que
 * el responsable lee es exactamente lo que queda guardado.
 *
 * Se firma en persona, en el dispositivo de un educador (que queda como quien presenció la firma). Según la planilla:
 *  - Ingreso: se firma ante dos educadores del Grupo, que firman como testigos.
 *  - Salidas cercanas y salidas/acantonamientos/campamentos: llevan el aval del Jefe/a de Grupo o de Unidad.
 *  - Uso de imagen: solo la firma del responsable.
 * Además hay dos planillas propias del Grupo (no son formularios nacionales): retirarse solo/a y retiro por otros adultos.
 */
import { z } from 'zod';

export const AUTH_TEMPLATE_VERSION = '07-21';
/** Versión de las planillas propias del Grupo. */
export const AUTH_GROUP_TEMPLATE_VERSION = '11-26';

export const AUTH_KINDS = ['ingreso', 'imagen', 'salidas_cercanas', 'campamento', 'retiro_solo', 'retiro_terceros'] as const;
export type AuthKind = (typeof AUTH_KINDS)[number];

export const AUTH_KIND_LABELS: Record<AuthKind, string> = {
  ingreso: 'Autorización de ingreso',
  imagen: 'Autorización de uso de imagen',
  salidas_cercanas: 'Autorización anual para salidas cercanas',
  campamento: 'Autorización para salidas, acantonamientos y campamentos',
  retiro_solo: 'Autorización para retirarse solo/a',
  retiro_terceros: 'Autorización de retiro por otros adultos',
};
/** Planilla oficial de Scouts de Argentina (true) o propia del Grupo (false). */
export const AUTH_KIND_OFFICIAL: Record<AuthKind, boolean> = { ingreso: true, imagen: true, salidas_cercanas: true, campamento: true, retiro_solo: false, retiro_terceros: false };
/** Tipo de documento del legajo que queda presentado al firmar (el de campamento va a la inscripción). */
export const AUTH_KIND_DOCUMENT: Record<AuthKind, string | null> = {
  ingreso: 'aut_ingreso',
  imagen: 'aut_imagen',
  salidas_cercanas: 'aut_salidas',
  campamento: null,
  retiro_solo: 'aut_retiro',
  retiro_terceros: 'aut_retiro_terceros',
};
/** Las que valen por un año calendario. */
export const AUTH_KIND_ANNUAL: Record<AuthKind, boolean> = { ingreso: false, imagen: true, salidas_cercanas: true, campamento: false, retiro_solo: true, retiro_terceros: true };
export const AUTH_NEEDS_AVAL: Record<AuthKind, boolean> = { ingreso: false, imagen: false, salidas_cercanas: true, campamento: true, retiro_solo: false, retiro_terceros: false };
export const AUTH_WITNESSES: Record<AuthKind, number> = { ingreso: 2, imagen: 0, salidas_cercanas: 0, campamento: 0, retiro_solo: 0, retiro_terceros: 0 };

export const AUTH_STATUSES = ['firmada', 'completa', 'anulada'] as const;
export type AuthStatus = (typeof AUTH_STATUSES)[number];
export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = { firmada: 'Firmada', completa: 'Completa', anulada: 'Anulada' };

/** Carácter en el que firma (nota 2 de la planilla). */
export const SIGNER_ROLES = ['madre', 'padre', 'tutor/a', 'guardador/a', 'persona que ejerce la tenencia judicial'] as const;
/** Tipo de actividad de la planilla de salidas (los mismos que un campamento cargado en la app). */
export const AUTH_ACTIVITY_TYPES = ['salida', 'acantonamiento', 'campamento'] as const;
export const AUTH_ACTIVITY_LABELS: Record<(typeof AUTH_ACTIVITY_TYPES)[number], string> = { salida: 'Salida', acantonamiento: 'Acantonamiento', campamento: 'Campamento' };

/** Datos del Grupo que van en las planillas. */
export const GROUP_INFO = { number: '084', name: '155 Divina Providencia', district: '1', zone: '1', locality: 'CABA' } as const;

// ---------------- Firma: el trazo, no una imagen ----------------
/** Trazo manuscrito en pantalla: cada trazo es una lista plana x, y, t (px del lienzo y ms desde el inicio). */
export const signatureSchema = z.object({
  w: z.number().positive().max(4000),
  h: z.number().positive().max(4000),
  strokes: z.array(z.array(z.number().finite()).min(3).max(9000)).min(1).max(120),
});
export type SignatureData = z.infer<typeof signatureSchema>;

/** Cantidad de puntos del trazo (para rechazar un toque suelto como firma). */
export const signaturePoints = (s: SignatureData | null | undefined) => (s ? s.strokes.reduce((n, st) => n + Math.floor(st.length / 3), 0) : 0);
export const MIN_SIGNATURE_POINTS = 12;

const sig = signatureSchema.refine((s) => signaturePoints(s) >= MIN_SIGNATURE_POINTS, 'Falta la firma: firmá con el dedo dentro del recuadro');
const txt = (max: number) => z.string().trim().min(1, 'Completá este dato').max(max);
const optTxt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');
const dni = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length >= 6 && v.length <= 9, 'Revisá el DNI');

/** Los datos de la planilla, sin la firma: sirven para firmar y para bajar el PDF en blanco para firmar en papel. */
const authorizationFields = {
  kind: z.enum(AUTH_KINDS),
  memberId: z.string().uuid(),
  campId: z.string().uuid().nullish(),
  year: z.coerce.number().int().min(2020).max(2100).nullish(),
  place: z.object({ locality: txt(80), department: optTxt(80), province: optTxt(80) }),
  signer: z.object({
    name: txt(160),
    nationality: txt(60),
    birthDate: isoDate,
    dni,
    phone: txt(40),
    address: txt(200),
    role: z.enum(SIGNER_ROLES),
  }),
  minor: z.object({ nationality: txt(60), address: txt(200) }),
  /** Salida, acantonamiento o campamento que no está cargado en la app: se completa a mano. */
  activity: z.object({ type: z.enum(AUTH_ACTIVITY_TYPES), startDate: isoDate, endDate: isoDate, place: txt(200) }).nullish(),
  /** Salidas cercanas: "en un rango no mayor a …" */
  range: optTxt(60),
  /** Ingreso: aclaraciones sobre la tenencia o guarda (lleva una segunda firma). */
  custodyNotes: optTxt(500),
  /** Retiro por otros adultos: quiénes pueden retirarlo. */
  pickups: z.array(z.object({ name: txt(160), dni, relationship: optTxt(60), phone: optTxt(40) })).max(5).nullish(),
  /** Retirarse solo/a: aclaraciones (por ejemplo, "solo los sábados de reunión"). */
  details: optTxt(300),
};
type Fields = z.infer<z.ZodObject<typeof authorizationFields>>;
function checkFields(d: Fields, ctx: z.RefinementCtx) {
  if (d.kind === 'campamento') {
    if (!d.campId && !d.activity) ctx.addIssue({ code: 'custom', path: ['activity', 'place'], message: 'Completá el lugar y las fechas de la salida o el campamento' });
    if (d.activity && d.activity.endDate < d.activity.startDate) ctx.addIssue({ code: 'custom', path: ['activity', 'endDate'], message: 'No puede terminar antes de empezar' });
  }
  if (d.kind === 'salidas_cercanas' && !d.range) ctx.addIssue({ code: 'custom', path: ['range'], message: 'Indicá hasta qué distancia (por ejemplo, 5 km)' });
  if (d.kind === 'retiro_terceros' && !d.pickups?.length) ctx.addIssue({ code: 'custom', path: ['pickups'], message: 'Cargá al menos una persona autorizada a retirarlo' });
}

export const authorizationDraftSchema = z.object(authorizationFields).superRefine(checkFields);
export const authorizationSignSchema = z
  .object({
    ...authorizationFields,
    signature: sig,
    custodySignature: sig.nullish(),
    accepted: z.literal(true, { errorMap: () => ({ message: 'Tiene que tildar que leyó y autoriza' }) }),
  })
  .superRefine((d, ctx) => {
    checkFields(d, ctx);
    if (d.kind === 'ingreso' && d.custodyNotes && !d.custodySignature) ctx.addIssue({ code: 'custom', path: ['custodySignature'], message: 'La aclaración lleva una segunda firma' });
  });
export type AuthorizationSignInput = z.input<typeof authorizationSignSchema>;

export const authorizationWitnessSchema = z.object({
  /** Vacío = firma quien tiene la sesión abierta; con valor, otro educador que firma en este mismo dispositivo. */
  adultId: z.string().uuid().nullish(),
  signature: sig,
});
export const authorizationAvalSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100), signature: sig });
export const authorizationVoidSchema = z.object({ reason: txt(300) });

// ---------------- Contenido congelado y texto de la planilla ----------------
export interface AuthorizationContent {
  kind: AuthKind;
  /** Fecha en que se firma (AAAA-MM-DD); vacía en una planilla para completar en papel. */
  date: string;
  year: number;
  place: { locality: string; department: string | null; province: string | null };
  signer: { name: string; nationality: string; birthDate: string; dni: string; phone: string; address: string; role: string };
  minor: { name: string; nationality: string; birthDate: string | null; dni: string | null; address: string };
  group: { number: string; name: string; district: string; zone: string };
  camp?: { name: string; type: string; startDate: string; endDate: string; place: string } | null;
  range?: string | null;
  custodyNotes?: string | null;
  pickups?: { name: string; dni: string; relationship: string | null; phone: string | null }[] | null;
  details?: string | null;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const parts = (iso: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? { y: m[1], m: MONTHS[Number(m[2]) - 1], d: String(Number(m[3])) } : null;
};
/** DNI con puntos: 12.345.678 */
export const dniDots = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
};

// Los datos completados van marcados para mostrarlos en negrita, como en las planillas que completa el Grupo.
const B0 = '\u0001';
const B1 = '\u0002';
// Negrita cursiva (el nombre de la autorización de ingreso dentro del aval, como en la planilla).
const I0 = '\u0003';
const I1 = '\u0004';
// Tachado ("tachar lo que no corresponda").
const S0 = '\u0005';
const S1 = '\u0006';
/** Partido o provincia que no corresponde (CABA): guiones en la planilla firmada, puntos si es para completar a mano. */
const orDashes = (v: string | null | undefined, signed: boolean) => (v && v.trim() ? V(v) : signed ? '----------' : '.'.repeat(30));
/** Dato completado; si falta, quedan los puntos para completarlo a mano. */
const V = (v: string | number | null | undefined, dots = 22) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s ? `${B0}${s}${B1}` : '.'.repeat(dots);
};
const longDate = (iso: string | null | undefined) => {
  const p = parts(iso);
  return p ? `${V(p.d)} de ${V(p.m)} de ${V(p.y)}` : '....... de ................... de ..........';
};
const dayDate = (iso: string | null | undefined) => {
  const p = parts(iso);
  return p ? V(`${p.d} de ${p.m} de ${p.y}`) : '.......................';
};

/** Parte un texto de la planilla en tramos normales, en negrita (datos) y en negrita cursiva. */
export function splitMarked(text: string): { text: string; bold: boolean; italic: boolean; strike: boolean }[] {
  const out: { text: string; bold: boolean; italic: boolean; strike: boolean }[] = [];
  let bold = false;
  let italic = false;
  let strike = false;
  let cur = '';
  const push = () => {
    if (cur) out.push({ text: cur, bold: bold || italic, italic, strike });
    cur = '';
  };
  for (const ch of text) {
    if (ch === B0 || ch === B1 || ch === I0 || ch === I1 || ch === S0 || ch === S1) {
      push();
      if (ch === B0) bold = true;
      else if (ch === B1) bold = false;
      else if (ch === I0) italic = true;
      else if (ch === I1) italic = false;
      else strike = ch === S0;
    } else cur += ch;
  }
  push();
  return out;
}
/** El texto sin marcas (para buscar o comparar). */
export const plainText = (text: string) => text.replace(/[\u0001-\u0006]/g, '');

export interface AuthorizationParagraph {
  text: string;
  /** lead = el párrafo de los datos (renglones más separados); item = renglón de una lista; italic = aclaración en cursiva. */
  kind: 'lead' | 'body' | 'italic' | 'item';
}
export interface AuthorizationText {
  official: boolean;
  /** Versión de la planilla (la oficial de SAAC o la del Grupo). */
  version: string;
  /** Renglones del título del encabezado (en celeste, junto al logo) y título principal. */
  header: string[];
  title: string[];
  /** Carta (uso de imagen): destinatario antes del texto. */
  addressee?: string[];
  paragraphs: AuthorizationParagraph[];
  /** Etiqueta de la firma del responsable. */
  signatureLabel: string;
  /** Ingreso: renglón de aclaración de tenencia o guarda (con su segunda firma si se completó). */
  custody?: { text: string; filled: boolean } | null;
  aval?: string | null;
  witnesses?: number;
  footnotes: string[];
}

const NOTE_1 = '1 Nombre y apellido completo de quien firma la autorización, tal como figura en el DNI';
const NOTE_2 = '2 Hay que hacer figurar el carácter en el cual se autoriza al menor: padre/ madre/ tutor/ guardador/ persona que ejerce la tenencia judicial del menor';
const NOTE_3 = '3 Nombre y apellido del menor, tal como figura en el DNI';
const NOTE_4_AVAL = '4 El/la Jefe de Grupo o Jefe/a de Unidad';
const AVAL = `Certifico que el/la Menor registrado/a en la categoría de Beneficiario, posee el Legajo Personal completo según el capitulo 4, del Manual General de Normas de SAAC y que la persona que está otorgando autorización tiene su firma registrada en la “${I0}AUTORIZACIÓN DE INGRESO DE NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS${I1}”.-`;
const FILL = ' -------------------------';

const CAMP_WORD: Record<string, [string, string]> = { campamento: ['el', 'CAMPAMENTO'], acantonamiento: ['el', 'ACANTONAMIENTO'], salida: ['la', 'SALIDA'] };

/** Arma el texto de la planilla con los datos completos (lo que falte queda con puntos para completar a mano). */
export function buildAuthorizationText(c: AuthorizationContent): AuthorizationText {
  const d = parts(c.date);
  const where = `En la localidad de ${V(c.place.locality, 30)}, partido / departamento de ${orDashes(c.place.department, !!d)} de la provincia de ${orDashes(c.place.province, !!d)}, a los ${V(d?.d, 6)} días del mes de ${V(d?.m, 20)} del año ${V(d?.y, 8)}`;
  const signer = `yo (1) ${V(c.signer.name, 50)} de nacionalidad ${V(c.signer.nationality, 26)}, nacido/a el ${longDate(c.signer.birthDate)} DNI ${V(dniDots(c.signer.dni), 20)} Teléfono: ${V(c.signer.phone, 24)}, y con domicilio en ${V(c.signer.address, 70)} en mi carácter de (2) ${V(c.signer.role, 40)}`;
  const minor = `${V(c.minor.name, 50)}, de nacionalidad ${V(c.minor.nationality, 26)}, nacido/a el ${longDate(c.minor.birthDate)} y DNI ${V(dniDots(c.minor.dni), 20)}, con domicilio en ${V(c.minor.address, 70)}`;
  const group = `Grupo Scout N° ${V(c.group.number, 8)} Nombre ${V(c.group.name, 30)} del Distrito N° ${V(c.group.district, 6)} de la Zona N° ${V(c.group.zone, 6)} de Scouts de Argentina Asociación Civil`;
  const base = { official: AUTH_KIND_OFFICIAL[c.kind], version: AUTH_KIND_OFFICIAL[c.kind] ? AUTH_TEMPLATE_VERSION : AUTH_GROUP_TEMPLATE_VERSION };

  if (c.kind === 'ingreso') {
    return {
      ...base,
      header: ['Autorización de Ingreso de', 'Niños, Niñas y Jóvenes Menores de 18 Años'],
      title: ['AUTORIZACIÓN DE INGRESO DE', 'NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS'],
      paragraphs: [
        { kind: 'lead', text: `${where}, ${signer.replace('yo (1)', 'YO (1)')} OTORGO AUTORIZACIÓN para que EL MENOR (3) ${minor}, para que participe de las actividades scouts desarrolladas por los dirigentes pertenecientes al ${group}.` },
        { kind: 'italic', text: 'A la autorización se debe adjuntar fotocopias de la Partida de Nacimiento del Menor y de frente y dorso del DNI, tanto del menor, como del autorizante y de otra documentación legal.' },
      ],
      signatureLabel: 'Firma',
      custody: { text: `Formula aclaraciones sobre la situación de tenencia o guarda del menor (4) ${V(c.custodyNotes, 150)}`, filled: !!c.custodyNotes },
      witnesses: 2,
      footnotes: [
        NOTE_1,
        NOTE_2,
        NOTE_3,
        '4 Aclare lo que corresponda sobre la situación del menor manifestando que se encuentra bajo su guarda provisorio o definitiva, que tiene judicialmente otorgada la tenencia, que es el tutor designado judicialmente y vuelva a firmar.',
        '5 “La autorización de Ingreso debe ser firmada ante al menos dos educadores/as del Grupo Scout, los que firmarán al pie como testigos presenciales de la autorización en cuestión” (Inc. Legajos, Capitulo 2 Manual General de Normas de SAAC)',
      ],
    };
  }

  if (c.kind === 'imagen') {
    return {
      ...base,
      header: ['Autorización Uso de Imagen', 'Niños, Niñas y Jóvenes Menores de edad'],
      title: ['AUTORIZACIÓN USO DE IMAGEN', 'NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS'],
      addressee: ['Sres.', 'SCOUTS DE ARGENTINA ASOCIACION CIVIL', 'Libertad 1282  C.A.B.A.'],
      paragraphs: [
        {
          kind: 'body',
          text: `Por medio de la presente, yo ${V(c.signer.name, 50)} domiciliado/a en (Calle, Ciudad, Provincia) ${V(c.signer.address, 50)} y en mi carácter de ${c.signer.role ? V(c.signer.role) : 'Padre/Madre/ Tutor/Curador'}, autorizo a SCOUTS DE ARGENTINA ASOCIACION CIVIL (“SAAC”), a utilizar de manera amplia, irrestricta y gratuita las imágenes del/la menor ${V(c.minor.name, 40)}, DNI ${V(dniDots(c.minor.dni), 16)}, que sean tomadas en el año ${V(c.year, 8)} en las Actividades Scouts (en adelante, las “Imágenes”), sin limitación temporal alguna y/o geográfica, para su almacenamiento, transmisión, uso, reproducción, comunicación pública, difusión, publicación y/o edición en cualquier tipo de formato, soporte y/o medio de difusión, producto gráfico y/o audiovisual, vinculado directa y/o indirectamente con la promoción, difusión y conocimiento de sus actividades, productos y/u objetivos de SAAC (incluyendo, pero no limitado a medios audiovisuales, redes sociales, internet, medios gráficos impresos, existente y/o a desarrollarse en el futuro. Asimismo, dejo constancia de que he explicado al/a la menor ${V(c.minor.name, 40)} sobre las características y alcance de la presente autorización y que renuncio expresa e irrevocablemente a todo y cualquier tipo de reclamo contra SAAC, sus directores, autoridades y miembros en relación a los derechos autorizados por medio de la presente sobre las Imágenes y/o a percibir cualquier suma en concepto de indemnización o remuneración por los usos autorizados precedentemente indicados, relevando a SAAC de cualquier responsabilidad al respecto.`,
        },
      ],
      signatureLabel: 'Firma Padre/Madre/Tutor/Curador',
      footnotes: [],
    };
  }

  if (c.kind === 'salidas_cercanas') {
    return {
      ...base,
      header: ['Autorización Anual Para Salidas Cercanas'],
      title: ['AUTORIZACIÓN ANUAL PARA SALIDAS CERCANAS'],
      paragraphs: [
        {
          kind: 'lead',
          text: `${where}, ${signer} OTORGO AUTORIZACIÓN PARA QUE EL / LA MENOR (3) ${minor}, para salir de la sede del Grupo Scout N° ${V(c.group.number, 8)} “${V(c.group.name, 30)}” del Distrito N° ${V(c.group.district, 6)}, perteneciente a la Zona N° ${V(c.group.zone, 6)} de Scouts de Argentina Asociación Civil, durante el presente año ${V(c.year, 8)}, cuando las actividades planificadas así lo requieran y bajo el cuidado de los/las Educadores/as Scout del Grupo Scout.${FILL}`,
        },
        { kind: 'body', text: `Dichas actividades podrán ser: juegos por el barrio / localidad, visita a plazas, recolección y/o venta de elementos varios, servicios, actividades religiosas o comunitarias y cualquier otra actividad fuera de la sede del grupo en un rango no mayor a ${V(c.range, 22)}, y siempre y cuando la salida no requiera pernocte. ---------` },
        { kind: 'body', text: `Dejo constancia que tengo conocimiento que para las actividades no abarcadas en esta autorización, los responsables del Organismo me pedirán autorización particular en cada caso, conforme al Manual General de Normas de SAAC, Capitulo 4.${FILL}` },
        { kind: 'body', text: 'Asimismo, doy autorización para que el menor sea transportado por la Asociación desde y hasta el lugar donde se realice la actividad autorizada por el medio de transporte que decida la Institución, comprometiéndome en caso de revocación a hacerlo saber a las autoridades correspondientes y por escrito.-' },
      ],
      signatureLabel: 'Firma',
      aval: AVAL,
      footnotes: [NOTE_1, NOTE_2.replace('del menor', 'del/la menor'), '3 Nombre y apellido completo del/la Menor tal como figura en el DNI', NOTE_4_AVAL],
    };
  }

  if (c.kind === 'retiro_solo' || c.kind === 'retiro_terceros') {
    const sede = `de la sede del Grupo Scout N° ${V(c.group.number, 8)} “${V(c.group.name, 30)}” del Distrito N° ${V(c.group.district, 6)}, perteneciente a la Zona N° ${V(c.group.zone, 6)} de Scouts de Argentina Asociación Civil, y de los lugares donde se realicen las actividades scouts, al finalizar las mismas, durante el presente año ${V(c.year, 8)}`;
    if (c.kind === 'retiro_solo') {
      return {
        ...base,
        header: ['Autorización para Retirarse Solo/a', 'Niños, Niñas y Jóvenes Menores de 18 Años'],
        title: ['AUTORIZACIÓN PARA RETIRARSE SOLO/A', 'DE LAS ACTIVIDADES SCOUTS'],
        paragraphs: [
          { kind: 'lead', text: `${where}, ${signer} AUTORIZO A EL / LA MENOR (3) ${minor}, a retirarse solo/a, sin la compañía de una persona adulta, ${sede}.${FILL}` },
          { kind: 'body', text: `Aclaraciones: ${V(c.details ?? (c.date ? 'ninguna' : ''), 120)}` },
          { kind: 'body', text: 'Dejo constancia de que, una vez que el / la menor se retira, queda bajo mi responsabilidad su traslado, y de que los/las Educadores/as Scout podrán no permitir que se retire solo/a cuando, a su criterio, las circunstancias no lo aconsejen, dándome aviso. Me comprometo, en caso de revocación, a hacerlo saber por escrito a los/las responsables de la Unidad.-' },
        ],
        signatureLabel: 'Firma',
        footnotes: [NOTE_1, NOTE_2, NOTE_3],
      };
    }
    const pickups = c.pickups?.length ? c.pickups : c.date ? [] : [null, null, null];
    return {
      ...base,
      header: ['Autorización de Retiro por Otros Adultos', 'Niños, Niñas y Jóvenes Menores de 18 Años'],
      title: ['AUTORIZACIÓN PARA QUE OTRAS PERSONAS ADULTAS', 'RETIREN AL / A LA MENOR DE LAS ACTIVIDADES SCOUTS'],
      paragraphs: [
        { kind: 'lead', text: `${where}, ${signer} AUTORIZO a las personas adultas que se detallan a continuación a retirar a EL / LA MENOR (3) ${minor}, ${sede}:` },
        ...pickups.map((p, i) => ({
          kind: 'item' as const,
          text: `${i + 1}) ${V(p?.name, 46)}, DNI ${V(dniDots(p?.dni), 20)}, vínculo: ${V(p?.relationship ?? (p ? '—' : ''), 24)}, teléfono: ${V(p?.phone ?? (p ? '—' : ''), 22)}`,
        })),
        { kind: 'body', text: 'Las personas autorizadas deberán acreditar su identidad con su DNI ante los/las Educadores/as Scout. Me comprometo, en caso de revocación o de cualquier cambio en la lista, a hacerlo saber por escrito a los/las responsables de la Unidad.-' },
      ],
      signatureLabel: 'Firma',
      footnotes: [NOTE_1, NOTE_2, NOTE_3],
    };
  }

  const camp = c.camp;
  // La frase de la planilla, con lo que no corresponde tachado
  const which = camp ? (CAMP_WORD[camp.type] ?? CAMP_WORD.salida)[1] : null;
  const opt = (w: string) => (!which ? w : w === which ? V(w) : `${S0}${w}${S1}`);
  const what = `la ${opt('SALIDA')} / ${opt('ACANTONAMIENTO')} / ${opt('CAMPAMENTO')} (tachar lo que no corresponda)`;
  return {
    ...base,
    header: ['Autorización de Padres / Madres / Tutores para', 'Salidas, Acantonamientos y/o Campamentos'],
    title: ['AUTORIZACIÓN DE PADRES / MADRES / TUTORES', 'PARA SALIDAS, ACANTONAMIENTOS Y/O CAMPAMENTOS'],
    paragraphs: [
      {
        kind: 'lead',
        text: `${where}, ${signer} OTORGO AUTORIZACIÓN PARA QUE EL / LA MENOR (3) ${minor}, para que realice ${what} desde el día ${dayDate(camp?.startDate)} Hasta el día ${dayDate(camp?.endDate)}, en el lugar ubicado en ${V(camp?.place, 60)}, acompañado de sus educadores/as pertenecientes al ${group}. ---------------------------------`,
      },
      {
        kind: 'body',
        text: `Asimismo, doy autorización: 1) Para que los/las responsables de las actividades tomen, en caso de accidente o enfermedad todas las medidas necesarias para salvaguardar la integridad y la salud del / la menor. 2) Para realizar cualquier intervención quirúrgica de urgencia que así lo requiera la integridad y la salud del / la menor, 3) Que el menor sea transportado por la Asociación desde y hasta el lugar donde se realice la actividad autorizada por el medio de transporte que decida la Institución, dando conformidad para que se realicen los trámites y gestiones inherentes a cada viaje, ante las autoridades pertinentes y empresas de transporte, comprometiéndome en caso de revocación a hacerlo saber a las autoridades correspondientes y por escrito.${FILL}`,
      },
    ],
    signatureLabel: 'Firma',
    aval: AVAL,
    footnotes: [NOTE_1, NOTE_2, NOTE_3, NOTE_4_AVAL],
  };
}

/** Qué le falta a una autorización firmada para quedar completa. */
export function authorizationPending(kind: AuthKind, witnesses: number, hasAval: boolean): string | null {
  if (AUTH_WITNESSES[kind] > witnesses) {
    const n = AUTH_WITNESSES[kind] - witnesses;
    return n === 1 ? 'Falta la firma de un testigo' : `Faltan las firmas de ${n} testigos`;
  }
  if (AUTH_NEEDS_AVAL[kind] && !hasAval) return 'Falta el aval del Jefe/a de Unidad o de Grupo';
  return null;
}

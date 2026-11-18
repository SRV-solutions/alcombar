/**
 * Autorizaciones de madres, padres y tutores firmadas en pantalla (con el dedo), sobre las planillas oficiales de
 * Scouts de Argentina (versión 07-21). El texto se arma acá, igual en el servidor y en la pantalla: lo que el
 * responsable lee es exactamente lo que queda guardado.
 *
 * Se firma en persona, en el dispositivo de un educador (que queda como quien presenció la firma). Según la planilla:
 *  - Ingreso: se firma ante dos educadores del Grupo, que firman como testigos.
 *  - Salidas cercanas y salidas/acantonamientos/campamentos: llevan el aval del Jefe/a de Grupo o de Unidad.
 *  - Uso de imagen: solo la firma del responsable.
 */
import { z } from 'zod';

export const AUTH_TEMPLATE_VERSION = '07-21';

export const AUTH_KINDS = ['ingreso', 'imagen', 'salidas_cercanas', 'campamento'] as const;
export type AuthKind = (typeof AUTH_KINDS)[number];

export const AUTH_KIND_LABELS: Record<AuthKind, string> = {
  ingreso: 'Autorización de ingreso',
  imagen: 'Autorización de uso de imagen',
  salidas_cercanas: 'Autorización anual para salidas cercanas',
  campamento: 'Autorización para salidas, acantonamientos y campamentos',
};
/** Tipo de documento del legajo que queda presentado al firmar (el de campamento va a la inscripción). */
export const AUTH_KIND_DOCUMENT: Record<AuthKind, string | null> = {
  ingreso: 'aut_ingreso',
  imagen: 'aut_imagen',
  salidas_cercanas: 'aut_salidas',
  campamento: null,
};
/** Las que valen por un año calendario. */
export const AUTH_KIND_ANNUAL: Record<AuthKind, boolean> = { ingreso: false, imagen: true, salidas_cercanas: true, campamento: false };
export const AUTH_NEEDS_AVAL: Record<AuthKind, boolean> = { ingreso: false, imagen: false, salidas_cercanas: true, campamento: true };
export const AUTH_WITNESSES: Record<AuthKind, number> = { ingreso: 2, imagen: 0, salidas_cercanas: 0, campamento: 0 };

export const AUTH_STATUSES = ['firmada', 'completa', 'anulada'] as const;
export type AuthStatus = (typeof AUTH_STATUSES)[number];
export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = { firmada: 'Firmada', completa: 'Completa', anulada: 'Anulada' };

/** Carácter en el que firma (nota 2 de la planilla). */
export const SIGNER_ROLES = ['madre', 'padre', 'tutor/a', 'guardador/a', 'persona que ejerce la tenencia judicial'] as const;

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

export const authorizationSignSchema = z
  .object({
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
    /** Salidas cercanas: "en un rango no mayor a …" */
    range: optTxt(60),
    /** Ingreso: aclaraciones sobre la tenencia o guarda (lleva una segunda firma). */
    custodyNotes: optTxt(500),
    signature: sig,
    custodySignature: sig.nullish(),
    accepted: z.literal(true, { errorMap: () => ({ message: 'Tiene que tildar que leyó y autoriza' }) }),
  })
  .superRefine((d, ctx) => {
    if (d.kind === 'campamento' && !d.campId) ctx.addIssue({ code: 'custom', path: ['campId'], message: 'Falta el campamento o la salida' });
    if (d.kind === 'salidas_cercanas' && !d.range) ctx.addIssue({ code: 'custom', path: ['range'], message: 'Indicá hasta qué distancia (por ejemplo, 5 km)' });
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
  /** Fecha en que se firma (AAAA-MM-DD). */
  date: string;
  year: number;
  place: { locality: string; department: string | null; province: string | null };
  signer: { name: string; nationality: string; birthDate: string; dni: string; phone: string; address: string; role: string };
  minor: { name: string; nationality: string; birthDate: string | null; dni: string | null; address: string };
  group: { number: string; name: string; district: string; zone: string };
  camp?: { name: string; type: string; startDate: string; endDate: string; place: string } | null;
  range?: string | null;
  custodyNotes?: string | null;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const parts = (iso: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? { y: m[1], m: MONTHS[Number(m[2]) - 1], d: String(Number(m[3])) } : null;
};
const longDate = (iso: string | null | undefined) => {
  const p = parts(iso);
  return p ? `${p.d} de ${p.m} de ${p.y}` : '—';
};
const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : '———');
/** DNI con puntos: 12.345.678 */
export const dniDots = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '———';
};

export interface AuthorizationText {
  /** Título del encabezado (junto al logo) y título principal. */
  header: string;
  title: string[];
  /** Carta (uso de imagen): destinatario antes del texto. */
  addressee?: string[];
  paragraphs: string[];
  /** Etiqueta de la firma del responsable. */
  signatureLabel: string;
  /** Ingreso: aclaración de tenencia o guarda, con su segunda firma. */
  custody?: string | null;
  aval?: string | null;
  witnesses?: number;
  footnotes: string[];
}

const NOTE_1 = '1 Nombre y apellido completo de quien firma la autorización, tal como figura en el DNI';
const NOTE_2 = '2 Hay que hacer figurar el carácter en el cual se autoriza al menor: padre/ madre/ tutor/ guardador/ persona que ejerce la tenencia judicial del menor';
const NOTE_3 = '3 Nombre y apellido del menor, tal como figura en el DNI';
const NOTE_4_AVAL = '4 El/la Jefe de Grupo o Jefe/a de Unidad';
const AVAL =
  'Certifico que el/la Menor registrado/a en la categoría de Beneficiario, posee el Legajo Personal completo según el capitulo 4, del Manual General de Normas de SAAC y que la persona que está otorgando autorización tiene su firma registrada en la “AUTORIZACIÓN DE INGRESO DE NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS”.-';

const CAMP_WORD: Record<string, string> = { campamento: 'el CAMPAMENTO', acantonamiento: 'el ACANTONAMIENTO', salida: 'la SALIDA' };

/** Arma el texto de la planilla con los datos completos. */
export function buildAuthorizationText(c: AuthorizationContent): AuthorizationText {
  const d = parts(c.date)!;
  const sb = parts(c.signer.birthDate);
  const mb = parts(c.minor.birthDate);
  const where = `En la localidad de ${dash(c.place.locality)}, partido / departamento de ${dash(c.place.department)} de la provincia de ${dash(c.place.province)}, a los ${d.d} días del mes de ${d.m} del año ${d.y}`;
  const signer = `yo (1) ${c.signer.name} de nacionalidad ${c.signer.nationality}, nacido/a el ${sb ? `${sb.d} de ${sb.m} de ${sb.y}` : '———'} DNI ${dniDots(c.signer.dni)} Teléfono: ${c.signer.phone}, y con domicilio en ${c.signer.address} en mi carácter de (2) ${c.signer.role}`;
  const minor = `${c.minor.name}, de nacionalidad ${c.minor.nationality}, nacido/a el ${mb ? `${mb.d} de ${mb.m} de ${mb.y}` : '———'} y DNI ${dniDots(c.minor.dni)}, con domicilio en ${c.minor.address}`;
  const group = `Grupo Scout N° ${c.group.number} Nombre ${c.group.name} del Distrito N° ${c.group.district} de la Zona N° ${c.group.zone} de Scouts de Argentina Asociación Civil`;

  if (c.kind === 'ingreso') {
    return {
      header: 'Autorización de Ingreso de Niños, Niñas y Jóvenes Menores de 18 Años',
      title: ['AUTORIZACIÓN DE INGRESO DE', 'NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS'],
      paragraphs: [
        `${where}, ${signer} OTORGO AUTORIZACIÓN para que EL MENOR (3) ${minor}, para que participe de las actividades scouts desarrolladas por los dirigentes pertenecientes al ${group}.`,
        'A la autorización se debe adjuntar fotocopias de la Partida de Nacimiento del Menor y de frente y dorso del DNI, tanto del menor, como del autorizante y de otra documentación legal.',
      ],
      signatureLabel: 'Firma',
      custody: c.custodyNotes ?? null,
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
      header: 'Autorización Uso de Imagen Niños, Niñas y Jóvenes Menores de edad',
      title: ['AUTORIZACIÓN USO DE IMAGEN', 'NIÑOS, NIÑAS Y JÓVENES MENORES DE 18 AÑOS'],
      addressee: ['Sres.', 'SCOUTS DE ARGENTINA ASOCIACION CIVIL', 'Libertad 1282 C.A.B.A.'],
      paragraphs: [
        `Por medio de la presente, yo ${c.signer.name} domiciliado/a en (Calle, Ciudad, Provincia) ${c.signer.address} y en mi carácter de ${c.signer.role}, autorizo a SCOUTS DE ARGENTINA ASOCIACION CIVIL (“SAAC”), a utilizar de manera amplia, irrestricta y gratuita las imágenes del/la menor ${c.minor.name}, DNI ${dniDots(c.minor.dni)}, que sean tomadas en el año ${c.year} en las Actividades Scouts (en adelante, las “Imágenes”), sin limitación temporal alguna y/o geográfica, para su almacenamiento, transmisión, uso, reproducción, comunicación pública, difusión, publicación y/o edición en cualquier tipo de formato, soporte y/o medio de difusión, producto gráfico y/o audiovisual, vinculado directa y/o indirectamente con la promoción, difusión y conocimiento de sus actividades, productos y/u objetivos de SAAC (incluyendo, pero no limitado a medios audiovisuales, redes sociales, internet, medios gráficos impresos, existente y/o a desarrollarse en el futuro. Asimismo, dejo constancia de que he explicado al/a la menor ${c.minor.name} sobre las características y alcance de la presente autorización y que renuncio expresa e irrevocablemente a todo y cualquier tipo de reclamo contra SAAC, sus directores, autoridades y miembros en relación a los derechos autorizados por medio de la presente sobre las Imágenes y/o a percibir cualquier suma en concepto de indemnización o remuneración por los usos autorizados precedentemente indicados, relevando a SAAC de cualquier responsabilidad al respecto.`,
      ],
      signatureLabel: 'Firma Padre/Madre/Tutor/Curador',
      footnotes: [],
    };
  }

  if (c.kind === 'salidas_cercanas') {
    return {
      header: 'Autorización Anual Para Salidas Cercanas',
      title: ['AUTORIZACIÓN ANUAL PARA SALIDAS CERCANAS'],
      paragraphs: [
        `${where}, ${signer} OTORGO AUTORIZACIÓN PARA QUE EL / LA MENOR (3) ${minor}, para salir de la sede del Grupo Scout N° ${c.group.number} “${c.group.name}” del Distrito N° ${c.group.district}, perteneciente a la Zona N° ${c.group.zone} de Scouts de Argentina Asociación Civil, durante el presente año ${c.year}, cuando las actividades planificadas así lo requieran y bajo el cuidado de los/las Educadores/as Scout del Grupo Scout.`,
        `Dichas actividades podrán ser: juegos por el barrio / localidad, visita a plazas, recolección y/o venta de elementos varios, servicios, actividades religiosas o comunitarias y cualquier otra actividad fuera de la sede del grupo en un rango no mayor a ${dash(c.range)}, y siempre y cuando la salida no requiera pernocte.`,
        'Dejo constancia que tengo conocimiento que para las actividades no abarcadas en esta autorización, los responsables del Organismo me pedirán autorización particular en cada caso, conforme al Manual General de Normas de SAAC, Capitulo 4.',
        'Asimismo, doy autorización para que el menor sea transportado por la Asociación desde y hasta el lugar donde se realice la actividad autorizada por el medio de transporte que decida la Institución, comprometiéndome en caso de revocación a hacerlo saber a las autoridades correspondientes y por escrito.',
      ],
      signatureLabel: 'Firma',
      aval: AVAL,
      footnotes: [NOTE_1, NOTE_2.replace('del menor', 'del/la menor'), '3 Nombre y apellido completo del/la Menor tal como figura en el DNI', NOTE_4_AVAL],
    };
  }

  const camp = c.camp ?? { name: '', type: 'salida', startDate: c.date, endDate: c.date, place: '' };
  return {
    header: 'Autorización de Padres / Madres / Tutores para Salidas, Acantonamientos y/o Campamentos',
    title: ['AUTORIZACIÓN DE PADRES / MADRES / TUTORES', 'PARA SALIDAS, ACANTONAMIENTOS Y/O CAMPAMENTOS'],
    paragraphs: [
      `${where}, ${signer} OTORGO AUTORIZACIÓN PARA QUE EL / LA MENOR (3) ${minor}, para que realice ${CAMP_WORD[camp.type] ?? 'la SALIDA'} desde el día ${longDate(camp.startDate)} hasta el día ${longDate(camp.endDate)}, en el lugar ubicado en ${dash(camp.place)}, acompañado de sus educadores/as pertenecientes al ${group}.`,
      'Asimismo, doy autorización: 1) Para que los/las responsables de las actividades tomen, en caso de accidente o enfermedad todas las medidas necesarias para salvaguardar la integridad y la salud del / la menor. 2) Para realizar cualquier intervención quirúrgica de urgencia que así lo requiera la integridad y la salud del / la menor, 3) Que el menor sea transportado por la Asociación desde y hasta el lugar donde se realice la actividad autorizada por el medio de transporte que decida la Institución, dando conformidad para que se realicen los trámites y gestiones inherentes a cada viaje, ante las autoridades pertinentes y empresas de transporte, comprometiéndome en caso de revocación a hacerlo saber a las autoridades correspondientes y por escrito.',
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

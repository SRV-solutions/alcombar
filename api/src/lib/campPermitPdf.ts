/**
 * PDF del Permiso de Acampe, con la misma disposición que la planilla de Scouts de Argentina (versión 07-21):
 * mismas tablas, rótulos, tamaños y posiciones (medidos sobre la planilla oficial). Los datos van en letra común,
 * como los completa el Grupo, y se achican o pasan a un segundo renglón si no entran en su casillero.
 * Las firmas y la aprobación de las autoridades quedan en blanco: se firman después.
 */
import PDFDocument from 'pdfkit';
import { BRANCHES, dniDots, type Branch, type SignatureData } from '../shared';
import { asset, base, BLUE, centered, FONT, paragraph, put, rule, saacFooter, signature, when, widthOf, type Doc } from './authorizationPdf';

export interface PermitPdfData {
  group: { number: string; name: string; district: string; zone: string };
  /** Protagonistas inscriptos por rama. */
  branches: Record<Branch, number>;
  beneficiaries: number;
  companions: number | null;
  leaders: number;
  /** Sin inscriptos todavía: las cantidades quedan en blanco para completar a mano. */
  blankCounts: boolean;
  chiefName: string;
  chiefDni: string;
  v: Record<string, string>;
  /** Firma en pantalla del Jefe/a de Campo (solo si sigue valiendo para estos datos). */
  signature?: SignatureData | null;
  /** Constancia de esa firma: va en una hoja aparte, para que la planilla quede igual a la oficial. */
  proof?: { camp: string; name: string; dni: string | null; signedAt: string; onDeviceOf: string | null; reused: boolean; hash: string } | null;
}

const THICK = 0.95;
const THIN = 0.45;
/** Raya horizontal o vertical, como rectángulo relleno (así están hechas las tablas de la planilla). */
const bar = (doc: Doc, x0: number, y0: number, x1: number, y1: number) => doc.rect(x0, y0, x1 - x0, y1 - y0).fill('#000000');
const h = (doc: Doc, x0: number, x1: number, y: number, t = THIN) => bar(doc, x0, y, x1, y + t);
const v = (doc: Doc, x: number, y0: number, y1: number, t = THIN) => bar(doc, x, y0, x + t, y1);

const LABEL = 7.6;
const VALUE = 8;
const MIN = 6;

/** Parte un texto en dos renglones: lo que entra en el primero y el resto. */
function splitAt(doc: Doc, text: string, size: number, width: number): [string, string] {
  const words = text.split(/\s+/);
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (widthOf(doc, next, size) > width) break;
    first = next;
  }
  return [first, words.slice(i).join(' ')];
}
/** Recorta con puntos suspensivos lo que ni así entra. */
function clip(doc: Doc, text: string, size: number, width: number): string {
  if (widthOf(doc, text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && widthOf(doc, `${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/**
 * Escribe un dato en su casillero, sobre la línea de base del rótulo. Si no entra, se achica; y si ni así, sigue en
 * un segundo renglón que arranca en `wrapX` (el borde del casillero, debajo del rótulo).
 */
function value(doc: Doc, text: string | null | undefined, x: number, labelTop: number, right: number, o: { labelSize?: number; wrapX?: number; size?: number } = {}) {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return;
  const baseline = base(labelTop, o.labelSize ?? LABEL);
  const width = right - x;
  const draw = (s: string, sx: number, size: number, bl: number) => doc.font(FONT.r).fontSize(size).fillColor('#000000').text(s, sx, bl, { lineBreak: false, baseline: 'alphabetic' });
  for (let size = o.size ?? VALUE; size >= MIN - 0.001; size -= 0.25) {
    if (widthOf(doc, t, size) <= width) {
      draw(t, x, size, baseline);
      return;
    }
  }
  if (o.wrapX === undefined) {
    draw(clip(doc, t, MIN, width), x, MIN, baseline);
    return;
  }
  // Si entra entero debajo del rótulo, va ahí (se lee mejor que partido)
  if (widthOf(doc, t, 6.5) <= right - o.wrapX) {
    draw(t, o.wrapX, 6.5, baseline + 5.9);
    return;
  }
  // Dos renglones: el primero al lado del rótulo (un poco más arriba) y el segundo debajo, a todo el ancho
  const [first, rest] = splitAt(doc, t, MIN, width);
  if (first) draw(first, x, MIN, baseline - 0.6);
  if (rest || !first) draw(clip(doc, first ? rest : t, MIN, right - o.wrapX), o.wrapX, MIN, baseline + 6.1);
}
/** Dato centrado en una columna. */
function centeredIn(doc: Doc, text: string, x0: number, x1: number, top: number, size = 9) {
  if (!text) return;
  let s = size;
  while (s > MIN && widthOf(doc, text, s) > x1 - x0 - 3) s -= 0.25;
  const t = clip(doc, text, s, x1 - x0 - 3);
  doc.font(FONT.r).fontSize(s).fillColor('#000000').text(t, (x0 + x1) / 2 - widthOf(doc, t, s) / 2, base(top, size), { lineBreak: false, baseline: 'alphabetic' });
}
const label = (doc: Doc, text: string, x: number, top: number, size = LABEL, font = FONT.b) => put(doc, text, x, top, size, font);
/** Rótulo y dato a continuación. Devuelve dónde termina el rótulo. */
function field(doc: Doc, text: string, val: string | null | undefined, x: number, top: number, right: number, o: { size?: number; font?: string; wrapX?: number } = {}) {
  const size = o.size ?? LABEL;
  const font = o.font ?? FONT.b;
  label(doc, text, x, top, size, font);
  const end = x + widthOf(doc, `${text} `, size, font);
  value(doc, val, end + 1, top, right, { labelSize: size, wrapX: o.wrapX });
  return end;
}

/** Día, mes y año entre las barras de «   /   /   Hora:», como en la planilla. */
function dateTime(doc: Doc, x: number, top: number, gaps: [number, number, number], iso: string | null | undefined, time: string | null | undefined) {
  const sp = (n: number) => ' '.repeat(n);
  const text = `${sp(gaps[0])}/${sp(gaps[1])}/${sp(gaps[2])}Hora: `;
  label(doc, text, x, top);
  const w = (s: string) => widthOf(doc, s, LABEL, FONT.b);
  const slash1 = x + w(sp(gaps[0]));
  const slash2 = slash1 + w(`/${sp(gaps[1])}`);
  const end = x + w(text);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  const bl = base(top, LABEL);
  const at = (s: string, sx: number) => doc.font(FONT.r).fontSize(VALUE).fillColor('#000000').text(s, sx, bl, { lineBreak: false, baseline: 'alphabetic' });
  if (m) {
    const day = String(Number(m[3]));
    at(day, slash1 - 10 - widthOf(doc, day, VALUE));
    at(m[2], (slash1 + slash2 + w('/')) / 2 - widthOf(doc, m[2], VALUE) / 2);
    at(m[1], slash2 + w('/') + 4);
  }
  if (time) at(time.replace(/^0(\d:)/, '$1'), end + 4);
}

function permitPage(doc: Doc, d: PermitPdfData) {
  const f = d.v;
  doc.addPage({ size: [595.32, 841.92], margin: 0 });

  // Encabezado
  const logo = asset('scouts-de-argentina.png');
  if (logo) doc.image(logo, 70.9, 45.5, { width: 94.2, height: 79.2 });
  put(doc, 'Autorización para Salidas, Acantonamientos y/o', 191.4, 79.1, 11, FONT.b, BLUE);
  put(doc, 'Campamentos – Permiso de Acampe', 191.4, 91.8, 11, FONT.b, BLUE);
  put(doc, 'Planilla Versión: 07-21', 191.4, 104.3, 9);
  put(doc, 'www.scouts.org.ar', 191.4, 114.6, 9);
  rule(doc, 190.7, 567.2, 130.7);
  put(doc, 'AUTORIZACIÓN PARA SALIDAS, ACANTONAMIENTOS', 135.0, 147.8, 14, FONT.b);
  put(doc, 'Y/O CAMPAMENTOS – PERMISO DE ACAMPE', 165.3, 166.4, 14, FONT.b);

  // ---- Grupo Scout y ramas que acampan ----
  doc.rect(227.2, 197.4, 63.3, 19.9).fill('#d9d9d9');
  h(doc, 63.4, 567.7, 196.5, THICK);
  h(doc, 63.4, 567.7, 266.7, THICK);
  v(doc, 63.4, 196.5, 267.6, THICK);
  v(doc, 566.8, 196.5, 267.6, THICK);
  for (const y of [217.3, 237.4, 252.0]) h(doc, 64.3, 566.8, y);
  for (const x of [226.7, 290.5]) v(doc, x, 197.4, 217.3);
  const cols = [92.1, 226.7, 255.1, 290.5, 347.2, 411.0, 453.6, 517.3];
  for (const x of cols) v(doc, x, 217.8, 252.0);
  for (const x of [194.0, 317.2, 440.5]) v(doc, x, 252.5, 266.7);
  label(doc, 'GRUPO SCOUT', 117.5, 203.3);
  label(doc, 'RAMAS QUE ACAMPARAN (INDICAR CANTIDADES )', 334.5, 203.3);
  label(doc, 'N°', 73.8, 223.5);
  label(doc, 'NOMBRE', 142.8, 223.5);
  label(doc, 'DTO', 233.1, 223.5);
  label(doc, 'ZONA', 262.4, 223.5);
  label(doc, 'CASTORES', 298.1, 223.5);
  label(doc, 'LOBATOS Y', 357.4, 219.1);
  label(doc, 'LOBEZNAS', 358.6, 227.8);
  label(doc, 'SCOUTS', 416.8, 223.5);
  label(doc, 'CAMINANTES', 460.5, 223.5);
  label(doc, 'ROVERS', 526.4, 223.5);
  const edges = [64.3, ...cols, 566.8];
  const row = [d.group.number, d.group.name, d.group.district, d.group.zone, ...BRANCHES.map((b) => (d.blankCounts || !d.branches[b] ? '' : String(d.branches[b])))];
  row.forEach((t, i) => centeredIn(doc, t, edges[i], edges[i + 1], 239.8));
  const total = d.beneficiaries + (d.companions ?? 0) + d.leaders;
  const counts: [string, number, string][] = [
    ['Beneficiarios: ', 69.3, d.blankCounts ? '' : String(d.beneficiaries)],
    ['Acompañantes: ', 199.5, d.companions ? String(d.companions) : ''],
    ['Dirigentes: ', 322.9, d.blankCounts ? '' : String(d.leaders)],
    ['Total Contingente: ', 446.1, d.blankCounts ? '' : String(total)],
  ];
  const lineEnds = [181.0, 310.1, 433.8, 557.6];
  counts.forEach(([text, x, val], i) => {
    const start = x + widthOf(doc, text, LABEL);
    const end = lineEnds[i] - widthOf(doc, ' ', LABEL);
    // El renglón para completar, hecho con guiones bajos como en la planilla
    const unit = widthOf(doc, '_', LABEL);
    put(doc, text + '_'.repeat(Math.max(1, Math.round((end - start) / unit))), x, 255.5, LABEL);
    centeredIn(doc, val, start, end, 253.0);
  });

  // ---- Empresa de transporte ----
  label(doc, 'DATOS DE LA EMPRESA DE TRANSPORTE:', 70.9, 279.5, 8);
  h(doc, 65.1, 569.2, 290.7, THICK);
  h(doc, 65.1, 569.2, 305.8, THICK);
  v(doc, 65.1, 290.7, 306.8, THICK);
  v(doc, 568.2, 290.7, 306.8, THICK);
  for (const x of [191.1, 316.9, 442.7]) v(doc, x, 291.7, 305.8);
  const tr = { font: FONT.r };
  field(doc, 'Nombre o Razón Social:', f.transportCompany, 70.9, 291.9, 189.5, { ...tr, wrapX: 70.9 });
  field(doc, 'Dirección:', f.transportAddress, 196.7, 291.9, 315.3, { ...tr, wrapX: 196.7 });
  field(doc, 'Teléfono:', f.transportPhone, 322.5, 291.9, 441.1, { ...tr, wrapX: 322.5 });
  field(doc, 'N° de Habilitación:', f.transportLicense, 448.3, 291.9, 566.6, { ...tr, wrapX: 448.3 });

  // ---- Referencias del lugar ----
  label(doc, 'REFERENCIAS DEL LUGAR DE CAMPAMENTO:', 70.9, 316.3, 8);
  h(doc, 65.1, 568.1, 327.5, THICK);
  h(doc, 65.1, 568.1, 476.2, THICK);
  v(doc, 65.1, 327.5, 477.2, THICK);
  v(doc, 567.1, 327.5, 477.2, THICK);
  for (const y of [342.9, 357.8, 372.8, 394.9, 417.1, 439.1, 461.3]) h(doc, 66.0, 567.1, y);
  v(doc, 316.3, 328.5, 461.3);
  const LX = 70.9;
  const RX = 321.9;
  const LR = 314.5;
  const RR = 565.3;
  field(doc, 'Localidad:', f.placeLocality, LX, 328.7, LR);
  field(doc, 'Provincia:', f.placeProvince, RX, 328.7, RR);
  field(doc, 'Dirección:', f.placeAddress, LX, 343.6, LR);
  field(doc, 'Propietario:', f.placeOwner, RX, 343.6, RR);
  field(doc, 'Teléfono / Correo Electrónico:', f.placeContact, LX, 358.5, LR);
  field(doc, 'Población más cercana:', f.placeNearestTown, RX, 358.5, RR);
  field(doc, 'Unidad Sanitaria más cercana:', f.healthName, LX, 373.5, LR);
  field(doc, 'Dirección:', f.healthAddress, LX, 382.1, LR);
  field(doc, 'Teléfono:', f.healthPhone, RX, 373.5, RR);
  field(doc, 'Destacamento Policial:', f.policeName, LX, 395.6, LR);
  field(doc, 'Dirección:', f.policeAddress, LX, 404.2, LR);
  field(doc, 'Teléfono:', f.policePhone, RX, 395.6, RR);
  field(doc, 'Teléfono celular en el campamento:', f.campPhone, LX, 417.8, LR);
  // Vehículo de apoyo y patente, marca y modelo: dos rótulos por renglón
  const plateX = 520.4 - widthOf(doc, 'Patente: ', LABEL, FONT.b);
  const modelX = 518.7 - widthOf(doc, 'Modelo: ', LABEL, FONT.b);
  field(doc, 'Vehículo de apoyo:', f.vehicle, RX, 417.8, plateX - 3);
  field(doc, 'Patente:', f.vehiclePlate, plateX, 417.8, RR);
  field(doc, 'Marca:', f.vehicleBrand, RX, 426.4, modelX - 3);
  field(doc, 'Modelo:', f.vehicleModel, modelX, 426.4, RR);
  label(doc, 'Fecha y hora de salida al campamento:', LX, 439.9);
  dateTime(doc, LX, 448.5, [19, 18, 20], f.departureDate, f.departureTime);
  label(doc, 'Fecha y hora de llegada al campamento:', RX, 439.9);
  dateTime(doc, RX, 448.5, [19, 18, 22], f.arrivalDate, f.arrivalTime);
  field(doc, 'Como llegar al lugar u otros datos de interés:', f.directions, LX, 462.1, RR, { wrapX: LX });

  // ---- Jefe/a de Campo ----
  label(doc, 'JEFE/A DE CAMPO:', 70.9, 486.7, 8);
  h(doc, 65.1, 567.7, 497.9, THICK);
  h(doc, 65.1, 567.7, 527.8, THICK);
  v(doc, 65.1, 497.9, 528.8, THICK);
  v(doc, 566.8, 497.9, 528.8, THICK);
  h(doc, 66.0, 566.8, 513.1);
  for (const x of [327.0, 449.6]) v(doc, x, 498.9, 513.1);
  for (const x of [192.5, 327.0]) v(doc, x, 513.5, 527.8);
  field(doc, 'Nombre y apellido:', d.chiefName, 70.9, 499.1, 325.2);
  field(doc, 'Mail:', f.chiefEmail, 332.6, 499.1, 447.8);
  field(doc, 'Teléfono:', f.chiefPhone, 455.3, 499.1, 565.0);
  field(doc, 'DNI:', d.chiefDni, 70.9, 513.8, 190.7);
  field(doc, 'Nivel de formación:', f.chiefLevel, 198.2, 513.8, 325.2);
  label(doc, 'Firma y aclaración:', 332.6, 513.8);
  signature(doc, d.signature, { x: 405, y: 514.2, w: 54, h: 11.4 });
  // La aclaración a la derecha: queda lugar para firmar a mano
  if (d.chiefName) {
    const t = clip(doc, d.chiefName, 6.7, 565 - 462);
    doc.font(FONT.r).fontSize(6.7).fillColor('#000000').text(t, 462, 523.3, { lineBreak: false, baseline: 'alphabetic' });
  }

  // ---- Director/a de Zona del lugar ----
  label(doc, 'DATOS DEL DIRECTOR DE ZONA DEL LUGAR DE CAMPAMENTO:', 70.9, 538.2, 8);
  h(doc, 65.1, 568.1, 551.7, THICK);
  h(doc, 65.1, 568.1, 600.1, THICK);
  v(doc, 65.1, 551.7, 601.1, THICK);
  v(doc, 567.1, 551.7, 601.1, THICK);
  for (const y of [568.2, 584.1]) h(doc, 66.0, 567.1, y);
  v(doc, 399.9, 552.7, 584.1);
  v(doc, 232.6, 568.7, 584.1);
  const z = { size: 8 };
  field(doc, 'Nombre y Apellido:', f.zoneDirectorName, 70.9, 553.0, 398.0, z);
  field(doc, 'Zona:', f.zoneDirectorZone, 405.5, 553.0, 565.3, z);
  field(doc, 'Teléfono particular:', f.zoneDirectorPhone, 70.9, 568.9, 230.8, z);
  field(doc, 'Teléfono celular:', f.zoneDirectorMobile, 238.2, 568.9, 398.0, z);
  field(doc, 'Mail:', f.zoneDirectorEmail, 405.5, 568.9, 565.3, z);
  field(doc, 'Fecha y medio de comunicación:', f.zoneDirectorContact, 70.9, 584.9, 565.3, z);

  // ---- Aprobación de las autoridades (se completa y firma a mano) ----
  label(doc, 'APROBACIÓN DE LAS AUTORIDADES DE SUPERVISIÓN:', 70.9, 610.6, 8);
  h(doc, 65.1, 569.2, 621.8, THICK);
  h(doc, 65.1, 569.2, 659.6, THICK);
  h(doc, 65.1, 569.2, 694.7, THICK);
  h(doc, 65.1, 569.2, 709.9, THICK);
  v(doc, 65.1, 621.8, 710.9, THICK);
  v(doc, 316.6, 621.8, 710.9, THICK);
  v(doc, 568.2, 621.8, 710.9, THICK);
  for (const [x, who] of [
    [70.9, 'Jefe/a de grupo:'],
    [322.5, 'Director/a de distrito:'],
  ] as const) {
    const dx = x - 70.9 + (x > 300 ? -0.1 : 0);
    label(doc, 'Autoriza:', 171.9 + dx, 631.2, 8);
    label(doc, 'No autoriza:', 294.4 + dx - widthOf(doc, 'No autoriza:', 8, FONT.b), 631.2, 8);
    for (const sx of [211.0, 299.3]) doc.save().lineWidth(0.7).strokeColor('#000000').rect(sx + dx, 630.3, 11, 10.4).stroke().restore();
    label(doc, 'Fecha:', x, 648.3, 8);
    label(doc, 'Firma y', x, 664.1, 8);
    label(doc, 'Aclaración', x, 673.3, 8);
    label(doc, who, x, 682.5, 8);
    label(doc, 'DNI:', x, 698.4, 8);
  }
  put(doc, '(En caso de NO autorizar se debe detallar los motivos de dicha medida al dorso del presente formulario)', 70.9, 722.6, 10, FONT.i);

  saacFooter(doc);
}

/** Hoja aparte: quién firmó el permiso en pantalla, cuándo y su código de verificación. */
function proofPage(doc: Doc, d: PermitPdfData) {
  const p = d.proof;
  if (!p || !d.signature) return;
  doc.addPage({ size: [595.32, 841.92], margin: 0 });
  centered(doc, 'CONSTANCIA DE FIRMA EN PANTALLA', 56, 13);
  let y = paragraph(
    doc,
    'El Permiso de Acampe que antecede fue firmado por el Jefe o la Jefa de Campo con trazo manuscrito sobre la pantalla. El sistema ALCONBAR Gestión guarda el trazo de la firma, la fecha y la hora, y un código de verificación que deja de coincidir si se modifican los datos del permiso: en ese caso la firma deja de salir y hay que volver a firmar.',
    84,
    { size: 9, pitch: 11.5, justify: true, draw: true },
  );
  y += 24;
  const how = p.reused
    ? 'con su firma ya registrada en el sistema, aplicada desde su propio usuario'
    : p.onDeviceOf
      ? `en persona, en el dispositivo de ${p.onDeviceOf}`
      : 'desde su propio usuario';
  const lines = [
    `Permiso de Acampe · ${p.camp}`,
    `Firmó: ${p.name}${p.dni ? ` (DNI ${dniDots(p.dni)})` : ''}, Jefe/a de Campo, el ${when(p.signedAt)}`,
    `Cómo: ${how}`,
    `Código de verificación: ${p.hash.slice(0, 16).toUpperCase()}`,
  ];
  lines.forEach((l, i) => {
    y = paragraph(doc, i === 0 ? `\u0001${l}\u0002` : l, y, { size: 9, pitch: 11.5, justify: false, draw: true }) + 11.5;
  });
  rule(doc, 70.9, 561.3, y + 1);
}

/** El Permiso de Acampe en PDF (una hoja; si está firmado en pantalla, una segunda con la constancia). */
export function campPermitPdf(data: PermitPdfData, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: title, Author: 'ALCONBAR Gestión', Creator: 'ALCONBAR Gestión' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      permitPage(doc, data);
      proofPage(doc, data);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

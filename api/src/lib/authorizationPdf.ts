/**
 * PDF de las autorizaciones, con la misma disposición que las planillas de Scouts de Argentina (versión 07-21):
 * mismas medidas de hoja, márgenes, tamaños de letra, encabezado con el logo, notas al pie y pie institucional
 * (medidos sobre los PDF oficiales). Los datos completados van en negrita y las firmas se dibujan con su trazo.
 * Sirve para una autorización firmada o para una planilla precargada para firmar en papel (lo que falte queda
 * con puntos).
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { dniDots, splitMarked, type AuthorizationContent, type AuthorizationText, type SignatureData } from '../shared';

type Doc = InstanceType<typeof PDFDocument>;

export interface PdfAdultSignature {
  name: string;
  dni: string | null;
  function?: string | null;
  signature: SignatureData;
  signedAt: string;
}
export interface PdfAuthorization {
  content: AuthorizationContent;
  text: AuthorizationText;
  signature?: SignatureData | null;
  custodySignature?: SignatureData | null;
  witnesses?: PdfAdultSignature[];
  aval?: PdfAdultSignature | null;
  /** Constancia de la firma en pantalla (solo si está firmada). */
  proof?: { signedAt: string; attendedBy: { name: string; dni: string | null }; hash: string } | null;
  voided?: { at: string | null; reason: string | null } | null;
}

// Medidas de la planilla oficial, en puntos (hoja A4: 595,32 × 841,92)
const L = 70.9;
const R = 561.3;
const W = R - L;
const CENTER = (L + R) / 2;
const FONT = { r: 'Helvetica', b: 'Helvetica-Bold', i: 'Helvetica-Oblique', bi: 'Helvetica-BoldOblique' };
const BLUE = '#00aaf2';
const INK = '#0b1f4a';
/** De "borde superior del renglón" (como se midió) a línea de base. */
const base = (top: number, size: number) => top + 0.905 * size;

function asset(name: string): string | null {
  for (const dir of [path.resolve(process.cwd(), 'assets/saac'), path.resolve(__dirname, '../assets/saac'), path.resolve(__dirname, '../../assets/saac')]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function put(doc: Doc, text: string, x: number, top: number, size: number, font = FONT.r, color = '#000000') {
  doc.font(font).fontSize(size).fillColor(color).text(text, x, base(top, size), { lineBreak: false, baseline: 'alphabetic' });
}
const widthOf = (doc: Doc, text: string, size: number, font = FONT.r) => doc.font(font).fontSize(size).widthOfString(text);
function centered(doc: Doc, text: string, top: number, size: number, font = FONT.b, color = '#000000') {
  put(doc, text, CENTER - widthOf(doc, text, size, font) / 2, top, size, font, color);
}
/** Título centrado que termina en una llamada a nota, "(4)": el número va chico y elevado. */
function centeredCall(doc: Doc, text: string, n: string, top: number, size: number) {
  const head = `${text} (`;
  const total = widthOf(doc, head, size, FONT.b) + widthOf(doc, n, size * 0.65, FONT.b) + widthOf(doc, ')', size, FONT.b);
  let x = CENTER - total / 2;
  put(doc, head, x, top, size, FONT.b);
  x += widthOf(doc, head, size, FONT.b);
  doc.font(FONT.b).fontSize(size * 0.65).fillColor('#000000').text(n, x, base(top, size) - size * 0.36, { lineBreak: false, baseline: 'alphabetic' });
  x += widthOf(doc, n, size * 0.65, FONT.b);
  put(doc, ')', x, top, size, FONT.b);
}
function rule(doc: Doc, x1: number, x2: number, y: number, dotted = false) {
  doc.save().lineWidth(0.5).strokeColor('#000000');
  if (dotted) doc.dash(0.7, { space: 1.6 });
  doc.moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

// ---------------- Párrafos con datos en negrita ----------------
interface Piece {
  text: string;
  font: string;
  width: number;
  /** Llamada a una nota: número chico y elevado. */
  sup?: boolean;
  strike?: boolean;
}
const SUP = 0.65;
type Word = Piece[];
const FILLER = /^[.\-_…]{4,}[,.:]?$/;

/** Parte el texto marcado en palabras; una palabra puede tener tramos con distinta letra (comillas + dato en negrita). */
function words(doc: Doc, marked: string, size: number, italic: boolean): Word[] {
  const out: Word[] = [];
  let cur: Word = [];
  for (const seg of splitMarked(marked)) {
    const font = seg.italic ? FONT.bi : seg.bold ? FONT.b : italic ? FONT.i : FONT.r;
    for (const tok of seg.text.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        if (cur.length) out.push(cur);
        cur = [];
        continue;
      }
      // Llamada a una nota, "(1)": el número va chico y elevado, como en la planilla
      const call = !seg.bold && /^\((\d)\)([,.;:]?)$/.exec(tok);
      if (call) {
        cur.push({ text: '(', font, width: widthOf(doc, '(', size, font) });
        cur.push({ text: call[1], font, width: widthOf(doc, call[1], size * SUP, font), sup: true });
        cur.push({ text: `)${call[2]}`, font, width: widthOf(doc, `)${call[2]}`, size, font) });
      } else cur.push({ text: tok, font, width: widthOf(doc, tok, size, font), strike: seg.strike });
    }
  }
  if (cur.length) out.push(cur);
  return out;
}
const wordWidth = (w: Word) => w.reduce((s, p) => s + p.width, 0);

/**
 * Dibuja un párrafo desde `top` y devuelve el borde superior de su último renglón.
 * Los rellenos de puntos o guiones se cortan al final del renglón y siguen en el siguiente, como en la planilla.
 */
function paragraph(doc: Doc, marked: string, top: number, o: { size: number; pitch: number; justify?: boolean; italic?: boolean; x?: number; width?: number; indent?: number; draw: boolean }): number {
  const x0 = o.x ?? L;
  const width = o.width ?? W;
  const space = widthOf(doc, ' ', o.size);
  const queue = words(doc, marked, o.size, !!o.italic);
  const lines: Word[][] = [];
  let line: Word[] = [];
  // El primer renglón puede empezar corrido (deja lugar al número de la nota)
  let used = o.indent ?? 0;
  while (queue.length) {
    const w = queue.shift()!;
    const ww = wordWidth(w);
    const need = used + (line.length ? space : 0) + ww;
    if (need <= width + 0.01) {
      line.push(w);
      used = need;
      continue;
    }
    // Relleno que no entra: se parte y el resto sigue en el renglón de abajo
    if (w.length === 1 && FILLER.test(w[0].text)) {
      const p = w[0];
      const room = width - used - (line.length ? space : 0);
      const per = p.width / p.text.length;
      const n = Math.floor(room / per);
      if (n >= 3 && n < p.text.length) {
        const head = p.text.slice(0, n);
        const tail = p.text.slice(n);
        line.push([{ text: head, font: p.font, width: widthOf(doc, head, o.size, p.font) }]);
        // Una cola de pocos caracteres no pasa sola al renglón siguiente
        if (tail.replace(/[,.:]$/, '').length >= 8) queue.unshift([{ text: tail, font: p.font, width: widthOf(doc, tail, o.size, p.font) }]);
        lines.push(line);
        line = [];
        used = 0;
        continue;
      }
    }
    if (line.length) {
      lines.push(line);
      line = [];
      used = 0;
      queue.unshift(w);
    } else {
      // Una palabra más ancha que el renglón: va sola
      lines.push([w]);
    }
  }
  if (line.length) lines.push(line);

  let y = top;
  lines.forEach((ln, i) => {
    if (o.draw) {
      const total = ln.reduce((s, w) => s + wordWidth(w), 0);
      const last = i === lines.length - 1;
      const ind = i === 0 ? o.indent ?? 0 : 0;
      const gap = o.justify && !last && ln.length > 1 ? (width - ind - total) / (ln.length - 1) : space;
      let x = x0 + ind;
      for (const w of ln) {
        for (const p of w) {
          if (p.sup) doc.font(p.font).fontSize(o.size * SUP).fillColor('#000000').text(p.text, x, base(y, o.size) - o.size * 0.36, { lineBreak: false, baseline: 'alphabetic' });
          else put(doc, p.text, x, y, o.size, p.font);
          if (p.strike) {
            const sy = base(y, o.size) - o.size * 0.3;
            doc.save().lineWidth(0.7).strokeColor('#000000').moveTo(x - 0.5, sy).lineTo(x + p.width + 0.5, sy).stroke().restore();
          }
          x += p.width;
        }
        x += gap;
      }
    }
    if (i < lines.length - 1) y += o.pitch;
  });
  return lines.length ? y : top - o.pitch;
}

// ---------------- Firmas ----------------
/** Dibuja el trazo de una firma dentro de un recuadro, apoyada sobre el renglón. */
function signature(doc: Doc, s: SignatureData | null | undefined, box: { x: number; y: number; w: number; h: number }) {
  if (!s?.strokes?.length) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const st of s.strokes)
    for (let i = 0; i + 2 < st.length; i += 3) {
      minX = Math.min(minX, st[i]);
      maxX = Math.max(maxX, st[i]);
      minY = Math.min(minY, st[i + 1]);
      maxY = Math.max(maxY, st[i + 1]);
    }
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  // Entra en el recuadro sin agrandarse de más (una firma chica no se infla)
  const k = Math.min(box.w / bw, box.h / bh, (box.w / s.w) * 2.2);
  const ox = box.x + (box.w - bw * k) / 2 - minX * k;
  const oy = box.y + (box.h - bh * k) - minY * k;
  doc.save().lineWidth(0.9).lineCap('round').lineJoin('round').strokeColor(INK);
  for (const st of s.strokes) {
    const pts: [number, number][] = [];
    for (let i = 0; i + 2 < st.length; i += 3) pts.push([ox + st[i] * k, oy + st[i + 1] * k]);
    if (!pts.length) continue;
    doc.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) doc.lineTo(pts[0][0] + 0.3, pts[0][1] + 0.3);
    for (let i = 1; i < pts.length - 1; i++) doc.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    if (pts.length > 1) doc.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    doc.stroke();
  }
  doc.restore();
}

/** "Etiqueta: ________" con el valor en negrita sobre el renglón. Devuelve dónde empieza el renglón. */
function field(doc: Doc, label: string, value: string | null | undefined, x: number, top: number, size: number, lineTo: number, dotted = false): number {
  put(doc, `${label}:`, x, top, size);
  const start = x + widthOf(doc, `${label}: `, size);
  rule(doc, start, lineTo, base(top, size) + 1.5, dotted);
  if (value) put(doc, value, start + 2, top, size, FONT.b);
  return start;
}

const when = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  // Hora de Argentina (UTC−3), sin depender del servidor
  const a = new Date(d.getTime() - 3 * 3600_000);
  return `${p(a.getUTCDate())}/${p(a.getUTCMonth() + 1)}/${a.getUTCFullYear()} ${p(a.getUTCHours())}:${p(a.getUTCMinutes())}`;
};

// ---------------- La hoja ----------------
function page(doc: Doc, a: PdfAuthorization) {
  const t = a.text;
  const kind = a.content.kind;
  doc.addPage({ size: [595.32, 841.92], margin: 0 });

  // Encabezado: logo, título en celeste, versión y sitio
  const logo = asset('scouts-de-argentina.png');
  if (logo) doc.image(logo, 70.9, 45.5, { width: 94.2, height: 79.2 });
  const headTops = t.header.length > 1 ? [79.1, 91.8] : [91.8];
  t.header.slice(0, 2).forEach((h, i) => put(doc, h, 191.4, headTops[i], 11, FONT.b, BLUE));
  put(doc, t.official ? `Planilla Versión: ${t.version}` : `Planilla del Grupo Scout · Versión: ${t.version}`, 191.4, 104.3, 9);
  put(doc, 'www.scouts.org.ar', 191.4, 112.8, 9);
  rule(doc, 190.7, 586.2, 130.7);

  // Título
  t.title.slice(0, 2).forEach((line, i) => centered(doc, line, 147.8 + i * 16, 14));
  let top = t.title.length > 1 ? 192.0 : 178.3;

  if (kind === 'imagen') {
    // Carta: destinatario, texto a 11 pt y firma con aclaración y DNI
    (t.addressee ?? []).forEach((l, i) => put(doc, l, L, top + i * 12.6, 11));
    top = paragraph(doc, t.paragraphs[0].text, 254.5, { size: 11, pitch: 12.65, justify: true, draw: true });
    const f = top + 73.9;
    const start = field(doc, t.signatureLabel, null, L, f, 11, 491.3);
    signature(doc, a.signature, { x: start + 6, y: f - 34, w: 190, h: 44 });
    field(doc, 'Aclaración', a.signature ? a.content.signer.name : null, L, f + 25.4, 11, 486.5);
    field(doc, 'D.N.I', a.signature ? dniDots(a.content.signer.dni) : null, L, f + 50.7, 11, 246);
    top = f + 50.7;
  } else {
    // Texto: el párrafo de los datos con los renglones más separados, el resto más apretado
    let prev: string | null = null;
    for (const p of t.paragraphs) {
      const pitch = p.kind === 'lead' || p.kind === 'item' ? 13.2 : 11.5;
      // Separación con el párrafo anterior, como en la planilla
      const gap = prev === null ? 0 : p.kind === 'italic' ? 24.7 : prev === 'lead' || prev === 'item' || p.kind === 'item' ? 13.2 : 11.5;
      top = paragraph(doc, p.text, top + gap, { size: 10, pitch, justify: p.kind !== 'item', italic: p.kind === 'italic', draw: true });
      prev = p.kind;
    }

    // Firma del responsable
    const f = top + (kind === 'ingreso' ? 39 : 50);
    put(doc, `${t.signatureLabel}:`, 227.2, f, 10);
    rule(doc, 262, 405, base(f, 10) + 1.5, true);
    signature(doc, a.signature, { x: 264, y: f - 30, w: 139, h: 40 });
    top = f;

    if (t.witnesses) {
      // Ingreso: aclaración de tenencia (con segunda firma) y dos testigos
      const c = paragraph(doc, t.custody?.text ?? '', top + 26.6, { size: 10, pitch: 13.2, justify: false, draw: true });
      const f2 = c + 38.4;
      put(doc, 'Firma:', 227.2, f2, 10);
      rule(doc, 262, 405, base(f2, 10) + 1.5, true);
      signature(doc, a.custodySignature, { x: 264, y: f2 - 28, w: 139, h: 38 });
      rule(doc, 69.5, 560, f2 + 25.7);
      centeredCall(doc, 'TESTIGOS', '5', f2 + 37.7, 10);
      const wt = f2 + 86.3;
      [70.9, 318.2].forEach((x, i) => {
        const w = a.witnesses?.[i];
        const start = field(doc, 'Firma', null, x, wt, 10, x + 237, true);
        signature(doc, w?.signature, { x: start + 4, y: wt - 34, w: 150, h: 44 });
        field(doc, 'Aclaración', w?.name, x, wt + 17.2, 10, x + 237, true);
        field(doc, 'DNI', w ? dniDots(w.dni) : null, x, wt + 34.5, 10, x + 237, true);
      });
      top = wt + 34.5;
    }

    if (t.aval) {
      // Aval del Jefe/a de Unidad o de Grupo
      rule(doc, 69.5, 560, top + 24);
      centeredCall(doc, 'AVAL DE LOS RESPONSABLES SCOUTS', '4', top + 36, 10);
      const end = paragraph(doc, t.aval, top + 59.2, { size: 10, pitch: 11.5, justify: false, width: 480, draw: true });
      const b = end + 23;
      const start = field(doc, 'Firma', null, 148.9, b, 10, 360.9);
      signature(doc, a.aval?.signature, { x: start + 4, y: b - 10, w: 170, h: 21 });
      field(doc, 'Aclaración', a.aval?.name, 148.9, b + 11.4, 10, 359.8);
      field(doc, 'DNI', a.aval ? dniDots(a.aval.dni) : null, 148.9, b + 22.9, 10, 363.7);
      field(doc, 'Función en el Grupo Scout', a.aval?.function, 148.9, b + 34.5, 10, 432);
      top = b + 34.5;
    }
  }

  // Notas al pie: abajo, sobre el pie institucional (como en la planilla)
  const NOTE = { size: 9, pitch: 10.3 };
  let notesHeight = 0;
  for (const n of t.footnotes) notesHeight += paragraph(doc, n.replace(/^\d+\s/, ''), 0, { ...NOTE, indent: 6.5, draw: false }) + NOTE.pitch;
  const notesBottom = 750;
  let ny = Math.max(notesBottom - notesHeight, top + 34);
  if (t.footnotes.length) {
    rule(doc, 70.9, 215, ny - 16.5);
    for (const n of t.footnotes) {
      // El número, chico y elevado
      const m = /^(\d+)\s(.*)$/s.exec(n);
      if (m) {
        doc.font(FONT.r).fontSize(6).fillColor('#000000').text(m[1], L, base(ny, 9) - 3, { lineBreak: false, baseline: 'alphabetic' });
        ny = paragraph(doc, m[2], ny, { ...NOTE, indent: 6.5, draw: true }) + NOTE.pitch;
      } else ny = paragraph(doc, n, ny, { ...NOTE, draw: true }) + NOTE.pitch;
    }
  }

  // Pie institucional
  const wosm = asset('wosm-pie.png');
  if (wosm) doc.image(wosm, 70.8, 770.9, { width: 155, height: 70.9 });
  rule(doc, 229.7, 558.6, 777.8);
  const it = 'Scouts de Argentina Asociación Civil';
  put(doc, it, 229.7, 781.2, 8, FONT.i);
  put(doc, ', es una organización sin fines de lucro, con Personería', 229.7 + widthOf(doc, it, 8, FONT.i), 781.2, 8);
  put(doc, 'Jurídica Nacional N° 1645416 – Res IGJ N° 999 del 24 de septiembre de 1998.', 229.7, 790.4, 8);
  put(doc, 'Sede Nacional: ', 229.7, 799.6, 8);
  const sn = widthOf(doc, 'Sede Nacional: ', 8);
  put(doc, 'Libertad 1282', 229.7 + sn, 799.6, 8, FONT.i);
  put(doc, ' – CABA – C1012AAZ – Argentina – Tel: +54-11-4811-0185', 229.7 + sn + widthOf(doc, 'Libertad 1282', 8, FONT.i), 799.6, 8);
  put(doc, 'CUIT 30-69732250-3 – IVA Exento', 229.7, 808.7, 8);

  if (a.voided) {
    doc.save().rotate(-28, { origin: [297, 420] }).font(FONT.b).fontSize(84).fillColor('#b00020').fillOpacity(0.16);
    doc.text('ANULADA', 297 - doc.widthOfString('ANULADA') / 2, 380, { lineBreak: false });
    doc.restore();
  }
}

/**
 * Hoja de constancia, al final: quién firmó cada autorización en pantalla, cuándo, ante quién, y su código de
 * verificación. Va aparte para que cada planilla quede igual a la de Scouts de Argentina.
 */
function proofPages(doc: Doc, items: PdfAuthorization[]) {
  const signed = items.filter((a) => a.proof);
  if (!signed.length) return;
  let y = 0;
  const newPage = () => {
    doc.addPage({ size: [595.32, 841.92], margin: 0 });
    centered(doc, 'CONSTANCIA DE FIRMA EN PANTALLA', 56, 13);
    y = paragraph(
      doc,
      'Las autorizaciones que siguen fueron firmadas por la madre, el padre o el tutor con trazo manuscrito sobre la pantalla, en persona, en el dispositivo de un educador o educadora del Grupo Scout que presenció la firma. El sistema ALCOMBAR Gestión guarda el trazo de cada firma, la fecha y la hora, y un código de verificación que deja de coincidir si se modifica el texto o los datos.',
      84,
      { size: 9, pitch: 11.5, justify: true, draw: true },
    );
    y += 24;
  };
  newPage();
  for (const a of signed) {
    const p = a.proof!;
    const lines = [
      `${a.text.title.join(' ')}`,
      `Protagonista: ${a.content.minor.name}${a.content.minor.dni ? ` (DNI ${dniDots(a.content.minor.dni)})` : ''}`,
      `Firmó: ${a.content.signer.name} (DNI ${dniDots(a.content.signer.dni)}), en carácter de ${a.content.signer.role}, el ${when(p.signedAt)}`,
      `Ante: ${p.attendedBy.name}${p.attendedBy.dni ? ` (DNI ${dniDots(p.attendedBy.dni)})` : ''}`,
      ...(a.witnesses?.length ? [`Testigos: ${a.witnesses.map((w) => `${w.name} (DNI ${dniDots(w.dni)}, ${when(w.signedAt)})`).join('; ')}`] : []),
      ...(a.aval ? [`Aval: ${a.aval.name} (DNI ${dniDots(a.aval.dni)}${a.aval.function ? `, ${a.aval.function}` : ''}, ${when(a.aval.signedAt)})`] : []),
      `Código de verificación: ${p.hash.slice(0, 16).toUpperCase()}`,
      ...(a.voided ? [`ANULADA${a.voided.at ? ` el ${when(a.voided.at)}` : ''}${a.voided.reason ? `: ${a.voided.reason}` : ''}`] : []),
    ];
    if (y + lines.length * 11.5 + 14 > 790) newPage();
    lines.forEach((l, i) => {
      y = paragraph(doc, i === 0 ? `\u0001${l}\u0002` : l, y, { size: 9, pitch: 11.5, justify: false, draw: true }) + 11.5;
    });
    rule(doc, L, R, y + 1);
    y += 12;
  }
}

/** Un PDF con una hoja por autorización. */
export function authorizationsPdf(items: PdfAuthorization[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: title, Author: 'ALCOMBAR Gestión', Creator: 'ALCOMBAR Gestión' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      for (const a of items) page(doc, a);
      proofPages(doc, items);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

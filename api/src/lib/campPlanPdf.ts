/**
 * PDF del plan de un campamento, como el documento que arma la unidad para presentar: objetivos, lugar, costo,
 * el programa de cada día (horario, actividad, responsable, materiales, comentarios), la lista de materiales y la
 * nómina de adultos y protagonistas.
 */
import PDFDocument from 'pdfkit';
import { asset, FONT, type Doc } from './authorizationPdf';

export interface PlanDay {
  /** «Programa sábado 8/8» */
  heading: string;
  /** «8/8/2026 Sábado» */
  bar: string;
  items: { time: string; what: string; who: string; materials: string; notes: string }[];
  notes: string | null;
}
export interface PlanRosterRow {
  dni: string;
  lastName: string;
  firstName: string;
  group: string;
}
export interface PlanPdfData {
  title: string;
  dates: string;
  /** Arriba a la derecha de cada hoja: la unidad y el Grupo. */
  headerLines: string[];
  objectives: string[];
  facts: [string, string][];
  days: PlanDay[];
  materials: string[];
  roster: { groupLabel: string; adults: PlanRosterRow[]; members: PlanRosterRow[] } | null;
  /** Color de la rama, para las barras de las tablas. */
  color: string;
  generated: string;
}

const PAGE = { w: 595.28, h: 841.89 };
const L = 56;
const R = PAGE.w - 56;
const TOP = 78;
const BOTTOM = PAGE.h - 62;

/** Mezcla un color con blanco (0 = el color, 1 = blanco). */
function tint(hex: string, t: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

class Sheet {
  y = TOP;
  constructor(
    readonly doc: Doc,
    readonly d: PlanPdfData,
  ) {
    this.newPage();
  }
  newPage() {
    this.doc.addPage({ size: 'A4', margin: 0 });
    const logo = asset('scouts-de-argentina.png');
    if (logo) this.doc.image(logo, L, 26, { height: 36 });
    this.d.headerLines.forEach((line, i) => {
      this.doc.font(i === 0 ? FONT.b : FONT.r).fontSize(8.5).fillColor('#333333');
      this.doc.text(line, L, 34 + i * 11, { width: R - L, align: 'right', lineBreak: false });
    });
    this.doc.save().lineWidth(0.5).strokeColor('#bbbbbb').moveTo(L, 66).lineTo(R, 66).stroke().restore();
    this.y = TOP;
  }
  /** Asegura lugar para `height`; si no hay, pasa de hoja. Devuelve si cambió de hoja. */
  need(height: number) {
    if (this.y + height <= BOTTOM) return false;
    this.newPage();
    return true;
  }
  gap(n: number) {
    this.y += n;
  }
  text(s: string, o: { size?: number; font?: string; align?: 'left' | 'center'; color?: string; indent?: number; after?: number } = {}) {
    const size = o.size ?? 10;
    const x = L + (o.indent ?? 0);
    const width = R - x;
    this.doc.font(o.font ?? FONT.r).fontSize(size);
    const hgt = this.doc.heightOfString(s, { width, align: o.align ?? 'left' });
    this.need(hgt);
    this.doc.fillColor(o.color ?? '#000000').text(s, x, this.y, { width, align: o.align ?? 'left' });
    this.y += hgt + (o.after ?? 0);
  }
  heading(s: string) {
    this.need(40);
    this.text(s, { size: 11, font: FONT.b, after: 5 });
  }
  bullets(items: string[]) {
    for (const it of items) {
      this.doc.font(FONT.r).fontSize(10);
      const hgt = this.doc.heightOfString(it, { width: R - L - 26 });
      this.need(hgt);
      this.doc.circle(L + 13, this.y + 4.6, 1.7).fill('#000000');
      this.doc.fillColor('#000000').text(it, L + 26, this.y, { width: R - L - 26 });
      this.y += hgt + 3;
    }
  }
  /** «Rótulo: valor», con el rótulo en negrita. */
  fact(label: string, value: string) {
    this.doc.font(FONT.b).fontSize(10);
    const lw = this.doc.widthOfString(`${label}: `);
    this.doc.font(FONT.r);
    const hgt = this.doc.heightOfString(value, { width: R - L - lw });
    this.need(hgt);
    this.doc.font(FONT.b).fillColor('#000000').text(`${label}:`, L, this.y, { lineBreak: false });
    this.doc.font(FONT.r).text(value, L + lw, this.y, { width: R - L - lw });
    this.y += hgt + 3;
  }

  /** Tabla con barra de título (opcional), encabezado y renglones; el encabezado se repite al pasar de hoja. */
  table(cols: { title: string; width: number; align?: 'left' | 'center' }[], rows: string[][], o: { bar?: string } = {}) {
    const doc = this.doc;
    const total = cols.reduce((s, c) => s + c.width, 0);
    const k = (R - L) / total;
    const ws = cols.map((c) => c.width * k);
    const xs = ws.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? L) + w], [L]);
    const PAD = 5;
    const dark = this.d.color;
    const light = tint(this.d.color, 0.55);
    const head = (continued: boolean) => {
      if (o.bar) {
        doc.rect(L, this.y, R - L, 16).fill(dark);
        doc.font(FONT.b).fontSize(9.5).fillColor('#ffffff').text(continued ? `${o.bar} (continúa)` : o.bar, L + 12, this.y + 3.8, { lineBreak: false });
        this.y += 16;
      }
      doc.rect(L, this.y, R - L, 17).fill(light);
      cols.forEach((c, i) => {
        doc.font(FONT.b).fontSize(9).fillColor('#000000').text(c.title, xs[i] + PAD, this.y + 4.6, { width: ws[i] - PAD * 2, align: 'center', lineBreak: false });
      });
      this.y += 17;
    };
    const rowHeight = (r: string[]) => {
      doc.font(FONT.r).fontSize(9);
      return Math.max(17, ...r.map((cell, i) => doc.heightOfString(cell || ' ', { width: ws[i] - PAD * 2 }) + 8));
    };
    const first = rows.length ? rowHeight(rows[0]) : 17;
    this.need((o.bar ? 16 : 0) + 17 + first);
    head(false);
    for (const r of rows) {
      const hgt = rowHeight(r);
      if (this.y + hgt > BOTTOM) {
        this.newPage();
        head(true);
      }
      r.forEach((cell, i) => {
        doc.font(FONT.r).fontSize(9).fillColor('#000000');
        const ch = doc.heightOfString(cell || ' ', { width: ws[i] - PAD * 2 });
        doc.text(cell, xs[i] + PAD, this.y + (hgt - ch) / 2 + 1, { width: ws[i] - PAD * 2, align: cols[i].align ?? 'left' });
      });
      doc.save().lineWidth(0.5).strokeColor('#000000');
      doc.moveTo(L, this.y + hgt).lineTo(R, this.y + hgt).stroke();
      for (const x of xs) doc.moveTo(x, this.y).lineTo(x, this.y + hgt).stroke();
      doc.restore();
      this.y += hgt;
    }
  }
}

/** El plan del campamento en PDF. */
export function campPlanPdf(d: PlanPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0, bufferPages: true, info: { Title: d.title, Author: 'ALCONBAR Gestión', Creator: 'ALCONBAR Gestión' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      const s = new Sheet(doc, d);
      s.gap(8);
      s.text(d.title, { size: 13, font: FONT.b, align: 'center', after: 2 });
      s.text(d.dates, { size: 12, font: FONT.b, align: 'center', after: 18 });

      if (d.objectives.length) {
        s.heading('Objetivos:');
        s.bullets(d.objectives);
        s.gap(10);
      }
      for (const [label, val] of d.facts) s.fact(label, val);
      if (d.facts.length) s.gap(12);

      for (const day of d.days) {
        s.need(90);
        s.text(day.heading, { size: 11, font: FONT.b, after: 3 });
        s.table(
          [
            { title: 'Horario', width: 13, align: 'center' },
            { title: 'Actividad principal', width: 26, align: 'center' },
            { title: 'Responsable', width: 16, align: 'center' },
            { title: 'Materiales', width: 22, align: 'center' },
            { title: 'Comentarios', width: 23 },
          ],
          day.items.map((i) => [i.time, i.what, i.who, i.materials, i.notes]),
          { bar: day.bar },
        );
        if (day.notes) {
          s.gap(5);
          s.text(day.notes, { size: 9, color: '#333333' });
        }
        s.gap(16);
      }

      if (d.materials.length) {
        s.heading('Materiales:');
        s.bullets(d.materials);
        s.gap(14);
      }

      if (d.roster) {
        s.heading('Nómina');
        const cols = (last: string) => [
          { title: 'DNI', width: 18, align: 'center' as const },
          { title: 'Apellido', width: 30 },
          { title: 'Nombres', width: 30 },
          { title: last, width: 22, align: 'center' as const },
        ];
        const rows = (list: PlanRosterRow[]) => list.map((r) => [r.dni, r.lastName, r.firstName, r.group]);
        if (d.roster.adults.length) {
          s.need(60);
          s.text(`Adultos (${d.roster.adults.length})`, { size: 10, after: 4 });
          s.table(cols('Función'), rows(d.roster.adults));
          s.gap(14);
        }
        if (d.roster.members.length) {
          s.need(60);
          s.text(`Protagonistas (${d.roster.members.length})`, { size: 10, after: 4 });
          s.table(cols(d.roster.groupLabel), rows(d.roster.members));
        }
        if (!d.roster.adults.length && !d.roster.members.length) s.text('Todavía no hay inscriptos.', { size: 10, color: '#555555' });
      }

      // Pie de cada hoja: cuándo se generó y número de página
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font(FONT.r).fontSize(8).fillColor('#777777');
        doc.text(d.generated, L, PAGE.h - 40, { lineBreak: false });
        const p = `Página ${i + 1} de ${range.count}`;
        doc.text(p, R - doc.widthOfString(p), PAGE.h - 40, { lineBreak: false });
      }
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

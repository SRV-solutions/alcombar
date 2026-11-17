import { CALENDAR_TYPE_LABELS, type CalendarType } from '@shared';

export interface CalItem {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM' */
  start: string;
  end: string;
  allDay: boolean;
  unit: { id: string; name: string; code: string; branch: string } | null;
  type: string;
  place: string | null;
  description?: string | null;
  source: string;
  link: string | null;
  editable: boolean;
}

export const typeLabel = (t: string) => CALENDAR_TYPE_LABELS[t as CalendarType] ?? t;
export const day = (s: string) => s.slice(0, 10);
export const time = (s: string) => (s.length > 10 ? s.slice(11, 16) : '');

export const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "sábado 5 de diciembre" */
export const longDate = (s: string) => {
  const d = parseIso(day(s));
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
};

/** "19:00 a 22:00", "Todo el día", "del 5 al 7 de diciembre" */
export function whenLabel(i: CalItem) {
  const multi = day(i.start) !== day(i.end);
  const range = multi ? `Del ${longDate(i.start)} al ${longDate(i.end)}` : longDate(i.start);
  if (i.allDay || !time(i.start)) return `${range} · todo el día`;
  return `${range} · ${time(i.start)}${time(i.end) ? ` a ${time(i.end)}` : ''}`;
}

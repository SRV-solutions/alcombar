/**
 * Lo que otros módulos aportan al calendario: campamentos y salidas, eventos del Grupo y actividades fuera
 * de la sede. No se editan desde el calendario: cada ítem lleva a su pantalla (si la persona la puede ver).
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { can, CAMP_TYPE_LABELS, CAMP_STATUS_LABELS, EVENT_TYPE_LABELS, type CampStatus, type CampType, type EventType } from '../shared';
import { calendarSources, type CalendarItem } from './calendar.routes';

type UnitRow = { unit_id: string | null; unit_name: string | null; unit_code: string | null; unit_branch: string | null };
const unitOf = (r: UnitRow) => (r.unit_id ? { id: r.unit_id, name: r.unit_name!, code: r.unit_code!, branch: r.unit_branch! } : null);

// Campamentos, acantonamientos y salidas
calendarSources.push(async (req, from, to) => {
  const rows = await sequelize.query<
    UnitRow & { id: string; name: string; type: string; status: string; start_date: string; end_date: string; place: string | null }
  >(
    `SELECT c.id, c.name, c.type, c.status, c.start_date::text AS start_date, c.end_date::text AS end_date,
            COALESCE(s.name, c.place) AS place, u.id AS unit_id, u.name AS unit_name, u.code AS unit_code, u.branch AS unit_branch
     FROM camps c
     LEFT JOIN units u ON u.id = c.owner_unit_id
     LEFT JOIN camp_sites s ON s.id = c.camp_site_id
     WHERE c.deleted_at IS NULL AND c.start_date <= :to AND c.end_date >= :from`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  return rows.map(
    (r): CalendarItem => ({
      id: r.id,
      title: `${CAMP_TYPE_LABELS[r.type as CampType] ?? 'Campamento'}: ${r.name}${r.status === 'borrador' ? ' (borrador)' : ''}`,
      start: r.start_date,
      end: r.end_date,
      allDay: true,
      unit: unitOf(r),
      type: 'campamento',
      place: r.place,
      description: CAMP_STATUS_LABELS[r.status as CampStatus] ?? null,
      source: 'campamentos',
      link: can(req.auth, 'camps', 'view', r.unit_id) ? `/campamentos/${r.id}` : null,
      editable: false,
    }),
  );
});

// Eventos del Grupo (fogones, aniversario, rifas…)
calendarSources.push(async (req, from, to) => {
  const rows = await sequelize.query<{ id: string; name: string; type: string; date: string; place: string | null }>(
    `SELECT id, name, type, date::text AS date, place FROM events
     WHERE deleted_at IS NULL AND date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  return rows.map(
    (r): CalendarItem => ({
      id: r.id,
      title: r.name,
      start: r.date,
      end: r.date,
      allDay: true,
      unit: null,
      type: 'evento',
      place: r.place,
      description: EVENT_TYPE_LABELS[r.type as EventType] ?? null,
      source: 'eventos',
      link: can(req.auth, 'events', 'view') ? `/eventos/${r.id}` : null,
      editable: false,
    }),
  );
});

// Actividades fuera de la sede (fichas aprobadas): conviene que todo el Grupo sepa dónde está cada unidad
calendarSources.push(async (req, from, to) => {
  const rows = await sequelize.query<UnitRow & { id: string; name: string; date: string; place: string | null; status: string }>(
    `SELECT s.id, s.name, s.date::text AS date, s.place, s.status,
            u.id AS unit_id, u.name AS unit_name, u.code AS unit_code, u.branch AS unit_branch
     FROM activity_sheets s JOIN units u ON u.id = s.unit_id
     WHERE s.deleted_at IS NULL AND s.outside AND s.status IN ('aprobada','realizada','evaluada') AND s.date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  return rows.map(
    (r): CalendarItem => ({
      id: r.id,
      title: `Salida: ${r.name}`,
      start: r.date,
      end: r.date,
      allDay: true,
      unit: unitOf(r),
      type: 'otro',
      place: r.place,
      description: 'Actividad fuera de la sede (ficha de actividad)',
      source: 'fichas',
      link: can(req.auth, 'activities', 'view', r.unit_id) ? `/programa/fichas/${r.id}` : null,
      editable: false,
    }),
  );
});

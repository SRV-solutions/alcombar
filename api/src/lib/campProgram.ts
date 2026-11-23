/**
 * Programa y cronograma de un campamento, sin tablas propias: cada día del campamento es el "Programa del sábado"
 * (programa del día) de la unidad para esa fecha, con sus momentos y fichas. Así se arma con el mismo editor y una
 * ficha queda enlazada al cronograma del campamento sin repetir nada.
 */
import { Op } from 'sequelize';
import { can } from '../shared';
import type { PermissionSubject } from '../shared';
import { Adult, Unit } from '../models';
import { ActivitySheet, MeetingItem, MeetingProgram } from '../models/program';
import { Camp, CampUnit } from '../models/treasury';

const adultAttrs = ['id', 'firstName', 'lastName', 'totem'];
const unitAttrs = ['id', 'name', 'code', 'branch'];

/** Unidades del campamento: la que organiza y las que participan. */
export async function campUnitIds(camp: Camp): Promise<string[]> {
  const cus = camp.campUnits ?? (await CampUnit.findAll({ where: { campId: camp.id } }));
  return [...new Set([...(camp.ownerUnitId ? [camp.ownerUnitId] : []), ...cus.map((c) => c.unitId)])];
}

export async function campProgram(auth: PermissionSubject | undefined, camp: Camp) {
  const unitIds = await campUnitIds(camp);
  if (!unitIds.length) return { units: [], days: [], sheets: [] };
  const range = { [Op.between]: [camp.startDate, camp.endDate] };
  const [units, programs, sheets] = await Promise.all([
    Unit.findAll({ where: { id: unitIds }, attributes: unitAttrs }),
    MeetingProgram.findAll({
      where: { unitId: unitIds, date: range },
      include: [
        {
          model: MeetingItem,
          as: 'items',
          include: [
            { model: ActivitySheet, as: 'sheet', attributes: ['id', 'code', 'name', 'status', 'durationMin'] },
            { model: Adult, as: 'responsible', attributes: adultAttrs },
          ],
        },
      ],
      order: [
        ['date', 'ASC'],
        [{ model: MeetingItem, as: 'items' }, 'sortOrder', 'ASC'],
      ],
    }),
    ActivitySheet.findAll({ where: { unitId: unitIds, date: range }, attributes: ['id', 'code', 'name', 'date', 'status', 'unitId'], order: [['date', 'ASC'], ['name', 'ASC']] }),
  ]);
  const scheduled = new Set(programs.flatMap((p) => (p.items ?? []).map((i) => i.activitySheetId)).filter(Boolean));
  const linked = programs.flatMap((p) => (p.items ?? []).map((i) => i.sheet).filter((s): s is ActivitySheet => !!s));
  // Fichas del campamento: las enlazadas al cronograma y las de la unidad con fecha dentro del campamento
  const allSheets = [...new Map([...sheets, ...linked].map((s) => [s.id, s])).values()];
  return {
    units: units.map((u) => ({ unit: u, canView: can(auth, 'activities', 'view', u.id), canEdit: can(auth, 'activities', 'edit', u.id) })),
    days: programs.map((p) => ({
      id: p.id,
      unitId: p.unitId,
      date: p.date,
      notes: p.notes,
      items: (p.items ?? []).map((i) => ({
        id: i.id,
        time: i.time ? i.time.slice(0, 5) : null,
        title: i.title,
        durationMin: i.durationMin,
        notes: i.notes,
        materials: i.materials ?? null,
        responsible: i.responsible ?? null,
        responsibleText: i.responsibleText ?? null,
        sheet: i.sheet ? { id: i.sheet.id, code: i.sheet.code, name: i.sheet.name, status: i.sheet.status } : null,
      })),
    })),
    sheets: allSheets
      .map((s) => ({ id: s.id, code: s.code, name: s.name, date: s.date ?? null, status: s.status, unitId: s.unitId ?? null, inSchedule: scheduled.has(s.id) }))
      .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.name.localeCompare(b.name)),
  };
}

/** Campamentos de la unidad que incluyen esa fecha (para avisar en el programa del día). */
export async function campsOn(unitId: string, date: string) {
  const camps = await Camp.findAll({
    where: { startDate: { [Op.lte]: date }, endDate: { [Op.gte]: date } },
    include: [{ model: CampUnit, as: 'campUnits', attributes: ['unitId'] }],
    attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'ownerUnitId'],
  });
  return camps
    .filter((c) => c.ownerUnitId === unitId || (c.campUnits ?? []).some((cu) => cu.unitId === unitId))
    .map((c) => ({ id: c.id, name: c.name, type: c.type, startDate: c.startDate, endDate: c.endDate }));
}

/** Dónde aparece una ficha: cada momento de un programa del día que la usa, y el campamento de esa fecha si hay. */
export async function sheetSchedule(sheetId: string) {
  const items = await MeetingItem.findAll({
    where: { activitySheetId: sheetId },
    include: [{ model: MeetingProgram, as: 'program', required: true, attributes: ['id', 'date', 'unitId'] }],
  });
  const out = [];
  for (const i of items) {
    const p = (i as MeetingItem & { program: MeetingProgram }).program;
    const camps = await campsOn(p.unitId, p.date);
    out.push({ date: p.date, time: i.time ? i.time.slice(0, 5) : null, unitId: p.unitId, camp: camps[0] ?? null });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}

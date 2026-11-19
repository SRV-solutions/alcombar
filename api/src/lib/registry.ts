/**
 * Altas y bajas para Cruz del Sur (la plataforma oficial de SAAC).
 * Cuando en ALCONBAR alguien da de alta o de baja a un protagonista o a un adulto, queda un pendiente para que el
 * equipo de administración lo cargue en Cruz del Sur, y se le avisa a todo ese equipo (campanita + mail).
 * - Protagonista: cuenta como registrado si está "activo".
 * - Adulto: cuenta como registrado si está "alta" (el período de prueba todavía no se carga).
 * Si había un pendiente al revés sin hacer (por ejemplo, un alta y enseguida la baja), se anula en lugar de sumar otro.
 */
import type { Request } from 'express';
import type { Transaction } from 'sequelize';
import { Adult, Member, Unit } from '../models';
import { RegistryTask } from '../models/notifications';
import { notify, registryRecipients, shortList } from './notify';

export type RegistryKind = 'alta' | 'baja';

export const memberRegistered = (status: string | null | undefined) => status === 'activo';
export const adultRegistered = (status: string | null | undefined) => status === 'alta';

/** Qué movimiento hay que cargar en Cruz del Sur según cómo estaba y cómo quedó (null = no existía / se eliminó). */
export function registryTransition(before: boolean | null, after: boolean | null): RegistryKind | null {
  if (!before && after) return 'alta';
  if (before && !after) return 'baja';
  return null;
}

export interface RegistryChange {
  kind: RegistryKind;
  member?: Member;
  adult?: Adult;
  /** Motivo o aclaración (ej. "Se eliminó de ALCONBAR"). */
  detail?: string | null;
}

const personName = (p: { firstName: string; lastName: string }) => `${p.lastName}, ${p.firstName}`;

/**
 * Registra los movimientos y avisa al equipo. Llamarla después de guardar los cambios (fuera de la transacción).
 * Devuelve cuántos pendientes nuevos quedaron.
 */
export async function recordRegistryChanges(req: Request | null, changes: RegistryChange[], opts: { transaction?: Transaction; silent?: boolean } = {}) {
  const created: { task: RegistryTask; label: string }[] = [];
  const unitIds = [...new Set(changes.map((c) => c.member?.unitId).filter((x): x is string => !!x))];
  const units = unitIds.length ? await Unit.findAll({ where: { id: unitIds }, attributes: ['id', 'name'], transaction: opts.transaction }) : [];
  const actorId = req?.user?.id ?? null;

  for (const c of changes) {
    const personType = c.member ? 'member' : 'adult';
    const person = (c.member ?? c.adult)!;
    const where = c.member ? { memberId: c.member.id } : { adultId: c.adult!.id };
    // ¿Había un movimiento al revés sin cargar? Entonces no hace falta ninguno de los dos.
    const opposite = await RegistryTask.findOne({
      where: { ...where, status: 'pendiente', kind: c.kind === 'alta' ? 'baja' : 'alta' },
      transaction: opts.transaction,
    });
    if (opposite) {
      await opposite.update(
        {
          status: 'anulada',
          resolvedAt: new Date(),
          resolvedByUserId: actorId,
          resolutionNote: c.kind === 'alta' ? 'Se volvió a dar de alta antes de cargar la baja' : 'Se dio de baja antes de cargar el alta',
        },
        { transaction: opts.transaction },
      );
      continue;
    }
    // Ya hay uno igual pendiente: no se repite
    if (await RegistryTask.findOne({ where: { ...where, status: 'pendiente', kind: c.kind }, transaction: opts.transaction })) continue;
    const unit = c.member?.unitId ? units.find((u) => u.id === c.member!.unitId) : null;
    const task = await RegistryTask.create(
      {
        kind: c.kind,
        personType,
        memberId: c.member?.id ?? null,
        adultId: c.adult?.id ?? null,
        personName: personName(person),
        unitId: unit?.id ?? null,
        detail: c.detail ?? null,
        createdByUserId: actorId,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      },
      { transaction: opts.transaction },
    );
    const where2 = personType === 'member' ? (unit ? `protagonista de ${unit.name}` : 'protagonista sin unidad asignada') : 'adulto';
    created.push({ task, label: `${task.personName} (${where2})` });
  }

  if (created.length && !opts.silent) {
    const send = () => notifyRegistry(req, created.map((x) => ({ kind: x.task.kind, label: x.label })));
    if (opts.transaction) opts.transaction.afterCommit(() => void send());
    else void send();
  }
  return created.length;
}

async function notifyRegistry(req: Request | null, items: { kind: RegistryKind; label: string }[]) {
  const recipients = await registryRecipients(req?.user?.id ?? null);
  if (!recipients.userIds.length && !recipients.emails.length) return;
  const altas = items.filter((i) => i.kind === 'alta');
  const bajas = items.filter((i) => i.kind === 'baja');
  const what =
    altas.length && bajas.length
      ? `${altas.length} ${altas.length === 1 ? 'alta' : 'altas'} y ${bajas.length} ${bajas.length === 1 ? 'baja' : 'bajas'}`
      : altas.length
        ? altas.length === 1
          ? 'Un alta'
          : `${altas.length} altas`
        : bajas.length === 1
          ? 'Una baja'
          : `${bajas.length} bajas`;
  const title = `${what} para cargar en Cruz del Sur`;
  const names = items.map((i) => i.label.replace(/ \(.*\)$/, ''));
  const actor = req?.user?.name ?? 'Alguien';
  const lines = [
    ...(altas.length ? [`Altas: ${altas.map((i) => i.label).join(' · ')}`] : []),
    ...(bajas.length ? [`Bajas: ${bajas.map((i) => i.label).join(' · ')}`] : []),
  ];
  await notify({
    recipients,
    kind: 'cruz_del_sur',
    title,
    body: shortList(names),
    link: '/cruz-del-sur',
    email: {
      subject: items.length === 1 ? `${title}: ${names[0]}` : title,
      paragraphs: [
        `${actor} registró en ALCONBAR:`,
        ...lines,
        'Hay que cargarlo en Cruz del Sur, la plataforma oficial de SAAC. Cuando esté hecho, marcalo como hecho en ALCONBAR así el resto del equipo sabe que ya se cargó.',
      ],
      button: 'Ver pendientes de Cruz del Sur',
      footnote: `Te llega porque sos parte de ${recipients.teams.map((t) => t.name).join(' / ')}, el equipo que recibe los avisos de altas y bajas.`,
    },
  });
}

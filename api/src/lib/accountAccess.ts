/**
 * Plata del Grupo y de cada unidad: cada cuenta es del Grupo (unitId null) o de una unidad (su caja).
 * El permiso de contabilidad se lee contra la dueña de la cuenta:
 *  - para todo el Grupo (Tesorería, Secretaría): todas las cuentas, del Grupo y de las unidades;
 *  - limitado a la unidad (Finanzas de la unidad): solo las cuentas de su unidad.
 */
import type { Request } from 'express';
import { can, unitsWith, type Action, type PermissionSubject } from '../shared';
import { Account } from '../models/treasury';
import { badRequest, forbidden } from './errors';

type Auth = PermissionSubject | null | undefined;

/** ¿Puede hacer la acción sobre una cuenta? (cuenta del Grupo = hace falta el permiso para todo el Grupo) */
export const canAccount = (auth: Auth, action: Action, account: { unitId: string | null }) => can(auth, 'accounting', action, account.unitId ?? null);

export function assertAccount(auth: Auth, action: Action, account: { unitId: string | null; name?: string }) {
  if (!canAccount(auth, action, account)) {
    throw forbidden(account.unitId ? 'Esa cuenta es de otra unidad' : 'Las cuentas del Grupo las manejan Tesorería y Secretaría');
  }
}

/** Ids de las cuentas con las que puede hacer la acción; null = todas. */
export async function accountIdsFor(auth: Auth, action: Action): Promise<string[] | null> {
  const units = unitsWith(auth, 'accounting', action);
  if (units === 'all') return null;
  if (!units.length) return [];
  return (await Account.findAll({ where: { unitId: units }, attributes: ['id'], paranoid: false })).map((a) => a.id);
}

/**
 * Cuentas a mirar según el filtro "ámbito" (?ambito=grupo | <unitId>) dentro de lo que puede ver.
 * null = sin restricción (todas las cuentas).
 */
export async function scopedAccountIds(req: Request, action: Action = 'view'): Promise<string[] | null> {
  const allowed = await accountIdsFor(req.auth, action);
  const ambito = String(req.query.ambito ?? '');
  if (!ambito) return allowed;
  const where = ambito === 'grupo' ? { unitId: null } : { unitId: ambito };
  const ids = (await Account.findAll({ where, attributes: ['id'], paranoid: false })).map((a) => a.id);
  return allowed === null ? ids : ids.filter((id) => allowed.includes(id));
}

/** Cuenta existente (o error de validación en el campo). */
export async function accountOr400(id: string, field = 'accountId') {
  const a = await Account.findByPk(id);
  if (!a) throw badRequest('Revisá los datos', { [field]: 'Cuenta inexistente' });
  return a;
}

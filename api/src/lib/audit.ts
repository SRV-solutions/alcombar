import type { Model, Transaction } from 'sequelize';
import { sequelize } from '../db';
import { AuditLog } from '../models';
import { currentContext } from './context';

// Registro de auditoría (informe §2.4): toda creación, edición y eliminación queda registrada.
const SKIP_MODELS = new Set(['AuditLog', 'Session', 'PasswordToken', 'Permission']);
const HIDDEN_FIELDS = new Set(['passwordHash']);
const IGNORED_FIELDS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'failedLogins', 'lockedUntil', 'lastLoginAt', 'tutorials']);

function label(instance: Model): string | null {
  const v = instance.get() as Record<string, unknown>;
  if (v.lastName && v.firstName) return `${v.lastName}, ${v.firstName}`;
  const s = (v.name ?? v.email ?? v.position ?? v.code ?? v.date ?? null) as string | null;
  return s ? String(s).slice(0, 300) : null;
}

function clean(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (IGNORED_FIELDS.has(k) || v === undefined) continue;
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) continue; // asociaciones incluidas
    out[k] = HIDDEN_FIELDS.has(k) ? '••••' : v;
  }
  return out;
}

export async function writeAudit(
  entry: { action: string; entity: string; entityId?: string | null; summary?: string | null; changes?: unknown },
  transaction?: Transaction | null,
) {
  const ctx = currentContext();
  await AuditLog.create(
    {
      userId: ctx.userId,
      ip: ctx.ip,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      summary: entry.summary ?? null,
      changes: entry.changes ?? null,
    },
    { transaction: transaction ?? undefined },
  );
}

export function installAuditHooks() {
  sequelize.addHook('afterCreate', async (instance: Model, options: { transaction?: Transaction | null }) => {
    const name = (instance.constructor as typeof Model).name;
    if (SKIP_MODELS.has(name)) return;
    await writeAudit(
      { action: 'create', entity: name, entityId: String(instance.get('id')), summary: label(instance), changes: { after: clean(instance.get()) } },
      options.transaction,
    );
  });

  sequelize.addHook('afterUpdate', async (instance: Model, options: { transaction?: Transaction | null }) => {
    const name = (instance.constructor as typeof Model).name;
    if (SKIP_MODELS.has(name)) return;
    const changed = (instance.changed() || []).filter((k) => !IGNORED_FIELDS.has(k as string)) as string[];
    if (!changed.length) return;
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const k of changed) {
      const prev = instance.previous(k as never);
      const next = instance.get(k);
      if (JSON.stringify(prev) === JSON.stringify(next)) continue;
      before[k] = HIDDEN_FIELDS.has(k) ? '••••' : prev;
      after[k] = HIDDEN_FIELDS.has(k) ? '••••' : next;
    }
    if (!Object.keys(after).length) return;
    await writeAudit(
      { action: 'update', entity: name, entityId: String(instance.get('id')), summary: label(instance), changes: { before, after } },
      options.transaction,
    );
  });

  sequelize.addHook('afterDestroy', async (instance: Model, options: { transaction?: Transaction | null }) => {
    const name = (instance.constructor as typeof Model).name;
    if (SKIP_MODELS.has(name)) return;
    await writeAudit(
      { action: 'delete', entity: name, entityId: String(instance.get('id')), summary: label(instance), changes: { before: clean(instance.get()) } },
      options.transaction,
    );
  });
}

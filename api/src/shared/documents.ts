export type DocStatus = 'ok' | 'expiring' | 'expired' | 'missing';

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  ok: 'Al día',
  expiring: 'Vence pronto',
  expired: 'Vencido',
  missing: 'Falta',
};

/** Estado de un documento para el semáforo. "Vence pronto" = dentro de 30 días. */
export function documentStatus(
  doc: { presented: boolean; expiresAt: string | null } | null | undefined,
  hasExpiry: boolean,
  todayIso: string,
): DocStatus {
  if (!doc || !doc.presented) return 'missing';
  if (!hasExpiry || !doc.expiresAt) return 'ok';
  if (doc.expiresAt < todayIso) return 'expired';
  const soon = new Date(todayIso + 'T00:00:00');
  soon.setDate(soon.getDate() + 30);
  const soonIso = soon.toISOString().slice(0, 10);
  return doc.expiresAt <= soonIso ? 'expiring' : 'ok';
}

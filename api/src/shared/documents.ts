export type DocStatus = 'ok' | 'expiring' | 'expired' | 'missing';

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  ok: 'Al día',
  expiring: 'Vence pronto',
  expired: 'Vencido',
  missing: 'Falta',
};

type DocLike = { presented: boolean; expiresAt?: string | null; notApplicable?: boolean | null };

/**
 * Estado de un documento para el semáforo. "Vence pronto" = dentro de 30 días.
 * No cuentan como faltantes: lo marcado "No corresponde" y los documentos opcionales sin presentar.
 */
export function documentStatus(doc: DocLike | null | undefined, hasExpiry: boolean, todayIso: string, required = true): DocStatus {
  if (doc?.notApplicable && !doc.presented) return 'ok';
  if (!doc || !doc.presented) return required ? 'missing' : 'ok';
  if (!hasExpiry || !doc.expiresAt) return 'ok';
  if (doc.expiresAt < todayIso) return 'expired';
  const soon = new Date(todayIso + 'T00:00:00');
  soon.setDate(soon.getDate() + 30);
  const soonIso = soon.toISOString().slice(0, 10);
  return doc.expiresAt <= soonIso ? 'expiring' : 'ok';
}

/** Texto del estado: distingue "No corresponde" y "Opcional" de un documento realmente al día. */
export function documentLabel(status: DocStatus, doc: DocLike | null | undefined, required = true): string {
  if (!doc?.presented) {
    if (doc?.notApplicable) return 'No corresponde';
    if (!required) return 'Opcional';
  }
  return DOC_STATUS_LABELS[status];
}
/** ¿Es un "al día" de verdad? (presentado y vigente; no un "no corresponde" ni un opcional sin presentar) */
export const isRealDocument = (doc: DocLike | null | undefined) => !!doc?.presented;

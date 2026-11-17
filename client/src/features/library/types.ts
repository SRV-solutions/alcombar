import { DOCUMENT_CATEGORY_LABELS, MINUTE_KIND_LABELS, MINUTE_STATUS_LABELS, type DocumentCategory, type MinuteKind, type MinuteStatus } from '@shared';

export interface MinuteRow {
  id: string;
  number: number;
  year: number;
  date: string;
  kind: MinuteKind;
  title: string;
  status: MinuteStatus;
  driveUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
}
export interface Minute extends MinuteRow {
  attendees: string | null;
  agenda: string | null;
  content: string | null;
  createdBy: { id: string; name: string } | null;
}
export interface DocLink {
  id: string;
  title: string;
  category: DocumentCategory;
  url: string;
  description: string | null;
  unitId: string | null;
  unit: { id: string; name: string; code: string; branch: string } | null;
}

export const kindLabel = (k: string) => MINUTE_KIND_LABELS[k as MinuteKind] ?? k;
export const statusLabel = (s: string) => MINUTE_STATUS_LABELS[s as MinuteStatus] ?? s;
export const categoryLabel = (c: string) => DOCUMENT_CATEGORY_LABELS[c as DocumentCategory] ?? c;
export const minuteNumber = (m: { number: number; year: number }) => `${m.number}/${m.year}`;

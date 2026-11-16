import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Adult, Course, DocumentType, RoleInfo, Unit } from './types';

/** Catálogos que usan muchas pantallas. */
export const useUnits = () => useQuery({ queryKey: ['units'], queryFn: () => api.get<Unit[]>('/group/units'), staleTime: 60_000 });
export const useDocumentTypes = () =>
  useQuery({ queryKey: ['document-types'], queryFn: () => api.get<DocumentType[]>('/group/document-types'), staleTime: 60_000 });
export const useCourses = () => useQuery({ queryKey: ['courses'], queryFn: () => api.get<Course[]>('/group/courses'), staleTime: 60_000 });
export const useRoles = () => useQuery({ queryKey: ['roles'], queryFn: () => api.get<RoleInfo[]>('/roles') });
export const useAdults = (enabled = true) =>
  useQuery({ queryKey: ['adults', 'all'], queryFn: () => api.get<Adult[]>('/adults'), enabled, staleTime: 30_000 });

export const adultName = (a: { firstName: string; lastName: string; totem?: string | null } | null | undefined) =>
  a ? `${a.firstName} ${a.lastName}${a.totem ? ` («${a.totem}»)` : ''}` : '';

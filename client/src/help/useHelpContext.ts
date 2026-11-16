import { useMemo } from 'react';
import { useAuth } from '../lib/auth';
import type { HelpContext } from './helpIndex';

/** Contexto para filtrar ayuda y tutoriales según los permisos de quien mira. */
export function useHelpContext(): HelpContext {
  const { me, can } = useAuth();
  // `can` se recrea en cada render: memo por identidad de `me` (cambia cuando cambian los permisos).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ can, isSuperadmin: !!me?.isSuperadmin, loggedIn: !!me }), [me]);
}

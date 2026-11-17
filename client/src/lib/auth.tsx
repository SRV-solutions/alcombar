import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { can as canFn, canGroupWide, unitsWith, type Action, type ModuleKey } from '@shared';
import { api, ApiError, refreshSession, setSessionLostHandler } from './api';
import type { Me } from './types';

interface AuthValue {
  me: Me | null;
  loading: boolean;
  can: (module: ModuleKey, action: Action, unitId?: string | null) => boolean;
  canAll: (module: ModuleKey, action: Action) => boolean;
  unitsWith: (module: ModuleKey, action: Action) => 'all' | string[];
  logout: () => Promise<void>;
  refetch: () => Promise<unknown>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          // Intenta renovar la sesión una vez antes de mandar al login
          if (await refreshSession()) return api.get<Me>('/auth/me');
          return null;
        }
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    setSessionLostHandler(() => {
      qc.setQueryData(['me'], null);
    });
  }, [qc]);

  const me = query.data ?? null;
  const value: AuthValue = {
    me,
    loading: query.isLoading,
    can: (m, a, u) => canFn(me, m, a, u),
    canAll: (m, a) => canGroupWide(me, m, a),
    unitsWith: (m, a) => unitsWith(me, m, a),
    logout: async () => {
      await api.post('/auth/logout').catch(() => undefined);
      qc.clear();
      qc.setQueryData(['me'], null);
    },
    refetch: query.refetch,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}

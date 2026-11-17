import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { IdCard } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { LinkButton, PageHeader, UnitBadge } from '../../components/ui';
import { MemberProgressPanel } from './MemberProgressPanel';
import type { MemberProgressData } from './types';

/** Progresión → un protagonista (/progresion/:memberId). */
export function MemberProgressPage() {
  const { memberId = '' } = useParams();
  const { can } = useAuth();
  // Misma consulta que el panel: React Query la comparte, acá solo se usa para el encabezado.
  const q = useQuery({ queryKey: ['progression-member', memberId], queryFn: () => api.get<MemberProgressData>(`/progression/members/${memberId}`) });
  const m = q.data?.member;
  return (
    <>
      <PageHeader
        crumbs={[{ to: m?.unit ? `/progresion?unitId=${m.unit.id}` : '/progresion', label: 'Progresión' }]}
        title={m ? `${m.lastName}, ${m.firstName}` : 'Progresión'}
        sub={m?.unit ? <UnitBadge unit={m.unit} /> : m ? <span className="muted">Sin unidad asignada</span> : null}
        actions={
          m && can('members', 'view', m.unit?.id ?? null) ? (
            <LinkButton to={`/protagonistas/${m.id}`} variant="secondary">
              <IdCard /> Ficha del protagonista
            </LinkButton>
          ) : null
        }
      />
      <MemberProgressPanel memberId={memberId} />
    </>
  );
}

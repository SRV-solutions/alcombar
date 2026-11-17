import { ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Empty, LinkButton } from '../../components/ui';
import { MemberProgressPanel } from './MemberProgressPanel';

/** Ficha del protagonista → pestaña Progresión (el mismo panel que /progresion/:memberId). */
export function MemberProgressTab({ memberId, unitId }: { memberId: string; unitId: string | null; branch: string | null }) {
  const { can } = useAuth();
  if (!can('progression', 'view', unitId)) return <Empty>No tenés permiso para ver la progresión de este protagonista.</Empty>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <LinkButton to={`/progresion/${memberId}`} variant="ghost" size="sm">
          <ExternalLink /> Abrir en Progresión
        </LinkButton>
      </div>
      <MemberProgressPanel memberId={memberId} />
    </div>
  );
}

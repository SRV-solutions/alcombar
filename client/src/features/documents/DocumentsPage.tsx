import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { DOC_STATUS_LABELS, formatDate, type DocStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import type { DocumentType } from '../../lib/types';
import { Card, DocDot, Empty, ErrorBox, Loading, PageHeader, Select } from '../../components/ui';
import { DocumentDialog } from '../members/MemberDialogs';

interface Cell {
  presented: boolean;
  presentedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  status: DocStatus;
}
interface Board {
  canEdit: boolean;
  types: DocumentType[];
  members: { id: string; firstName: string; lastName: string; smallGroup: { id: string; name: string } | null; documents: Record<string, Cell> }[];
}

export function DocumentsPage() {
  const { can, me } = useAuth();
  const qc = useQueryClient();
  const units = useUnits();
  const [params, setParams] = useSearchParams();
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<{ memberId: string; memberName: string; type: DocumentType; cell: Cell } | null>(null);
  const viewable = (units.data ?? []).filter((u) => can('member_documents', 'view', u.id));
  const myUnit = me?.roles.find((r) => r.unit)?.unit?.id;
  const unitId = params.get('unitId') || (viewable.some((u) => u.id === myUnit) ? myUnit! : viewable[0]?.id ?? '');

  const board = useQuery({
    queryKey: ['doc-board', unitId],
    queryFn: () => api.get<Board>(`/documents/board${qs({ unitId })}`),
    enabled: !!unitId,
  });

  if (units.isLoading) return <Loading />;
  const data = board.data;
  const rows = (data?.members ?? []).filter(
    (m) => !onlyPending || Object.values(m.documents).some((c) => c.status !== 'ok'),
  );

  const cellText = (c: Cell, t: DocumentType) => {
    if (c.status === 'missing') return 'Falta';
    if (t.hasExpiry && c.expiresAt) return `${c.status === 'expired' ? 'Venció' : 'Vence'} ${formatDate(c.expiresAt)}`;
    return 'Entregado';
  };

  return (
    <>
      <PageHeader title="Documentación" sub="Qué entregó cada protagonista y cuándo vence. No se guarda el contenido de los documentos." />
      <div className="toolbar">
        <Select value={unitId} onChange={(e) => setParams({ unitId: e.target.value }, { replace: true })} aria-label="Unidad">
          {viewable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <label className="checkbox">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo con pendientes
        </label>
        <span className="row muted" style={{ gap: 12, marginLeft: 'auto', fontSize: '0.85rem' }}>
          {(['ok', 'expiring', 'expired', 'missing'] as DocStatus[]).map((s) => (
            <span key={s} className="row" style={{ gap: 5 }}>
              <DocDot status={s} /> {DOC_STATUS_LABELS[s]}
            </span>
          ))}
        </span>
      </div>

      <Card bodyClass="table-wrap">
        {board.isLoading ? (
          <Loading />
        ) : board.error ? (
          <div className="card-body">
            <ErrorBox error={board.error} />
          </div>
        ) : !data?.members.length ? (
          <Empty icon={<FileCheck2 />}>La unidad no tiene protagonistas activos.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Protagonista</th>
                {data.types.map((t) => {
                  const ok = data.members.filter((m) => m.documents[t.id]?.status === 'ok' || m.documents[t.id]?.status === 'expiring').length;
                  return (
                    <th key={t.id} title={t.name}>
                      {t.name}
                      <div style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>
                        {ok}/{data.members.length} al día
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="nowrap">
                    <Link to={`/protagonistas/${m.id}`}>
                      {m.lastName}, {m.firstName}
                    </Link>
                    {m.smallGroup ? <div className="muted">{m.smallGroup.name}</div> : null}
                  </td>
                  {data.types.map((t) => {
                    const c = m.documents[t.id];
                    return (
                      <td key={t.id}>
                        <button
                          className="doc-cell"
                          disabled={!data.canEdit}
                          title={c.notes ?? DOC_STATUS_LABELS[c.status]}
                          onClick={() => setEditing({ memberId: m.id, memberName: `${m.firstName} ${m.lastName}`, type: t, cell: c })}
                        >
                          <DocDot status={c.status} />
                          <span className={c.status === 'missing' ? 'muted' : ''}>{cellText(c, t)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {data?.canEdit ? <p className="muted mt">Hacé clic en una celda para marcar la entrega o cambiar el vencimiento.</p> : null}

      {editing ? (
        <DocumentDialog
          memberId={editing.memberId}
          memberName={editing.memberName}
          doc={{ documentTypeId: editing.type.id, name: editing.type.name, hasExpiry: editing.type.hasExpiry, ...editing.cell }}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['doc-board', unitId] });
            void qc.invalidateQueries({ queryKey: ['members'] });
            void qc.invalidateQueries({ queryKey: ['member', editing.memberId] });
          }}
        />
      ) : null}
    </>
  );
}

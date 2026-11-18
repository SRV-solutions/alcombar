import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { AUTH_KIND_LABELS, AUTH_STATUS_LABELS, formatDate } from '@shared';
import { api, qs } from '../../lib/api';
import { Badge, Button, Card, Empty } from '../../components/ui';
import { AUTH_STATUS_TONE } from './AuthorizationDocPage';
import { authScope, DeleteAuthButton, NewAuthorizationDialog, PdfButton } from './AuthorizationsPage';
import type { AuthRow } from './types';

/** En la ficha del protagonista: sus autorizaciones firmadas en la app y el botón para hacer firmar otra. */
export function MemberAuthorizationsCard({ memberId, canSign }: { memberId: string; canSign: boolean }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['authorizations', 'member', memberId], queryFn: () => api.get<AuthRow[]>(`/authorizations${qs({ memberId, all: 1 })}`) });
  const rows = q.data ?? [];
  return (
    <Card
      title="Autorizaciones firmadas en la app"
      bodyClass={rows.length ? 'table-wrap' : 'card-body'}
      actions={
        canSign ? (
          <Button size="sm" id="btn-sign-authorization" onClick={() => setOpen(true)}>
            <FileSignature /> Hacer firmar
          </Button>
        ) : null
      }
    >
      {!rows.length ? (
        <Empty>Todavía no firmaron ninguna desde la app. La madre, el padre o el tutor firma con el dedo en tu celular o tablet, sobre la planilla de Scouts de Argentina.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Autorización</th>
              <th>Firmó</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === 'anulada' ? 'voided' : ''}>
                <td>
                  <Link to={`/autorizaciones/${r.id}`}>{AUTH_KIND_LABELS[r.kind]}</Link>
                  {authScope(r) ? <div className="muted">{authScope(r)}</div> : null}
                </td>
                <td>
                  {r.signerName}
                  <div className="muted">{r.signerRole}</div>
                </td>
                <td className="nowrap">{formatDate(r.signedAt.slice(0, 10))}</td>
                <td>
                  <Badge tone={AUTH_STATUS_TONE[r.status]}>{AUTH_STATUS_LABELS[r.status]}</Badge>
                  {r.pending ? <div className="muted">{r.pending}</div> : null}
                </td>
                <td className="num nowrap">
                  <PdfButton row={r} />
                  {r.canDelete ? <DeleteAuthButton row={r} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open ? <NewAuthorizationDialog memberId={memberId} onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

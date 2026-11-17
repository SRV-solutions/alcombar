import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, HandHelping, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Loading, PageHeader, UnitBadge } from '../../components/ui';
import { ItemDialog } from './ItemDialog';
import { CONDITION_TONE, conditionLabel, fmtMoney, LOAN_TONE, loanLabel, type ItemDetail } from './types';
import './inventory.css';

export function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['inventory', 'item', id], queryFn: () => api.get<ItemDetail>(`/inventory/items/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const i = q.data!;
  const dash = <span className="muted">—</span>;

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/inventario', label: 'Inventario' }]}
        title={i.name}
        sub={
          <span className="row" style={{ gap: 8 }}>
            <Badge tone={CONDITION_TONE[i.condition]}>{conditionLabel(i.condition)}</Badge>
            <span>{i.category?.name}</span>
            <span>· {i.unit ? i.unit.name : 'Grupo'}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" disabled={!i.available} onClick={() => navigate(`/inventario/prestamos?nuevo=${i.id}`)}>
              <HandHelping /> Prestar
            </Button>
            {i.canEdit ? (
              <Button onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {i.canDelete ? (
              <ConfirmButton
                title="Eliminar bien"
                message={
                  <p>
                    ¿Eliminar <strong>{i.name}</strong> del inventario? Si se rompió o se perdió, también podés marcarlo como «Fuera de uso» y conservar su
                    historial.
                  </p>
                }
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/inventory/items/${i.id}`);
                    toast.ok('Bien eliminado');
                    await qc.invalidateQueries({ queryKey: ['inventory'] });
                    navigate('/inventario');
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Trash2 />
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Datos">
          <dl className="dl">
            <dt>Cantidad</dt>
            <dd>{i.quantity}</dd>
            <dt>Disponibles</dt>
            <dd className={i.available === 0 ? 'inv-qty-zero' : ''}>
              {i.available}
              {i.committed ? <span className="muted"> ({i.committed} prestados o reservados)</span> : null}
            </dd>
            <dt>Ubicación</dt>
            <dd>{i.location?.name ?? dash}</dd>
            <dt>Dueño</dt>
            <dd>{i.unit ? <UnitBadge unit={i.unit} /> : 'Grupo'}</dd>
            <dt>Compra</dt>
            <dd>
              {formatDate(i.purchaseDate) || dash}
              {i.purchaseValue !== null ? ` · ${fmtMoney(i.purchaseValue)}` : ''}
            </dd>
            <dt>Notas</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{i.notes ?? dash}</dd>
          </dl>
        </Card>
        <Card title="Foto">
          {i.photoUrl ? (
            <div className="stack">
              <img className="inv-item-photo" src={i.photoUrl} alt={i.name} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              <a href={i.photoUrl} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4 }}>
                Abrir la foto <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Sin foto. Podés pegar el enlace de la foto (Drive o Google Fotos) al editar el bien.
            </p>
          )}
        </Card>
      </div>

      <div className="mt">
        <Card title="Historial de préstamos" bodyClass="table-wrap">
          {!i.loans.length ? (
            <Empty>Todavía no se prestó.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Retiro</th>
                  <th>Retira</th>
                  <th>Para qué</th>
                  <th className="num">Cant.</th>
                  <th>Estado</th>
                  <th>Devolución</th>
                </tr>
              </thead>
              <tbody>
                {i.loans.map((l) => (
                  <tr key={l.loanId} className="clickable" onClick={() => navigate(`/inventario/prestamos/${l.loanId}`)}>
                    <td className="nowrap">{formatDate(l.outDate)}</td>
                    <td>{l.borrower ?? dash}</td>
                    <td>
                      <Link to={`/inventario/prestamos/${l.loanId}`} onClick={(e) => e.stopPropagation()}>
                        {l.purpose}
                      </Link>
                    </td>
                    <td className="num">{l.quantity}</td>
                    <td>
                      <Badge tone={l.overdue ? 'danger' : LOAN_TONE[l.status]}>{l.overdue ? 'Vencido' : loanLabel(l.status)}</Badge>
                    </td>
                    <td className="nowrap">
                      {l.returnedAt ? (
                        <>
                          {formatDate(l.returnedAt)}
                          {l.returnCondition ? <span className="muted"> · {conditionLabel(l.returnCondition)}</span> : null}
                        </>
                      ) : (
                        <span className="muted">prevista {formatDate(l.dueDate)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {editing ? <ItemDialog item={i} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

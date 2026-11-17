import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Boxes, Download, Pencil, Plus, Search, Settings2 } from 'lucide-react';
import { formatDate, ITEM_CONDITION_LABELS, ITEM_CONDITIONS } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Empty, ErrorBox, Input, Loading, PageHeader, Select, UnitBadge } from '../../components/ui';
import { InventoryTabs } from './InventoryTabs';
import { CatalogsDialog, ItemDialog, useInventoryCatalogs } from './ItemDialog';
import { CONDITION_TONE, conditionLabel, loanItemsSummary, type Alerts, type Item } from './types';
import './inventory.css';

export function useInventoryAlerts() {
  return useQuery({ queryKey: ['inventory', 'alerts'], queryFn: () => api.get<Alerts>('/inventory/alerts') });
}

/** Alertas: préstamos vencidos y bienes en mal estado. */
export function InventoryAlerts() {
  const alerts = useInventoryAlerts();
  const a = alerts.data;
  if (!a || (!a.overdueLoans.length && !a.badItems.length)) return null;
  return (
    <section className="card inv-alerts mb">
      <div className="card-body">
        <div>
          <h3>
            <AlertTriangle size={16} color="var(--danger)" /> Préstamos vencidos ({a.overdueLoans.length})
          </h3>
          {a.overdueLoans.length ? (
            <ul>
              {a.overdueLoans.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link to={`/inventario/prestamos/${l.id}`}>{l.borrowerLabel ?? 'Sin nombre'}</Link> · {loanItemsSummary(l)}{' '}
                  <span className="muted">· vencía el {formatDate(l.dueDate)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Ninguno.
            </p>
          )}
        </div>
        <div>
          <h3>
            <AlertTriangle size={16} color="var(--warn)" /> Bienes en mal estado o fuera de uso ({a.badItems.length})
          </h3>
          {a.badItems.length ? (
            <ul>
              {a.badItems.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <Link to={`/inventario/bienes/${i.id}`}>{i.name}</Link> <Badge tone={CONDITION_TONE[i.condition]}>{conditionLabel(i.condition)}</Badge>{' '}
                  <span className="muted">{i.unit ? `· ${i.unit.code}` : '· Grupo'}</span>
                </li>
              ))}
              {a.badItems.length > 6 ? <li className="muted">y {a.badItems.length - 6} más (filtrá por estado)</li> : null}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Ninguno.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function ItemsPage() {
  const { can, canAll } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const units = useUnits();
  const catalogs = useInventoryCatalogs();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<{ kind: 'item'; item?: Item } | { kind: 'catalogs' } | null>(null);
  const filters = {
    q: params.get('q') ?? '',
    categoryId: params.get('categoria') ?? '',
    condition: params.get('estado') ?? '',
    unitId: params.get('unidad') ?? '',
    locationId: params.get('ubicacion') ?? '',
  };
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const items = useQuery({ queryKey: ['inventory', 'items', filters], queryFn: () => api.get<Item[]>(`/inventory/items${qs(filters)}`) });
  const canCreate = can('inventory', 'create');
  const total = (items.data ?? []).reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <PageHeader
        title="Inventario"
        sub="Bienes del Grupo y de cada unidad: cantidad, estado, ubicación y préstamos."
        actions={
          <>
            <Button variant="secondary" onClick={() => api.download(`/inventory/items/export${qs(filters)}`, 'inventario.csv').catch(toast.error)}>
              <Download /> Exportar CSV
            </Button>
            {canAll('inventory', 'edit') ? (
              <Button variant="secondary" onClick={() => setDialog({ kind: 'catalogs' })}>
                <Settings2 /> Categorías y ubicaciones
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={() => setDialog({ kind: 'item' })}>
                <Plus /> Nuevo bien
              </Button>
            ) : null}
          </>
        }
      />
      <InventoryTabs value="bienes" />
      <InventoryAlerts />

      <div className="toolbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar bien" value={filters.q} onChange={(e) => set('q', e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Select value={filters.categoryId} onChange={(e) => set('categoria', e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {catalogs.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={filters.condition} onChange={(e) => set('estado', e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ITEM_CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {ITEM_CONDITION_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select value={filters.unitId} onChange={(e) => set('unidad', e.target.value)} aria-label="Dueño">
          <option value="">Grupo y unidades</option>
          <option value="grupo">Solo del Grupo</option>
          {units.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select value={filters.locationId} onChange={(e) => set('ubicacion', e.target.value)} aria-label="Ubicación">
          <option value="">Todas las ubicaciones</option>
          {catalogs.data?.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>

      <Card bodyClass="table-wrap">
        {items.isLoading ? (
          <Loading />
        ) : items.error ? (
          <div className="card-body">
            <ErrorBox error={items.error} />
          </div>
        ) : !items.data?.length ? (
          <Empty icon={<Boxes />}>
            {Object.values(filters).some(Boolean) ? 'No hay bienes con esos filtros.' : 'Todavía no hay bienes cargados.'}
            {canCreate && !Object.values(filters).some(Boolean) ? (
              <div className="mt">
                <Button onClick={() => setDialog({ kind: 'item' })}>
                  <Plus /> Cargar el primero
                </Button>
              </div>
            ) : null}
          </Empty>
        ) : (
          <table className="table inv-items-table">
            <thead>
              <tr>
                <th>Bien</th>
                <th>Categoría</th>
                <th className="num">Cantidad</th>
                <th className="num">Disponibles</th>
                <th>Estado</th>
                <th>Ubicación</th>
                <th>Dueño</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.data.map((i) => (
                <tr key={i.id} className="clickable" onClick={() => navigate(`/inventario/bienes/${i.id}`)}>
                  <td>
                    <strong>{i.name}</strong>
                  </td>
                  <td>{i.category?.name}</td>
                  <td className="num">{i.quantity}</td>
                  <td className={`num ${i.available === 0 ? 'inv-qty-zero' : ''}`} title={i.committed ? `${i.committed} prestados` : undefined}>
                    {i.available}
                  </td>
                  <td>
                    <Badge tone={CONDITION_TONE[i.condition]}>{conditionLabel(i.condition)}</Badge>
                  </td>
                  <td>{i.location?.name ?? <span className="muted">—</span>}</td>
                  <td>{i.unit ? <UnitBadge unit={i.unit} short /> : <span className="muted">Grupo</span>}</td>
                  <td className="num" onClick={(e) => e.stopPropagation()}>
                    {i.canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'item', item: i })} aria-label={`Editar ${i.name}`}>
                        <Pencil />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {items.data?.length ? (
        <p className="muted mt">
          {items.data.length} bienes · {total} unidades en total
        </p>
      ) : null}

      {dialog?.kind === 'item' ? <ItemDialog item={dialog.item} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'catalogs' ? <CatalogsDialog onClose={() => setDialog(null)} /> : null}
    </>
  );
}

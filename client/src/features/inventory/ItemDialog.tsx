import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ITEM_CONDITION_LABELS, ITEM_CONDITIONS, itemSchema, type ItemInput } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import type { Item, ItemCategory, ItemLocation } from './types';

export const useInventoryCatalogs = () =>
  useQuery({
    queryKey: ['inventory', 'catalogs'],
    queryFn: () => api.get<{ categories: ItemCategory[]; locations: ItemLocation[] }>('/inventory/catalogs'),
    staleTime: 60_000,
  });

/** Alta / edición de un bien. */
export function ItemDialog({ item, onClose, onSaved }: { item?: Item; onClose: () => void; onSaved?: (id: string) => void }) {
  const { can, canAll } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const catalogs = useInventoryCatalogs();
  const { register, handleSubmit, formState, setError } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          name: item.name,
          categoryId: item.categoryId,
          quantity: item.quantity,
          condition: item.condition,
          locationId: item.locationId ?? '',
          unitId: item.unitId ?? '',
          photoUrl: item.photoUrl ?? '',
          purchaseDate: item.purchaseDate ?? '',
          purchaseValue: item.purchaseValue === null ? '' : (String(item.purchaseValue) as never),
          notes: item.notes ?? '',
        }
      : { name: '', categoryId: '', quantity: 1, condition: 'bueno', locationId: '', unitId: '', photoUrl: '', purchaseDate: '', purchaseValue: '', notes: '' },
  });
  const e = formState.errors;
  // Dueño: el Grupo (requiere permiso para todo el Grupo) o una unidad en la que se puede cargar
  const canGroup = canAll('inventory', item ? 'edit' : 'create');
  const ownerUnits = (units.data ?? []).filter((u) => can('inventory', 'create', u.id) || u.id === item?.unitId);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = item ? await api.put<{ id: string }>(`/inventory/items/${item.id}`, values) : await api.post<{ id: string }>('/inventory/items', values);
      toast.ok(item ? 'Bien actualizado' : 'Bien cargado');
      await qc.invalidateQueries({ queryKey: ['inventory'] });
      onSaved?.(saved.id);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });

  return (
    <Modal
      title={item ? 'Editar bien' : 'Nuevo bien'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={formState.isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Nombre" required error={e.name?.message} full>
          <Input {...register('name')} invalid={!!e.name} placeholder="Ej: Carpa iglú 4 personas" autoFocus />
        </Field>
        <Field label="Categoría" required error={e.categoryId?.message}>
          <Select {...register('categoryId')} invalid={!!e.categoryId}>
            <option value="">Elegí una categoría</option>
            {catalogs.data?.categories
              .filter((c) => c.active || c.id === item?.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Cantidad" required error={e.quantity?.message}>
          <Input type="number" min={0} {...register('quantity')} invalid={!!e.quantity} />
        </Field>
        <Field label="Estado" error={e.condition?.message}>
          <Select {...register('condition')}>
            {ITEM_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {ITEM_CONDITION_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ubicación" error={e.locationId?.message}>
          <Select {...register('locationId')}>
            <option value="">Sin ubicación</option>
            {catalogs.data?.locations
              .filter((l) => l.active || l.id === item?.locationId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Dueño" error={e.unitId?.message} hint="Del Grupo o de una unidad">
          <Select {...register('unitId')} invalid={!!e.unitId}>
            {canGroup || !item?.unitId ? <option value="">Grupo</option> : null}
            {ownerUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de compra" error={e.purchaseDate?.message}>
          <Input type="date" {...register('purchaseDate')} />
        </Field>
        <Field label="Valor de compra ($)" error={e.purchaseValue?.message}>
          <Input type="number" min={0} step="0.01" {...register('purchaseValue')} invalid={!!e.purchaseValue} />
        </Field>
        <Field label="Foto (enlace)" error={e.photoUrl?.message} hint="Enlace a la foto en el Drive o en Google Fotos" full>
          <Input type="url" placeholder="https://…" {...register('photoUrl')} invalid={!!e.photoUrl} />
        </Field>
        <Field label="Notas" error={e.notes?.message} full>
          <Textarea {...register('notes')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

/** Categorías y ubicaciones del inventario (editables por quien gestiona el inventario del Grupo). */
export function CatalogsDialog({ onClose }: { onClose: () => void }) {
  const catalogs = useInventoryCatalogs();
  return (
    <Modal title="Categorías y ubicaciones" onClose={onClose} wide>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <CatalogList kind="categories" title="Categorías" rows={catalogs.data?.categories ?? []} />
        <CatalogList kind="locations" title="Ubicaciones" rows={catalogs.data?.locations ?? []} />
      </div>
    </Modal>
  );
}

function CatalogList({ kind, title, rows }: { kind: 'categories' | 'locations'; title: string; rows: { id: string; name: string; active: boolean }[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const save = async (id: string | null, name: string, active: boolean) => {
    if (!name.trim()) return;
    try {
      if (id) await api.put(`/inventory/${kind}/${id}`, { name, active });
      else await api.post(`/inventory/${kind}`, { name, active: true, sortOrder: rows.length + 1 });
      await qc.invalidateQueries({ queryKey: ['inventory', 'catalogs'] });
      toast.ok('Guardado');
      if (!id) setNewName('');
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {rows.map((r) => (
        <CatalogRow key={r.id} row={r} onSave={(name, active) => save(r.id, name, active)} />
      ))}
      <div className="catalog-row">
        <Input placeholder={kind === 'categories' ? 'Nueva categoría' : 'Nueva ubicación'} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <span />
        <Button size="sm" disabled={!newName.trim()} onClick={() => save(null, newName, true)}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

function CatalogRow({ row, onSave }: { row: { id: string; name: string; active: boolean }; onSave: (name: string, active: boolean) => void }) {
  const [name, setName] = useState(row.name);
  const [active, setActive] = useState(row.active);
  const dirty = name !== row.name || active !== row.active;
  return (
    <div className="catalog-row">
      <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre" />
      <Checkbox label="Activa" checked={active} onChange={(e) => setActive(e.target.checked)} />
      <Button size="sm" variant="secondary" disabled={!dirty} onClick={() => onSave(name, active)}>
        Guardar
      </Button>
    </div>
  );
}

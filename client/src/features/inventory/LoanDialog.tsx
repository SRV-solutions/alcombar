import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { formatDate, ITEM_CONDITION_LABELS, ITEM_CONDITIONS, loanSchema, todayIso, type ItemCondition, type LoanInput } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import type { SheetSummary } from '../program/types';
import { useAdults, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import type { Item, Loan } from './types';

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Pedido de préstamo (o edición mientras está pedido). */
export function LoanDialog({
  loan,
  initialItemId,
  defaults,
  onClose,
  onSaved,
}: {
  loan?: Loan;
  initialItemId?: string;
  /** Datos ya completados al pedir desde una ficha o un campamento. */
  defaults?: Partial<LoanInput>;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const adults = useAdults();
  const units = useUnits();
  const items = useQuery({ queryKey: ['inventory', 'items', 'todos'], queryFn: () => api.get<Item[]>('/inventory/items') });
  const [otherPerson, setOtherPerson] = useState(!!loan && !loan.borrowerAdultId);

  const { register, control, handleSubmit, formState, setError, setValue, getValues, watch } = useForm<LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: loan
      ? {
          borrowerAdultId: loan.borrowerAdultId ?? '',
          borrowerName: loan.borrowerName ?? '',
          purpose: loan.purpose,
          unitId: loan.unitId ?? '',
          activitySheetId: loan.activitySheetId ?? '',
          campId: loan.campId ?? '',
          outDate: loan.outDate,
          dueDate: loan.dueDate,
          notes: loan.notes ?? '',
          items: loan.loanItems.map((li) => ({ itemId: li.itemId, quantity: li.quantity })),
        }
      : {
          borrowerAdultId: '',
          borrowerName: '',
          purpose: '',
          unitId: '',
          activitySheetId: '',
          campId: '',
          outDate: todayIso(),
          dueDate: plusDays(7),
          notes: '',
          items: [{ itemId: initialItemId ?? '', quantity: 1 }],
          ...defaults,
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const e = formState.errors;
  const chosen = watch('items');
  // Vincular con una ficha de actividad de la unidad (solo si quien pide puede ver las fichas)
  const unitId = watch('unitId');
  const canSheets = can('activities', 'view');
  const sheets = useQuery({
    queryKey: ['program', 'sheets', 'para-prestamo', unitId],
    queryFn: () => api.get<SheetSummary[]>(`/program/sheets?unitId=${unitId}`),
    enabled: canSheets && !!unitId,
  });
  // Las opciones de los selects llegan después de montarlos: re-aplicar los valores para que se vean bien
  useEffect(() => {
    const v = getValues();
    setValue('unitId', v.unitId);
    setValue('borrowerAdultId', v.borrowerAdultId);
    setValue('activitySheetId', v.activitySheetId);
    v.items.forEach((it, i) => setValue(`items.${i}.itemId`, it.itemId));
  }, [units.data, adults.data, items.data, sheets.data, getValues, setValue]);
  // Lo que ya tiene este préstamo no cuenta como ocupado
  const own = new Map((loan?.status === 'autorizado' || loan?.status === 'entregado' ? loan.loanItems : []).map((li) => [li.itemId, li.quantity]));
  const availableOf = (it: Item) => it.available + (own.get(it.id) ?? 0);
  const itemsError = (e.items as { message?: string } | undefined)?.message ?? e.items?.root?.message;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = otherPerson ? { ...values, borrowerAdultId: '' } : { ...values, borrowerName: '' };
      const saved = loan ? await api.put<Loan>(`/inventory/loans/${loan.id}`, payload) : await api.post<Loan>('/inventory/loans', payload);
      toast.ok(loan ? 'Préstamo actualizado' : 'Préstamo pedido: falta que lo autorice Intendencia');
      await qc.invalidateQueries({ queryKey: ['inventory'] });
      onSaved?.(saved.id);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });

  return (
    <Modal
      title={loan ? 'Editar préstamo' : 'Nuevo préstamo'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={formState.isSubmitting}>
            {loan ? 'Guardar' : 'Pedir préstamo'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Quién lo retira" required error={e.borrowerName?.message ?? e.borrowerAdultId?.message} full>
          {otherPerson ? (
            <Input {...register('borrowerName')} placeholder="Nombre y apellido" invalid={!!e.borrowerName} />
          ) : (
            <Select {...register('borrowerAdultId')} invalid={!!e.borrowerName}>
              <option value="">Elegí un adulto</option>
              {(adults.data ?? [])
                .filter((a) => a.status !== 'baja')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.lastName}, {a.firstName}
                    {a.totem ? ` («${a.totem}»)` : ''}
                  </option>
                ))}
            </Select>
          )}
          <Checkbox
            label="Es otra persona (no está en Adultos)"
            checked={otherPerson}
            onChange={(ev) => {
              setOtherPerson(ev.target.checked);
              setValue(ev.target.checked ? 'borrowerAdultId' : 'borrowerName', '');
            }}
          />
        </Field>
        <Field label="Para qué" required error={e.purpose?.message} full hint="Actividad, campamento, salida…">
          <Input {...register('purpose')} invalid={!!e.purpose} placeholder="Ej: Campamento de patrullas en Pilar" />
        </Field>
        <Field label="Unidad que lo usa" error={e.unitId?.message}>
          <Select {...register('unitId', { onChange: () => setValue('activitySheetId', '') })}>
            <option value="">Grupo / sin unidad</option>
            {units.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        {canSheets ? (
          <Field label="Ficha de actividad" error={e.activitySheetId?.message} hint={unitId ? 'Opcional: la actividad para la que se pide' : 'Elegí primero la unidad'}>
            <Select
              {...register('activitySheetId', {
                onChange: (ev) => {
                  const s = sheets.data?.find((x) => x.id === ev.target.value);
                  if (s && !getValues('purpose').trim()) setValue('purpose', s.name, { shouldValidate: true });
                },
              })}
              disabled={!unitId}
            >
              <option value="">Sin ficha</option>
              {(sheets.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                  {s.date ? ` · ${formatDate(s.date)}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <span />
        )}
        <Field label="Retiro" required error={e.outDate?.message}>
          <Input type="date" {...register('outDate')} invalid={!!e.outDate} />
        </Field>
        <Field label="Devolución prevista" required error={e.dueDate?.message}>
          <Input type="date" {...register('dueDate')} invalid={!!e.dueDate} />
        </Field>

        <Field label="Bienes" required error={itemsError} full>
          <div className="loan-items-editor">
            {fields.map((f, idx) => {
              const selected = items.data?.find((it) => it.id === chosen?.[idx]?.itemId);
              return (
                <div key={f.id} className="loan-item-row">
                  <Select {...register(`items.${idx}.itemId` as const)} aria-label={`Bien ${idx + 1}`}>
                    <option value="">Elegí un bien</option>
                    {(items.data ?? []).map((it) => (
                      <option key={it.id} value={it.id} disabled={availableOf(it) === 0 && it.id !== chosen?.[idx]?.itemId}>
                        {it.name} — {availableOf(it)} disponible{availableOf(it) === 1 ? '' : 's'}
                        {it.unit ? ` (${it.unit.code})` : ''}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={selected ? availableOf(selected) : undefined}
                    {...register(`items.${idx}.quantity` as const)}
                    aria-label={`Cantidad del bien ${idx + 1}`}
                  />
                  <Button variant="ghost" size="sm" onClick={() => remove(idx)} disabled={fields.length === 1} aria-label="Quitar">
                    <X />
                  </Button>
                </div>
              );
            })}
            <div>
              <Button variant="secondary" size="sm" onClick={() => append({ itemId: '', quantity: 1 })}>
                <Plus /> Agregar bien
              </Button>
            </div>
          </div>
        </Field>
        <Field label="Notas" error={e.notes?.message} full>
          <Textarea {...register('notes')} style={{ minHeight: 50 }} />
        </Field>
      </form>
    </Modal>
  );
}

/** Registrar la devolución: estado de cada bien al volver. */
export function ReturnDialog({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [returnedAt, setReturnedAt] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [update, setUpdate] = useState(true);
  const [rows, setRows] = useState(
    loan.loanItems.map((li) => ({ loanItemId: li.id, name: li.item?.name ?? 'Bien', quantity: li.quantity, returnCondition: (li.item?.condition ?? 'bueno') as ItemCondition, returnNotes: '' })),
  );
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/inventory/loans/${loan.id}/return`, {
        returnedAt,
        returnNotes: notes,
        updateItemCondition: update,
        items: rows.map(({ loanItemId, returnCondition, returnNotes }) => ({ loanItemId, returnCondition, returnNotes })),
      });
      toast.ok('Devolución registrada');
      await qc.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Registrar devolución"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Registrar devolución
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Fecha de devolución" required>
            <Input type="date" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
          </Field>
        </div>
        <div>
          {rows.map((r, idx) => (
            <div key={r.loanItemId} className="loan-return-row">
              <span>
                <strong>{r.quantity} ×</strong> {r.name}
              </span>
              <Select
                value={r.returnCondition}
                aria-label={`Estado al devolver: ${r.name}`}
                onChange={(e) => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, returnCondition: e.target.value as ItemCondition } : x)))}
              >
                {ITEM_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {ITEM_CONDITION_LABELS[c]}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Notas (faltante, roto…)"
                value={r.returnNotes}
                onChange={(e) => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, returnNotes: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
        <Checkbox label="Actualizar el estado de cada bien con el estado en que volvió" checked={update} onChange={(e) => setUpdate(e.target.checked)} />
        <Field label="Notas de la devolución">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 50 }} />
        </Field>
      </div>
    </Modal>
  );
}


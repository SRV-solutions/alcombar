import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CAMP_RUBRO_LABELS,
  CAMP_RUBROS,
  formatMoney,
  MOVEMENT_KIND_LABELS,
  todayIso,
  transactionSchema,
  type TransactionInput,
} from '@shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, UnitBadge } from '../../components/ui';
import type { AccountRow, CategoryRow, MovementRow, UnitLite } from './types';
import './accounting.css';

export const useAccounts = (enabled = true) =>
  useQuery({ queryKey: ['acc-accounts'], queryFn: () => api.get<AccountRow[]>('/accounting/accounts'), enabled, staleTime: 30_000 });
export const useCategories = () => useQuery({ queryKey: ['acc-categories'], queryFn: () => api.get<CategoryRow[]>('/accounting/categories'), staleTime: 60_000 });

/** Cuentas agrupadas por dueña: primero las del Grupo y después las de cada unidad. */
export function groupAccounts(accounts: AccountRow[]) {
  const map = new Map<string, { key: string; label: string; unit: UnitLite | null; managers: string[]; accounts: AccountRow[] }>();
  for (const a of accounts) {
    const key = a.unitId ?? 'grupo';
    const g = map.get(key) ?? { key, label: a.unit ? a.unit.name : 'Grupo', unit: a.unit ?? null, managers: a.managers ?? [], accounts: [] };
    g.accounts.push(a);
    map.set(key, g);
  }
  return [...map.values()].sort((x, y) => Number(!!x.unit) - Number(!!y.unit) || (x.unit?.code ?? x.label).localeCompare(y.unit?.code ?? y.label));
}

/** <option> de cuentas; si hay del Grupo y de unidades, separadas por dueña. */
export function AccountOptions({ accounts }: { accounts: AccountRow[] }) {
  const groups = groupAccounts(accounts);
  const opt = (a: AccountRow) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  );
  if (groups.length < 2) return <>{accounts.map(opt)}</>;
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.key} label={g.unit ? `Unidad: ${g.label}` : 'Grupo'}>
          {g.accounts.map(opt)}
        </optgroup>
      ))}
    </>
  );
}

/** De quién es la cuenta: el Grupo o la unidad. */
export function AccountOwner({ unit }: { unit?: UnitLite | null }) {
  return unit ? <UnitBadge unit={unit} short /> : <span className="muted">Grupo</span>;
}

/** Monto con signo y color: ingresos en verde, egresos en rojo. */
export function Money({ value, kind, strong }: { value: number; kind?: 'ingreso' | 'egreso'; strong?: boolean }) {
  const cls = kind === 'ingreso' ? 'money-in' : kind === 'egreso' ? 'money-out' : '';
  return (
    <span className={`money ${cls} ${strong ? 'money-strong' : ''}`}>
      {kind === 'egreso' ? '− ' : ''}
      {formatMoney(value)}
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'ok' | 'danger' | 'warn' }) {
  return (
    <div className={`acc-stat ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/** Invalida todo lo que depende de los movimientos. */
export function useRefreshTreasury() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['acc-movements', 'acc-summary', 'acc-accounts', 'acc-budget', 'acc-reports', 'event', 'events', 'camp', 'camps', 'fees-member', 'fees-debtors', 'dashboard'].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    );
}

/**
 * Alta / edición de un movimiento. Se usa desde Contabilidad y desde Eventos y Campamentos
 * (con el evento o campamento ya elegido).
 */
export function MovementDialog({
  movement,
  defaults,
  lockLink,
  onClose,
}: {
  movement?: MovementRow;
  defaults?: Partial<TransactionInput>;
  /** Evento/campamento fijo (no se puede cambiar desde el diálogo). */
  lockLink?: { label: string };
  onClose: () => void;
}) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const { can } = useAuth();
  const accounts = useAccounts();
  const categories = useCategories();
  // Solo las cuentas que puede mover: todas (Grupo) o las de su unidad
  const usable = (accounts.data ?? []).filter((a) => (a.active || a.id === movement?.accountId) && can('accounting', movement ? 'edit' : 'create', a.unitId));
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: movement
      ? {
          date: movement.date,
          kind: movement.kind,
          accountId: movement.accountId,
          categoryId: movement.categoryId ?? '',
          amount: movement.amount,
          description: movement.description ?? '',
          receiptUrl: movement.receiptUrl ?? '',
          eventId: movement.eventId ?? '',
          campId: movement.campId ?? '',
          campRubro: (movement.campRubro as TransactionInput['campRubro']) ?? '',
        }
      : { date: todayIso(), kind: 'egreso', accountId: '', categoryId: '', amount: '' as unknown as number, description: '', receiptUrl: '', eventId: '', campId: '', campRubro: '', ...defaults },
  });
  const { register, handleSubmit, watch, setValue, formState, setError } = form;
  const e = formState.errors;
  const kind = watch('kind');
  const campId = watch('campId');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (lockLink) return;
    api.get<{ id: string; name: string }[]>('/events').then(setEvents).catch(() => setEvents([]));
    api.get<{ id: string; name: string }[]>('/camps').then(setCamps).catch(() => setCamps([]));
  }, [lockLink]);
  // Con una sola cuenta posible (por ejemplo, la caja de la unidad), queda elegida
  useEffect(() => {
    if (!movement && usable.length === 1 && !watch('accountId')) setValue('accountId', usable[0].id);
  }, [accounts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si la categoría no corresponde al tipo, se limpia
  useEffect(() => {
    const cat = categories.data?.find((c) => c.id === watch('categoryId'));
    if (cat && cat.kind !== kind) setValue('categoryId', '');
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (movement) await api.put(`/accounting/movements/${movement.id}`, values);
      else await api.post('/accounting/movements', values);
      toast.ok(movement ? 'Movimiento actualizado' : 'Movimiento registrado');
      await refresh();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });

  const cats = (categories.data ?? []).filter((c) => c.kind === kind && (c.active || c.id === movement?.categoryId));
  return (
    <Modal
      title={movement ? 'Editar movimiento' : `Registrar ${kind === 'ingreso' ? 'ingreso' : 'gasto'}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        {lockLink ? <div className="alert alert-info full">{lockLink.label}</div> : null}
        <Field label="Tipo" required>
          <Select {...register('kind')}>
            {(['egreso', 'ingreso'] as const).map((k) => (
              <option key={k} value={k}>
                {MOVEMENT_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" required error={e.date?.message}>
          <Input type="date" {...register('date')} invalid={!!e.date} />
        </Field>
        <Field label="Monto" required error={e.amount?.message}>
          <Input type="number" step="0.01" min="0" inputMode="decimal" {...register('amount')} invalid={!!e.amount} />
        </Field>
        <Field label="Cuenta" required error={e.accountId?.message}>
          <Select {...register('accountId')} invalid={!!e.accountId}>
            <option value="">Elegí la cuenta</option>
            <AccountOptions accounts={usable} />
          </Select>
        </Field>
        <Field label="Categoría" required error={e.categoryId?.message} full>
          <Select {...register('categoryId')} invalid={!!e.categoryId}>
            <option value="">Elegí la categoría</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {!lockLink ? (
          <>
            <Field label="Evento (opcional)">
              <Select {...register('eventId')}>
                <option value="">—</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Campamento (opcional)">
              <Select {...register('campId')}>
                <option value="">—</option>
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
        {campId && kind === 'egreso' ? (
          <Field label="Rubro del campamento">
            <Select {...register('campRubro')}>
              {CAMP_RUBROS.map((r) => (
                <option key={r} value={r}>
                  {CAMP_RUBRO_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Descripción" full error={e.description?.message}>
          <Input {...register('description')} placeholder="Ej: compra de leña para el fogón" />
        </Field>
        <Field label="Comprobante (enlace)" full error={e.receiptUrl?.message} hint="Enlace a la foto o PDF del comprobante en el Drive">
          <Input type="url" placeholder="https://drive.google.com/…" {...register('receiptUrl')} invalid={!!e.receiptUrl} />
        </Field>
      </form>
    </Modal>
  );
}

/** Tabla de movimientos (simple) para eventos y campamentos. */
export function MovementsMini({ rows }: { rows: MovementRow[] }) {
  if (!rows.length) return <p className="muted">Todavía no hay movimientos vinculados.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Cuenta</th>
            <th className="num">Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className={m.voided ? 'voided' : ''}>
              <td className="nowrap">{m.date.split('-').reverse().join('/')}</td>
              <td className="desc">
                {m.description ?? '—'}
                {m.campRubro ? <span className="muted"> · {CAMP_RUBRO_LABELS[m.campRubro as keyof typeof CAMP_RUBRO_LABELS] ?? m.campRubro}</span> : null}
              </td>
              <td>{m.category?.name ?? '—'}</td>
              <td>{m.account?.name ?? '—'}</td>
              <td className="num">
                <Money value={m.amount} kind={m.kind} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

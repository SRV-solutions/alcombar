import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Ban, HandCoins, Pencil, Percent, Plus, Receipt as ReceiptIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CHARGE_CONCEPT_LABELS,
  CHARGE_STATUS_LABELS,
  chargeSchema,
  feeSettingSchema,
  formatDate,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  paymentSchema,
  round2,
  todayIso,
  type PaymentInput,
} from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, Select, type Tone } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { AccountOptions, Money, Stat, useAccounts, useRefreshTreasury } from './common';
import type { ChargeRow, MemberAccount } from './types';

const STATUS_TONE: Record<ChargeRow['status'], Tone> = { pendiente: 'warn', parcial: 'info', pagado: 'ok', anulado: 'neutral' };

/** Ficha del protagonista → pestaña Pagos (cuenta corriente). */
export function MemberPaymentsTab({ memberId }: { memberId: string; unitId: string | null }) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const q = useQuery({ queryKey: ['fees-member', memberId], queryFn: () => api.get<MemberAccount>(`/accounting/fees/members/${memberId}`) });
  const [dialog, setDialog] = useState<'pay' | 'charge' | 'beca' | { edit: ChargeRow } | null>(null);
  const [last, setLast] = useState<{ id: string; receiptNumber: string } | null>(null);
  const [showVoided, setShowVoided] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const a = q.data!;
  const today = todayIso();
  const charges = a.charges.filter((c) => showVoided || c.status !== 'anulado');
  const open = a.charges.filter((c) => c.status === 'pendiente' || c.status === 'parcial');

  return (
    <div className="stack" id="member-payments">
      {last ? (
        <div className="alert alert-ok row between">
          <span>
            Pago registrado. Recibo <strong>{last.receiptNumber}</strong>.
          </span>
          <Link to={`/contabilidad/recibos/${last.id}`} className="btn btn-secondary btn-sm">
            <ReceiptIcon /> Ver e imprimir recibo
          </Link>
        </div>
      ) : null}
      <div className="acc-stats" style={{ marginBottom: 0 }}>
        <Stat label="Saldo pendiente" value={formatMoney(a.totals.balance)} tone={a.totals.balance > 0 ? 'warn' : 'ok'} hint={`Cargado ${formatMoney(a.totals.charged)}`} />
        <Stat label="Vencido" value={formatMoney(a.totals.overdue)} tone={a.totals.overdue > 0 ? 'danger' : 'ok'} />
        <Stat label="Pagado" value={formatMoney(a.totals.paid)} hint={a.setting.discountPct ? `Beca ${a.setting.discountPct}% en la cuota` : undefined} />
      </div>
      <div className="row">
        {a.canCreate ? (
          <>
            <Button onClick={() => setDialog('pay')} disabled={!open.length} id="btn-register-payment">
              <HandCoins /> Registrar pago
            </Button>
            <Button variant="secondary" onClick={() => setDialog('charge')}>
              <Plus /> Nuevo cargo
            </Button>
          </>
        ) : null}
        {a.canEdit ? (
          <Button variant="secondary" onClick={() => setDialog('beca')}>
            <Percent /> Beca / descuento{a.setting.discountPct ? ` (${a.setting.discountPct}%)` : ''}
          </Button>
        ) : null}
      </div>

      <Card
        title="Cargos"
        actions={
          <label className="row muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} /> Ver anulados
          </label>
        }
        bodyClass="table-wrap"
      >
        {!charges.length ? (
          <Empty>No tiene cargos. Las cuotas se generan desde Cuotas y pagos → Generar cuotas.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Vence</th>
                <th className="num">Importe</th>
                <th className="num">Pagado</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => {
                const overdue = (c.status === 'pendiente' || c.status === 'parcial') && !!c.dueDate && c.dueDate < today;
                return (
                  <tr key={c.id} className={c.status === 'anulado' ? 'voided' : overdue ? 'row-warn' : ''}>
                    <td className="desc">
                      {c.description ?? CHARGE_CONCEPT_LABELS[c.concept]}
                      {c.camp ? (
                        <div className="muted">
                          <Link to={`/campamentos/${c.camp.id}`}>{c.camp.name}</Link>
                        </div>
                      ) : null}
                    </td>
                    <td className="nowrap">
                      {formatDate(c.dueDate)} {overdue ? <Badge tone="danger">Vencido</Badge> : null}
                    </td>
                    <td className="num">
                      <Money value={c.amount} />
                    </td>
                    <td className="num">
                      <Money value={c.paidAmount} />
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[c.status]}>{CHARGE_STATUS_LABELS[c.status]}</Badge>
                    </td>
                    <td className="num nowrap">
                      {a.canEdit && c.status !== 'anulado' && c.status !== 'pagado' ? (
                        <Button variant="ghost" size="sm" aria-label="Editar cargo" onClick={() => setDialog({ edit: c })}>
                          <Pencil />
                        </Button>
                      ) : null}
                      {a.canEdit && c.status !== 'anulado' && c.paidAmount === 0 ? (
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          title="Anular cargo"
                          message={`¿Anular «${c.description ?? CHARGE_CONCEPT_LABELS[c.concept]}»? Deja de figurar como deuda.`}
                          confirmLabel="Anular cargo"
                          onConfirm={async () => {
                            try {
                              await api.post(`/accounting/fees/charges/${c.id}/void`, {});
                              toast.ok('Cargo anulado');
                              await refresh();
                            } catch (e) {
                              toast.error(e);
                            }
                          }}
                        >
                          <Ban />
                        </ConfirmButton>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Pagos y recibos" bodyClass="table-wrap">
        {!a.payments.length ? (
          <Empty>Todavía no registró pagos.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Recibo</th>
                <th>Forma de pago</th>
                <th>Imputado a</th>
                <th className="num">Monto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {a.payments.map((p) => (
                <tr key={p.id} className={p.voided ? 'voided' : ''}>
                  <td className="nowrap">{formatDate(p.date)}</td>
                  <td className="nowrap">
                    <Link to={`/contabilidad/recibos/${p.id}`}>{p.receiptNumber}</Link> {p.voided ? <Badge tone="danger">Anulado</Badge> : null}
                  </td>
                  <td>
                    {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
                    {p.account ? <div className="muted">{p.account.name}</div> : null}
                  </td>
                  <td className="desc muted">{p.allocations?.map((x) => x.charge?.description ?? CHARGE_CONCEPT_LABELS[(x.charge?.concept ?? 'otro') as ChargeRow['concept']]).join(', ')}</td>
                  <td className="num">
                    <Money value={p.amount} strong />
                  </td>
                  <td className="num">
                    {a.canDelete && !p.voided ? (
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        title={`Anular el pago ${p.receiptNumber}`}
                        message="Los cargos vuelven a quedar pendientes y en Contabilidad se registra la anulación del ingreso con fecha de hoy. El recibo queda marcado como ANULADO."
                        confirmLabel="Anular pago"
                        onConfirm={async () => {
                          try {
                            await api.post(`/accounting/fees/payments/${p.id}/void`, {});
                            toast.ok('Pago anulado');
                            await refresh();
                          } catch (e) {
                            toast.error(e);
                          }
                        }}
                      >
                        <Ban /> Anular
                      </ConfirmButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {dialog === 'pay' ? (
        <PaymentDialog
          memberId={memberId}
          open={open}
          payerSuggestion={a.payerSuggestion}
          onClose={() => setDialog(null)}
          onDone={(r) => {
            setLast(r);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'charge' ? <ChargeDialog memberId={memberId} onClose={() => setDialog(null)} /> : null}
      {dialog && typeof dialog === 'object' ? <ChargeDialog memberId={memberId} charge={dialog.edit} onClose={() => setDialog(null)} /> : null}
      {dialog === 'beca' ? <ScholarshipDialog memberId={memberId} current={a.setting} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

const METHOD_ACCOUNT: Record<string, string> = { efectivo: 'efectivo', transferencia: 'banco', mercadopago: 'billetera' };

function PaymentDialog({
  memberId,
  open,
  payerSuggestion,
  onClose,
  onDone,
}: {
  memberId: string;
  open: ChargeRow[];
  payerSuggestion: string | null;
  onClose: () => void;
  onDone: (r: { id: string; receiptNumber: string }) => void;
}) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const accounts = useAccounts();
  const [selected, setSelected] = useState<string[]>([]);
  const pendingOf = (list: ChargeRow[]) => round2(list.reduce((s, c) => s + (c.amount - c.paidAmount), 0));
  const target = useMemo(() => (selected.length ? open.filter((c) => selected.includes(c.id)) : open), [open, selected]);
  const { register, handleSubmit, formState, setError, setValue, watch } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: todayIso(), amount: pendingOf(open), method: 'efectivo', accountId: '', chargeIds: [], payerName: payerSuggestion ?? '', notes: '' },
  });
  const e = formState.errors;
  const method = watch('method');
  const accountId = watch('accountId');
  const { can } = useAuth();
  const active = accounts.data?.filter((x) => x.active && (!x.unitId || can('accounting', 'create', x.unitId))) ?? [];
  // Cuenta sugerida según la forma de pago
  useEffect(() => {
    if (accountId || !active.length) return;
    const sug = active.find((x) => x.type === METHOD_ACCOUNT[method ?? 'efectivo']) ?? active[0];
    setValue('accountId', sug.id);
  }, [accounts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setValue('amount', pendingOf(next.length ? open.filter((c) => next.includes(c.id)) : open));
  };
  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await api.post<{ id: string; receiptNumber: string }>(`/accounting/fees/members/${memberId}/payments`, { ...v, chargeIds: selected });
      toast.ok(`Pago registrado · recibo ${r.receiptNumber}`);
      await refresh();
      onDone(r);
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title="Registrar pago"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Registrar pago y generar recibo
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate id="payment-form">
        <div className="full">
          <div className="muted" style={{ marginBottom: 6 }}>
            Cargos a cancelar (si no elegís ninguno, el pago se imputa a los más viejos primero):
          </div>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {open.map((c) => (
                  <tr key={c.id}>
                    <td style={{ width: 30 }}>
                      <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} aria-label={c.description ?? c.concept} />
                    </td>
                    <td>
                      {c.description ?? CHARGE_CONCEPT_LABELS[c.concept]}
                      <div className="muted">Vence {formatDate(c.dueDate)}</div>
                    </td>
                    <td className="num">
                      <Money value={round2(c.amount - c.paidAmount)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Pendiente de lo elegido: <strong>{formatMoney(pendingOf(target))}</strong>. Se puede pagar una parte (queda «Parcial»).
          </div>
        </div>
        <Field label="Fecha" required error={e.date?.message}>
          <Input type="date" {...register('date')} invalid={!!e.date} />
        </Field>
        <Field label="Monto" required error={e.amount?.message}>
          <Input type="number" step="0.01" min="0" inputMode="decimal" {...register('amount')} invalid={!!e.amount} />
        </Field>
        <Field label="Forma de pago" required>
          <Select
            {...register('method', {
              onChange: (ev) => {
                const sug = active.find((x) => x.type === METHOD_ACCOUNT[ev.target.value]);
                if (sug) setValue('accountId', sug.id);
              },
            })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ingresa en la cuenta" required error={e.accountId?.message}>
          <Select {...register('accountId')} invalid={!!e.accountId}>
            <option value="">Elegí la cuenta</option>
            <AccountOptions accounts={active} />
          </Select>
        </Field>
        <Field label="Pagó (nombre para el recibo)" full error={e.payerName?.message}>
          <Input {...register('payerName')} placeholder="Ej: madre, padre o responsable" />
        </Field>
        <Field label="Observaciones" full>
          <Input {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

function ChargeDialog({ memberId, charge, onClose }: { memberId: string; charge?: ChargeRow; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  type F = z.input<typeof chargeSchema>;
  const year = new Date().getFullYear();
  const { register, handleSubmit, formState, setError, watch } = useForm<F>({
    resolver: zodResolver(charge ? chargeSchema.partial({ concept: true }) : chargeSchema),
    defaultValues: charge
      ? { concept: charge.concept, period: charge.period ?? '', description: charge.description ?? '', amount: charge.amount, dueDate: charge.dueDate ?? '' }
      : { concept: 'otro', period: '', description: '', amount: '' as unknown as number, dueDate: todayIso() },
  });
  const e = formState.errors;
  const concept = watch('concept');
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (charge) await api.put(`/accounting/fees/charges/${charge.id}`, { amount: v.amount, description: v.description, dueDate: v.dueDate });
      else await api.post(`/accounting/fees/members/${memberId}/charges`, v);
      toast.ok(charge ? 'Cargo actualizado' : 'Cargo agregado');
      await refresh();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={charge ? 'Editar cargo' : 'Nuevo cargo'}
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
        {!charge ? (
          <>
            <Field label="Concepto" required>
              <Select {...register('concept')}>
                <option value="otro">{CHARGE_CONCEPT_LABELS.otro}</option>
                <option value="cuota">{CHARGE_CONCEPT_LABELS.cuota}</option>
                <option value="afiliacion">{CHARGE_CONCEPT_LABELS.afiliacion}</option>
              </Select>
            </Field>
            {concept === 'cuota' || concept === 'afiliacion' ? (
              <Field label="Período" error={e.period?.message} hint={concept === 'cuota' ? `Formato ${year}-03 (año-mes)` : `Año, ej: ${year}`}>
                <Input {...register('period')} placeholder={concept === 'cuota' ? `${year}-03` : String(year)} />
              </Field>
            ) : (
              <div />
            )}
          </>
        ) : null}
        <Field label="Descripción" full error={e.description?.message}>
          <Input {...register('description')} placeholder="Ej: remera del Grupo" />
        </Field>
        <Field label="Importe" required error={e.amount?.message}>
          <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!e.amount} />
        </Field>
        <Field label="Vencimiento" error={e.dueDate?.message}>
          <Input type="date" {...register('dueDate')} />
        </Field>
      </form>
    </Modal>
  );
}

function ScholarshipDialog({ memberId, current, onClose }: { memberId: string; current: { discountPct: number; note: string | null }; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  type F = z.input<typeof feeSettingSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(feeSettingSchema),
    defaultValues: { discountPct: current.discountPct, note: current.note ?? '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.put(`/accounting/fees/members/${memberId}/setting`, v);
      toast.ok('Beca guardada');
      await refresh();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title="Beca / descuento en la cuota"
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
        <Field label="Descuento (%)" required error={e.discountPct?.message} hint="100 = beca completa (no se le generan cuotas)">
          <Input type="number" min="0" max="100" {...register('discountPct')} invalid={!!e.discountPct} />
        </Field>
        <Field label="Motivo" error={e.note?.message}>
          <Input {...register('note')} placeholder="Ej: decisión del Consejo de Grupo" />
        </Field>
        <p className="muted full" style={{ margin: 0 }}>
          Se aplica a las cuotas que se generen a partir de ahora (no cambia las ya generadas). No afecta la afiliación ni los campamentos.
        </p>
      </form>
    </Modal>
  );
}

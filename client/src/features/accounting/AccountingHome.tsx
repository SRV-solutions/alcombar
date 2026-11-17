import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Ban, Download, Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  accountSchema,
  accountTransferSchema,
  categorySchema,
  formatDate,
  formatMoney,
  MONTH_NAMES,
  MOVEMENT_KIND_LABELS,
  todayIso,
  type AccountInput,
} from '@shared';
import { z } from 'zod';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Checkbox, ConfirmButton, Empty, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Select, Tabs } from '../../components/ui';
import { Money, MovementDialog, Stat, useAccounts, useCategories, useRefreshTreasury } from './common';
import type { AccountRow, CategoryRow, MovementRow } from './types';

type Tab = 'resumen' | 'movimientos' | 'presupuesto' | 'reportes' | 'config';

export function AccountingHome() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'resumen';
  const setTab = (t: Tab) => setParams(t === 'resumen' ? {} : { tab: t }, { replace: true });
  return (
    <>
      <PageHeader
        title="Contabilidad"
        sub="Caja y movimientos del Grupo, presupuesto anual, cierres mensuales y reportes."
        actions={
          <LinkButton to="/contabilidad/cuotas" variant="secondary">
            Cuotas y pagos
          </LinkButton>
        }
      />
      <Tabs
        tabs={[
          { key: 'resumen', label: 'Resumen' },
          { key: 'movimientos', label: 'Movimientos' },
          { key: 'presupuesto', label: 'Presupuesto' },
          { key: 'reportes', label: 'Reportes' },
          { key: 'config', label: 'Cuentas y cierres' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'resumen' ? <SummaryTab /> : null}
      {tab === 'movimientos' ? <MovementsTab /> : null}
      {tab === 'presupuesto' ? <BudgetTab /> : null}
      {tab === 'reportes' ? <ReportsTab /> : null}
      {tab === 'config' ? <ConfigTab /> : null}
    </>
  );
}

// ======================= RESUMEN =======================
interface Summary {
  year: number;
  accounts: AccountRow[];
  byMonth: { month: number; ingresos: number; egresos: number; resultado: number; closed: boolean }[];
  totals: { ingresos: number; egresos: number };
  recent: MovementRow[];
  budget: { status: string } | null;
}

function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const current = new Date().getFullYear();
  return (
    <Select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Año" style={{ width: 'auto' }}>
      {Array.from({ length: 6 }, (_, i) => current + 1 - i).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </Select>
  );
}

function SummaryTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const q = useQuery({ queryKey: ['acc-summary', year], queryFn: () => api.get<Summary>(`/accounting/summary${qs({ year })}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const s = q.data!;
  const total = s.accounts.filter((a) => a.active).reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const result = s.totals.ingresos - s.totals.egresos;
  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <YearSelect value={year} onChange={setYear} />
        <span className="muted">Presupuesto {year}: {s.budget ? (s.budget.status === 'aprobado' ? 'aprobado' : 'en borrador') : 'sin cargar'}</span>
      </div>
      <div className="acc-stats">
        <Stat label="Saldo total hoy" value={formatMoney(total)} hint={`${s.accounts.filter((a) => a.active).length} cuentas`} />
        <Stat label={`Ingresos ${year}`} value={formatMoney(s.totals.ingresos)} tone="ok" />
        <Stat label={`Egresos ${year}`} value={formatMoney(s.totals.egresos)} tone="danger" />
        <Stat label={`Resultado ${year}`} value={formatMoney(result)} tone={result >= 0 ? 'ok' : 'danger'} />
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Saldo por cuenta" bodyClass="table-wrap">
          <table className="table">
            <tbody>
              {s.accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.name} {!a.active ? <Badge>Inactiva</Badge> : null}
                    <div className="muted">{ACCOUNT_TYPE_LABELS[a.type]}</div>
                  </td>
                  <td className="num">
                    <Money value={a.balance ?? 0} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Últimos movimientos" actions={<Link to="/contabilidad?tab=movimientos">Ver todos</Link>} bodyClass="table-wrap">
          {!s.recent.length ? (
            <Empty>Todavía no hay movimientos.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {s.recent.map((m) => (
                  <tr key={m.id} className={m.voided ? 'voided' : ''}>
                    <td className="nowrap">{formatDate(m.date)}</td>
                    <td className="desc">
                      {m.description ?? m.category?.name ?? (m.transferGroup ? 'Transferencia' : '—')}
                      <div className="muted">{m.account?.name}</div>
                    </td>
                    <td className="num">
                      <Money value={m.amount} kind={m.kind} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <Card title={`Mes a mes ${year}`} bodyClass="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="num">Ingresos</th>
              <th className="num">Egresos</th>
              <th className="num">Resultado</th>
              <th>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {s.byMonth.map((m) => (
              <tr key={m.month}>
                <td style={{ textTransform: 'capitalize' }}>{MONTH_NAMES[m.month - 1]}</td>
                <td className="num">
                  <Money value={m.ingresos} />
                </td>
                <td className="num">
                  <Money value={m.egresos} />
                </td>
                <td className="num">
                  <Money value={m.resultado} strong />
                </td>
                <td>{m.closed ? <Badge tone="ok">Cerrado</Badge> : <span className="muted">Abierto</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ======================= MOVIMIENTOS =======================
function MovementsTab() {
  const { can } = useAuth();
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const accounts = useAccounts();
  const categories = useCategories();
  const year = new Date().getFullYear();
  const [f, setF] = useState({ from: `${year}-01-01`, to: `${year}-12-31`, accountId: '', categoryId: '', kind: '', q: '' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ kind: 'new'; mkind: 'ingreso' | 'egreso' } | { kind: 'edit'; m: MovementRow } | { kind: 'transfer' } | null>(null);
  useEffect(() => setPage(1), [f]);
  const list = useQuery({
    queryKey: ['acc-movements', f, page],
    queryFn: () =>
      api.get<{ rows: MovementRow[]; total: number; pageSize: number; totals: { ingresos: number; egresos: number; resultado: number } }>(
        `/accounting/movements${qs({ ...f, page })}`,
      ),
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const data = list.data;

  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <Input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} aria-label="Desde" />
        <Input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} aria-label="Hasta" />
        <Select value={f.kind} onChange={(e) => set('kind', e.target.value)} aria-label="Tipo">
          <option value="">Ingresos y egresos</option>
          <option value="ingreso">Solo ingresos</option>
          <option value="egreso">Solo egresos</option>
        </Select>
        <Select value={f.accountId} onChange={(e) => set('accountId', e.target.value)} aria-label="Cuenta">
          <option value="">Todas las cuentas</option>
          {accounts.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kind === 'ingreso' ? '↑' : '↓'} {c.name}
            </option>
          ))}
        </Select>
        <Input className="grow" placeholder="Buscar en la descripción" value={f.q} onChange={(e) => set('q', e.target.value)} />
      </div>
      <div className="row between">
        <div className="row">
          {can('accounting', 'create') ? (
            <>
              <Button onClick={() => setDialog({ kind: 'new', mkind: 'ingreso' })}>
                <Plus /> Registrar ingreso
              </Button>
              <Button onClick={() => setDialog({ kind: 'new', mkind: 'egreso' })}>
                <Plus /> Registrar gasto
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'transfer' })}>
                <ArrowLeftRight /> Transferencia entre cuentas
              </Button>
            </>
          ) : null}
        </div>
        {can('accounting', 'export') ? (
          <Button variant="secondary" onClick={() => api.download(`/accounting/movements/export${qs(f)}`, 'movimientos.csv').catch(toast.error)}>
            <Download /> Exportar CSV
          </Button>
        ) : null}
      </div>
      {data ? (
        <div className="acc-stats">
          <Stat label="Ingresos" value={formatMoney(data.totals.ingresos)} tone="ok" hint="Sin transferencias" />
          <Stat label="Egresos" value={formatMoney(data.totals.egresos)} tone="danger" />
          <Stat label="Resultado" value={formatMoney(data.totals.resultado)} tone={data.totals.resultado >= 0 ? 'ok' : 'danger'} />
        </div>
      ) : null}
      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !data?.rows.length ? (
          <Empty>No hay movimientos con esos filtros.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Vinculado a</th>
                <th className="num">Monto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((m) => {
                const auto = !!m.paymentId || !!m.transferGroup || !!m.reversesId;
                return (
                  <tr key={m.id} className={m.voided ? 'voided' : ''}>
                    <td className="nowrap">
                      {formatDate(m.date)} {m.closed ? <Lock size={12} className="muted" aria-label="Mes cerrado" /> : null}
                    </td>
                    <td className="desc">
                      {m.description ?? '—'}
                      {m.voided ? <Badge tone="danger">Anulado</Badge> : null}
                      {m.reversesId ? <Badge tone="warn">Anulación</Badge> : null}
                      {m.receiptUrl ? (
                        <>
                          {' '}
                          <a href={m.receiptUrl} target="_blank" rel="noreferrer">
                            comprobante
                          </a>
                        </>
                      ) : null}
                      {m.createdBy ? <div className="muted">Cargó: {m.createdBy.name}</div> : null}
                    </td>
                    <td>{m.transferGroup ? <Badge tone="info">Transferencia</Badge> : m.category?.name ?? '—'}</td>
                    <td>{m.account?.name}</td>
                    <td>
                      {m.event ? <Link to={`/eventos/${m.event.id}`}>{m.event.name}</Link> : null}
                      {m.camp ? <Link to={`/campamentos/${m.camp.id}`}>{m.camp.name}</Link> : null}
                      {m.payment ? <Link to={`/contabilidad/recibos/${m.payment.id}`}>{m.payment.receiptNumber}</Link> : null}
                    </td>
                    <td className="num">
                      <Money value={m.amount} kind={m.kind} />
                    </td>
                    <td className="num nowrap">
                      {!m.voided && !m.reversesId && !m.paymentId ? (
                        <>
                          {!auto && !m.closed && can('accounting', 'edit') ? (
                            <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setDialog({ kind: 'edit', m })}>
                              <Pencil />
                            </Button>
                          ) : null}
                          {!auto && !m.closed && can('accounting', 'delete') ? (
                            <ConfirmButton
                              variant="ghost"
                              size="sm"
                              title="Eliminar movimiento"
                              message="¿Eliminar este movimiento? Si fue un error de carga en un mes abierto, se borra; si el mes ya está cerrado usá Anular."
                              confirmLabel="Eliminar"
                              onConfirm={async () => {
                                try {
                                  await api.del(`/accounting/movements/${m.id}`);
                                  toast.ok('Movimiento eliminado');
                                  await refresh();
                                } catch (e) {
                                  toast.error(e);
                                }
                              }}
                            >
                              <Trash2 />
                            </ConfirmButton>
                          ) : null}
                          {can('accounting', 'edit') ? (
                            <ConfirmButton
                              variant="ghost"
                              size="sm"
                              title="Anular movimiento"
                              message="Se registra un contra-asiento con fecha de hoy y el movimiento queda anulado. Sirve también para meses cerrados."
                              confirmLabel="Anular"
                              onConfirm={async () => {
                                try {
                                  await api.post(`/accounting/movements/${m.id}/void`, {});
                                  toast.ok('Movimiento anulado');
                                  await refresh();
                                } catch (err) {
                                  toast.error(err);
                                }
                              }}
                            >
                              <Ban />
                            </ConfirmButton>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      {data && data.total > data.pageSize ? (
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="muted">
            Página {page} de {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button variant="secondary" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      ) : null}
      {dialog?.kind === 'new' ? <MovementDialog defaults={{ kind: dialog.mkind }} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'edit' ? <MovementDialog movement={dialog.m} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'transfer' ? <TransferDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function TransferDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const accounts = useAccounts();
  type F = z.input<typeof accountTransferSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(accountTransferSchema),
    defaultValues: { date: todayIso(), fromAccountId: '', toAccountId: '', amount: '' as unknown as number, description: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.post('/accounting/transfers', v);
      toast.ok('Transferencia registrada');
      await refresh();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  const opts = accounts.data?.filter((a) => a.active) ?? [];
  return (
    <Modal
      title="Transferencia entre cuentas"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Registrar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Desde" required error={e.fromAccountId?.message}>
          <Select {...register('fromAccountId')} invalid={!!e.fromAccountId}>
            <option value="">Elegí la cuenta</option>
            {opts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hacia" required error={e.toAccountId?.message}>
          <Select {...register('toAccountId')} invalid={!!e.toAccountId}>
            <option value="">Elegí la cuenta</option>
            {opts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" required error={e.date?.message}>
          <Input type="date" {...register('date')} />
        </Field>
        <Field label="Monto" required error={e.amount?.message}>
          <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!e.amount} />
        </Field>
        <Field label="Descripción" full>
          <Input {...register('description')} placeholder="Ej: depósito de la caja en el banco" />
        </Field>
      </form>
    </Modal>
  );
}

// ======================= PRESUPUESTO =======================
interface BudgetView {
  year: number;
  status: 'borrador' | 'aprobado';
  exists: boolean;
  notes: string | null;
  approvedBy: string | null;
  lines: { categoryId: string; name: string; kind: 'ingreso' | 'egreso'; planned: number; actual: number; pct: number | null; notes: string | null }[];
  totals: { plannedIncome: number; plannedExpense: number; actualIncome: number; actualExpense: number };
}

function BudgetTab() {
  const { can } = useAuth();
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const [year, setYear] = useState(new Date().getFullYear());
  const q = useQuery({ queryKey: ['acc-budget', year], queryFn: () => api.get<BudgetView>(`/accounting/budgets/${year}`) });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data) setDraft(Object.fromEntries(q.data.lines.map((l) => [l.categoryId, l.planned ? String(l.planned) : ''])));
  }, [q.data]);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const b = q.data!;
  const editable = can('accounting', 'edit') && (b.status === 'borrador' || can('accounting', 'approve'));
  const dirty = b.lines.some((l) => Number(draft[l.categoryId] || 0) !== l.planned);
  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/accounting/budgets/${year}`, { lines: b.lines.map((l) => ({ categoryId: l.categoryId, amount: Number(draft[l.categoryId] || 0) })) });
      toast.ok('Presupuesto guardado');
      await refresh();
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  const section = (kind: 'ingreso' | 'egreso') => (
    <Card title={kind === 'ingreso' ? 'Ingresos' : 'Egresos'} bodyClass="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Rubro</th>
            <th className="num">Presupuestado</th>
            <th className="num">Ejecutado</th>
            <th>Ejecución</th>
          </tr>
        </thead>
        <tbody>
          {b.lines
            .filter((l) => l.kind === kind)
            .map((l) => {
              const planned = Number(draft[l.categoryId] || 0);
              const pct = planned ? Math.round((l.actual / planned) * 100) : null;
              return (
                <tr key={l.categoryId}>
                  <td>{l.name}</td>
                  <td className="num" style={{ width: 170 }}>
                    {editable ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft[l.categoryId] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [l.categoryId]: e.target.value }))}
                        style={{ textAlign: 'right' }}
                        aria-label={`Presupuesto ${l.name}`}
                      />
                    ) : (
                      <Money value={l.planned} />
                    )}
                  </td>
                  <td className="num">
                    <Money value={l.actual} />
                  </td>
                  <td style={{ minWidth: 140 }}>
                    {pct === null ? (
                      <span className="muted">—</span>
                    ) : (
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <div className={`bar ${kind === 'egreso' && pct > 100 ? 'over' : ''}`} style={{ flex: 1 }}>
                          <span style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="muted nowrap">{pct}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </Card>
  );
  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <YearSelect value={year} onChange={setYear} />
        {b.status === 'aprobado' ? <Badge tone="ok">Aprobado{b.approvedBy ? ` por ${b.approvedBy}` : ''}</Badge> : <Badge>Borrador</Badge>}
        <div className="grow" />
        {editable ? (
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Guardar presupuesto
          </Button>
        ) : null}
        {can('accounting', 'approve') && b.exists ? (
          <ConfirmButton
            variant={b.status === 'aprobado' ? 'secondary' : 'gold'}
            title={b.status === 'aprobado' ? 'Volver a borrador' : 'Aprobar presupuesto'}
            message={b.status === 'aprobado' ? '¿Volver el presupuesto a borrador?' : `¿Aprobar el presupuesto ${year}?`}
            confirmLabel={b.status === 'aprobado' ? 'Volver a borrador' : 'Aprobar'}
            onConfirm={async () => {
              try {
                await api.post(`/accounting/budgets/${year}/approve`, {});
                await refresh();
              } catch (e) {
                toast.error(e);
              }
            }}
          >
            {b.status === 'aprobado' ? 'Volver a borrador' : 'Aprobar presupuesto'}
          </ConfirmButton>
        ) : null}
      </div>
      <div className="acc-stats">
        <Stat label="Ingresos presupuestados" value={formatMoney(b.totals.plannedIncome)} hint={`Ejecutado ${formatMoney(b.totals.actualIncome)}`} />
        <Stat label="Egresos presupuestados" value={formatMoney(b.totals.plannedExpense)} hint={`Ejecutado ${formatMoney(b.totals.actualExpense)}`} />
        <Stat
          label="Resultado previsto"
          value={formatMoney(b.totals.plannedIncome - b.totals.plannedExpense)}
          hint={`Real ${formatMoney(b.totals.actualIncome - b.totals.actualExpense)}`}
        />
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {section('ingreso')}
        {section('egreso')}
      </div>
    </div>
  );
}

// ======================= REPORTES =======================
function ReportsTab() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayIso());
  const [pyear, setPyear] = useState(year);
  const cash = useQuery({
    queryKey: ['acc-reports', 'cash', from, to],
    queryFn: () => api.get<{ rows: { accountId: string; name: string; opening: number; ingresos: number; egresos: number; closing: number }[] }>(`/accounting/reports/cash${qs({ from, to })}`),
  });
  const projects = useQuery({
    queryKey: ['acc-reports', 'projects', pyear],
    queryFn: () =>
      api.get<{
        events: { id: string; name: string; date: string | null; status: string; plannedIncome: number; plannedExpense: number; ingresos: number; egresos: number; resultado: number }[];
        camps: { id: string; name: string; startDate: string; status: string; plannedExpense: number; ingresos: number; egresos: number; resultado: number }[];
      }>(`/accounting/reports/projects${qs({ year: pyear })}`),
  });
  return (
    <div className="stack">
      <Card
        title="Caja por período"
        actions={
          <>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" style={{ width: 'auto' }} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" style={{ width: 'auto' }} />
          </>
        }
        bodyClass="table-wrap"
      >
        {cash.isLoading ? (
          <Loading />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th className="num">Saldo inicial</th>
                <th className="num">Entradas</th>
                <th className="num">Salidas</th>
                <th className="num">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {cash.data?.rows.map((r) => (
                <tr key={r.accountId}>
                  <td>{r.name}</td>
                  <td className="num">
                    <Money value={r.opening} />
                  </td>
                  <td className="num">
                    <Money value={r.ingresos} kind="ingreso" />
                  </td>
                  <td className="num">
                    <Money value={r.egresos} kind="egreso" />
                  </td>
                  <td className="num">
                    <Money value={r.closing} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted card-body" style={{ margin: 0 }}>
          Incluye las transferencias entre cuentas (salen de una y entran en otra).
        </p>
      </Card>
      <Card title="Resultado por evento y campamento" actions={<YearSelect value={pyear} onChange={setPyear} />} bodyClass="table-wrap">
        {projects.isLoading ? (
          <Loading />
        ) : !projects.data?.events.length && !projects.data?.camps.length ? (
          <Empty>No hay eventos ni campamentos en {pyear}.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Evento / campamento</th>
                <th>Fecha</th>
                <th className="num">Ingresos</th>
                <th className="num">Egresos</th>
                <th className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {projects.data?.events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/eventos/${e.id}`}>{e.name}</Link> <Badge>Evento</Badge>
                  </td>
                  <td>{formatDate(e.date)}</td>
                  <td className="num">
                    <Money value={e.ingresos} />
                  </td>
                  <td className="num">
                    <Money value={e.egresos} />
                  </td>
                  <td className="num">
                    <Money value={e.resultado} strong />
                  </td>
                </tr>
              ))}
              {projects.data?.camps.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/campamentos/${c.id}`}>{c.name}</Link> <Badge tone="info">Campamento</Badge>
                  </td>
                  <td>{formatDate(c.startDate)}</td>
                  <td className="num">
                    <Money value={c.ingresos} />
                  </td>
                  <td className="num">
                    <Money value={c.egresos} />
                  </td>
                  <td className="num">
                    <Money value={c.resultado} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Deudores y ejecución presupuestaria">
        <p style={{ margin: 0 }}>
          Los deudores por unidad están en <Link to="/contabilidad/cuotas">Cuotas y pagos → Deudores</Link>. La ejecución del presupuesto, en la pestaña{' '}
          <Link to="/contabilidad?tab=presupuesto">Presupuesto</Link>.
        </p>
      </Card>
    </div>
  );
}

// ======================= CUENTAS, CATEGORÍAS Y CIERRES =======================
function ConfigTab() {
  const { can } = useAuth();
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const accounts = useAccounts();
  const categories = useCategories();
  const closes = useQuery({
    queryKey: ['acc-summary', 'closes'],
    queryFn: () => api.get<{ id: string; year: number; month: number; createdAt: string; closedBy: { name: string } | null }[]>('/accounting/closes'),
  });
  const [acc, setAcc] = useState<AccountRow | 'new' | null>(null);
  const [cat, setCat] = useState<CategoryRow | 'new' | null>(null);
  const now = new Date();
  const [cy, setCy] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [cm, setCm] = useState(now.getMonth() === 0 ? 12 : now.getMonth());

  return (
    <div className="stack">
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card
          title="Cuentas"
          actions={
            can('accounting', 'create') ? (
              <Button size="sm" onClick={() => setAcc('new')}>
                <Plus /> Nueva cuenta
              </Button>
            ) : null
          }
          bodyClass="table-wrap"
        >
          <table className="table">
            <tbody>
              {accounts.data?.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.name} {!a.active ? <Badge>Inactiva</Badge> : null}
                    <div className="muted">
                      {ACCOUNT_TYPE_LABELS[a.type]}
                      {a.holder ? ` · a nombre de ${a.holder}` : ''}
                    </div>
                  </td>
                  <td className="num">{a.balance !== null ? <Money value={a.balance} /> : null}</td>
                  <td className="num">
                    {can('accounting', 'edit') ? (
                      <Button variant="ghost" size="sm" aria-label="Editar cuenta" onClick={() => setAcc(a)}>
                        <Pencil />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card
          title="Cierres mensuales"
          actions={
            can('accounting', 'approve') ? (
              <div className="row" style={{ gap: 6 }}>
                <Select value={cm} onChange={(e) => setCm(Number(e.target.value))} aria-label="Mes" style={{ width: 'auto' }}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
                <Input type="number" value={cy} onChange={(e) => setCy(Number(e.target.value))} aria-label="Año" style={{ width: 90 }} />
                <ConfirmButton
                  size="sm"
                  variant="primary"
                  title="Cerrar el mes"
                  message={`¿Cerrar ${MONTH_NAMES[cm - 1]} de ${cy}? Sus movimientos ya no se van a poder editar ni borrar: las correcciones se hacen con "Anular".`}
                  confirmLabel="Cerrar mes"
                  onConfirm={async () => {
                    try {
                      await api.post('/accounting/closes', { year: cy, month: cm });
                      toast.ok('Mes cerrado');
                      await refresh();
                      await closes.refetch();
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  <Lock /> Cerrar mes
                </ConfirmButton>
              </div>
            ) : null
          }
          bodyClass="table-wrap"
        >
          {!closes.data?.length ? (
            <Empty>Todavía no se cerró ningún mes.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {closes.data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ textTransform: 'capitalize' }}>
                      {MONTH_NAMES[c.month - 1]} {c.year}
                    </td>
                    <td className="muted">
                      {formatDate(c.createdAt.slice(0, 10))}
                      {c.closedBy ? ` · ${c.closedBy.name}` : ''}
                    </td>
                    <td className="num">
                      {can('accounting', 'approve') ? (
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          title="Reabrir el mes"
                          message="¿Reabrir este mes? Se van a poder volver a editar sus movimientos."
                          confirmLabel="Reabrir"
                          onConfirm={async () => {
                            try {
                              await api.del(`/accounting/closes/${c.id}`);
                              await refresh();
                              await closes.refetch();
                            } catch (e) {
                              toast.error(e);
                            }
                          }}
                        >
                          <LockOpen /> Reabrir
                        </ConfirmButton>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <Card
        title="Categorías de ingresos y egresos"
        actions={
          can('accounting', 'create') ? (
            <Button size="sm" onClick={() => setCat('new')}>
              <Plus /> Nueva categoría
            </Button>
          ) : null
        }
        bodyClass="table-wrap"
      >
        <table className="table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.data?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <Badge tone={c.kind === 'ingreso' ? 'ok' : 'danger'}>{MOVEMENT_KIND_LABELS[c.kind]}</Badge>
                </td>
                <td>{c.active ? 'Activa' : <Badge>Inactiva</Badge>}</td>
                <td className="num">
                  {can('accounting', 'edit') ? (
                    <Button variant="ghost" size="sm" aria-label="Editar categoría" onClick={() => setCat(c)}>
                      <Pencil />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {acc ? <AccountDialog account={acc === 'new' ? undefined : acc} onClose={() => setAcc(null)} /> : null}
      {cat ? <CategoryDialog category={cat === 'new' ? undefined : cat} onClose={() => setCat(null)} /> : null}
    </div>
  );
}

function AccountDialog({ account, onClose }: { account?: AccountRow; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const { register, handleSubmit, formState, setError } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? { name: account.name, type: account.type, holder: account.holder ?? '', initialBalance: account.initialBalance, initialDate: account.initialDate ?? '', active: account.active, notes: account.notes ?? '' }
      : { name: '', type: 'efectivo', holder: '', initialBalance: 0, initialDate: todayIso(), active: true, notes: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (account) await api.put(`/accounting/accounts/${account.id}`, v);
      else await api.post('/accounting/accounts', v);
      toast.ok('Cuenta guardada');
      await refresh();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={account ? 'Editar cuenta' : 'Nueva cuenta'}
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
        <Field label="Nombre" required error={e.name?.message}>
          <Input {...register('name')} invalid={!!e.name} />
        </Field>
        <Field label="Tipo">
          <Select {...register('type')}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="A nombre de" hint="Titular de la cuenta o quién tiene la caja">
          <Input {...register('holder')} />
        </Field>
        <Field label="Saldo inicial" error={e.initialBalance?.message}>
          <Input type="number" step="0.01" {...register('initialBalance')} />
        </Field>
        <Field label="Fecha del saldo inicial">
          <Input type="date" {...register('initialDate')} />
        </Field>
        <Field label=" ">
          <Checkbox label="Activa" {...register('active')} />
        </Field>
        <Field label="Notas" full>
          <Input {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

function CategoryDialog({ category, onClose }: { category?: CategoryRow; onClose: () => void }) {
  const toast = useToast();
  const qcRefresh = useRefreshTreasury();
  type F = z.input<typeof categorySchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? { name: category.name, kind: category.kind, active: category.active, sortOrder: category.sortOrder } : { name: '', kind: 'egreso', active: true, sortOrder: 50 },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (category) await api.put(`/accounting/categories/${category.id}`, v);
      else await api.post('/accounting/categories', v);
      toast.ok('Categoría guardada');
      await qcRefresh();
      onClose();
      window.setTimeout(() => window.dispatchEvent(new Event('focus')), 0);
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={category ? 'Editar categoría' : 'Nueva categoría'}
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
        <Field label="Nombre" required error={e.name?.message} full>
          <Input {...register('name')} invalid={!!e.name} />
        </Field>
        <Field label="Tipo">
          <Select {...register('kind')} disabled={!!category?.code}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </Field>
        <Field label="Orden">
          <Input type="number" {...register('sortOrder')} />
        </Field>
        <Field label=" " full>
          <Checkbox label="Activa" {...register('active')} />
        </Field>
      </form>
    </Modal>
  );
}

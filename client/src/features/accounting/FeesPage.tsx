import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { formatDate, formatMoney, MONTH_NAMES } from '@shared';
import { api, ApiError, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, Tabs, UnitBadge } from '../../components/ui';
import { Money, Stat, useRefreshTreasury } from './common';
import type { UnitRef } from '../../lib/types';

type Tab = 'deudores' | 'plan' | 'generar' | 'becas';

export function FeesPage() {
  const { can, canAll } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'deudores';
  const setTab = (t: Tab) => setParams(t === 'deudores' ? {} : { tab: t }, { replace: true });
  const tabs: { key: Tab; label: string }[] = [
    { key: 'deudores', label: 'Deudores' },
    { key: 'plan', label: 'Plan de cuotas' },
    ...(canAll('fees', 'create') && canAll('fees', 'edit') ? [{ key: 'generar' as const, label: 'Generar cuotas' }] : []),
    { key: 'becas', label: 'Becas' },
  ];
  return (
    <>
      <PageHeader
        title="Cuotas y pagos"
        sub="Plan de cuotas del año, generación mensual, becas y deudores. Los pagos se registran desde la ficha de cada protagonista (pestaña Pagos)."
        crumbs={can('accounting', 'view') ? [{ to: '/contabilidad', label: 'Contabilidad' }] : undefined}
        actions={
          tab === 'deudores' ? (
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          ) : null
        }
      />
      <div className="no-print">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>
      {tab === 'deudores' ? <DebtorsTab /> : null}
      {tab === 'plan' ? <PlanTab /> : null}
      {tab === 'generar' ? <GenerateTab /> : null}
      {tab === 'becas' ? <ScholarshipsTab /> : null}
    </>
  );
}

function useAllowedUnits(action: 'view' | 'create' = 'view') {
  const { unitsWith } = useAuth();
  const units = useUnits();
  const allowed = unitsWith('fees', action);
  return (units.data ?? []).filter((u) => u.active && (allowed === 'all' || allowed.includes(u.id)));
}

// ======================= DEUDORES =======================
interface DebtorRow {
  memberId: string;
  firstName: string;
  lastName: string;
  unit: UnitRef | null;
  pending: number;
  overdue: number;
  oldestDue: string | null;
  charges: number;
}

function DebtorsTab() {
  const units = useAllowedUnits();
  const [unitId, setUnitId] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const q = useQuery({
    queryKey: ['fees-debtors', unitId],
    queryFn: () => api.get<{ rows: DebtorRow[]; totals: { pending: number; overdue: number } }>(`/accounting/fees/debtors${qs({ unitId })}`),
  });
  const rows = (q.data?.rows ?? []).filter((r) => !onlyOverdue || r.overdue > 0);
  return (
    <div className="stack">
      <div className="toolbar no-print" style={{ marginBottom: 0 }}>
        <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label="Unidad">
          <option value="">Todas las unidades</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> Solo con deuda vencida
        </label>
      </div>
      <h2 className="print-only">Deudores al {formatDate(new Date().toISOString().slice(0, 10))}</h2>
      {q.data ? (
        <div className="acc-stats">
          <Stat label="Deuda total" value={formatMoney(q.data.totals.pending)} hint={`${q.data.rows.length} protagonistas`} />
          <Stat label="Deuda vencida" value={formatMoney(q.data.totals.overdue)} tone={q.data.totals.overdue > 0 ? 'danger' : 'ok'} />
        </div>
      ) : null}
      <Card bodyClass="table-wrap">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <div className="card-body">
            <ErrorBox error={q.error} />
          </div>
        ) : !rows.length ? (
          <Empty>No hay deudas pendientes. ¡Bien!</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Protagonista</th>
                <th>Unidad</th>
                <th className="num">Cargos</th>
                <th>Vence desde</th>
                <th className="num">Vencido</th>
                <th className="num">Total pendiente</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId} className={r.overdue > 0 ? 'row-warn' : ''}>
                  <td>
                    <Link to={`/protagonistas/${r.memberId}`}>
                      {r.lastName}, {r.firstName}
                    </Link>
                  </td>
                  <td>
                    <UnitBadge unit={r.unit} short />
                  </td>
                  <td className="num">{r.charges}</td>
                  <td>{formatDate(r.oldestDue)}</td>
                  <td className="num">{r.overdue > 0 ? <Money value={r.overdue} kind="egreso" /> : <span className="muted">—</span>}</td>
                  <td className="num">
                    <Money value={r.pending} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="muted no-print">Para registrar un pago, entrá a la ficha del protagonista → pestaña «Pagos» → «Registrar pago».</p>
    </div>
  );
}

// ======================= PLAN DE CUOTAS =======================
interface Plan {
  year: number;
  monthlyAmount: number;
  months: number[];
  affiliationAmount: number;
  siblingDiscountPct: number;
  dueDay: number;
  notes: string | null;
  exists: boolean;
}

export const usePlan = (year: number) => useQuery({ queryKey: ['fees-plan', year], queryFn: () => api.get<Plan>(`/accounting/fees/plans/${year}`) });

function PlanTab() {
  const { canAll } = useAuth();
  const toast = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const q = usePlan(year);
  const [d, setD] = useState({ monthlyAmount: '', affiliationAmount: '', siblingDiscountPct: '0', dueDay: '10', notes: '', months: [] as number[] });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data)
      setD({
        monthlyAmount: q.data.monthlyAmount ? String(q.data.monthlyAmount) : '',
        affiliationAmount: q.data.affiliationAmount ? String(q.data.affiliationAmount) : '',
        siblingDiscountPct: String(q.data.siblingDiscountPct ?? 0),
        dueDay: String(q.data.dueDay ?? 10),
        notes: q.data.notes ?? '',
        months: q.data.months ?? [],
      });
  }, [q.data]);
  const editable = canAll('fees', 'edit');
  const toggle = (m: number) => setD((p) => ({ ...p, months: p.months.includes(m) ? p.months.filter((x) => x !== m) : [...p.months, m].sort((a, b) => a - b) }));
  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.put(`/accounting/fees/plans/${year}`, {
        monthlyAmount: Number(d.monthlyAmount || 0),
        affiliationAmount: Number(d.affiliationAmount || 0),
        siblingDiscountPct: Number(d.siblingDiscountPct || 0),
        dueDay: Number(d.dueDay || 10),
        notes: d.notes,
        months: d.months,
      });
      toast.ok(`Plan ${year} guardado`);
      await q.refetch();
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(e.details);
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  const yearly = Number(d.monthlyAmount || 0) * d.months.length + Number(d.affiliationAmount || 0);
  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año" style={{ width: 'auto', minWidth: 0 }}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              Plan {y}
            </option>
          ))}
        </Select>
        {q.data && !q.data.exists ? <Badge tone="warn">Todavía no se cargó el plan {year}</Badge> : null}
      </div>
      {q.isLoading ? (
        <Loading />
      ) : (
        <Card title={`Plan de cuotas ${year}`}>
          <div className="form-grid" id="fees-plan-form">
            <Field label="Cuota mensual" required error={errors.monthlyAmount}>
              <Input type="number" min="0" step="0.01" value={d.monthlyAmount} disabled={!editable} onChange={(e) => setD({ ...d, monthlyAmount: e.target.value })} />
            </Field>
            <Field label="Afiliación anual" hint="Se genera como un cargo aparte, una vez por año" error={errors.affiliationAmount}>
              <Input type="number" min="0" step="0.01" value={d.affiliationAmount} disabled={!editable} onChange={(e) => setD({ ...d, affiliationAmount: e.target.value })} />
            </Field>
            <Field label="Descuento por hermano (%)" hint="El mayor paga completo; los hermanos menores tienen este descuento" error={errors.siblingDiscountPct}>
              <Input type="number" min="0" max="100" value={d.siblingDiscountPct} disabled={!editable} onChange={(e) => setD({ ...d, siblingDiscountPct: e.target.value })} />
            </Field>
            <Field label="Día de vencimiento" hint="Del 1 al 28 de cada mes" error={errors.dueDay}>
              <Input type="number" min="1" max="28" value={d.dueDay} disabled={!editable} onChange={(e) => setD({ ...d, dueDay: e.target.value })} />
            </Field>
            <Field label="Meses que se cobran" full error={errors.months}>
              <div className="month-grid">
                {MONTH_NAMES.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    className={`month-chip ${d.months.includes(i + 1) ? 'on' : ''}`}
                    disabled={!editable}
                    onClick={() => toggle(i + 1)}
                    aria-pressed={d.months.includes(i + 1)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Notas" full>
              <Input value={d.notes} disabled={!editable} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Ej: aprobado en el Consejo de Grupo de marzo" />
            </Field>
          </div>
          <div className="row between mt">
            <span className="muted">
              Total anual por protagonista (sin descuentos): <strong>{formatMoney(yearly)}</strong> ({d.months.length} cuotas)
            </span>
            {editable ? (
              <Button onClick={save} loading={saving}>
                Guardar plan
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}

// ======================= GENERAR =======================
interface GenResult {
  preview: boolean;
  created: number;
  alreadyHad: number;
  exempt: number;
  total: number;
  period: string;
}

function GenerateTab() {
  const toast = useToast();
  const refresh = useRefreshTreasury();
  const units = useAllowedUnits('create');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const plan = usePlan(year);
  const [concept, setConcept] = useState<'cuota' | 'afiliacion'>('cuota');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [unitId, setUnitId] = useState('');
  const [preview, setPreview] = useState<GenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const body = useMemo(() => ({ year, concept, month: concept === 'cuota' ? month : null, unitId: unitId || null }), [year, concept, month, unitId]);
  useEffect(() => setPreview(null), [body]);
  useEffect(() => {
    if (plan.data?.months.length && !plan.data.months.includes(month)) setMonth(plan.data.months.find((m) => m >= now.getMonth() + 1) ?? plan.data.months[0]);
  }, [plan.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const what = concept === 'cuota' ? `la cuota de ${MONTH_NAMES[month - 1]} ${year}` : `la afiliación ${year}`;
  const runPreview = async () => {
    setBusy(true);
    try {
      setPreview(await api.post<GenResult>('/accounting/fees/generate', { ...body, preview: true }));
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <Card title="Generar cargos">
        {plan.data && !plan.data.exists ? (
          <div className="alert alert-warn mb">
            Primero cargá el plan de cuotas {year} en la pestaña «Plan de cuotas».
          </div>
        ) : null}
        <div className="form-grid" id="fees-generate-form">
          <Field label="Año">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Qué se genera">
            <Select value={concept} onChange={(e) => setConcept(e.target.value as 'cuota' | 'afiliacion')}>
              <option value="cuota">Cuota mensual</option>
              <option value="afiliacion">Afiliación anual</option>
            </Select>
          </Field>
          {concept === 'cuota' ? (
            <Field label="Mes">
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {(plan.data?.months.length ? plan.data.months : [month]).map((m) => (
                  <option key={m} value={m}>
                    {MONTH_NAMES[m - 1]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Unidad" hint="Vacío = todas las unidades">
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Todas</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="muted">
          Se genera un cargo por cada protagonista activo con unidad, aplicando becas y descuento por hermanos. Si alguno ya tiene el cargo de ese período, se saltea
          (se puede generar de nuevo sin duplicar).
        </p>
        <div className="row">
          <Button variant="secondary" onClick={runPreview} loading={busy} disabled={!plan.data?.exists}>
            Vista previa
          </Button>
          {preview ? (
            <ConfirmButton
              variant="primary"
              title="Generar cargos"
              message={`Se van a crear ${preview.created} cargos de ${what} por un total de ${formatMoney(preview.total)}. ¿Confirmás?`}
              confirmLabel="Generar"
              onConfirm={async () => {
                try {
                  const r = await api.post<GenResult>('/accounting/fees/generate', body);
                  toast.ok(`Se generaron ${r.created} cargos`);
                  setPreview(null);
                  await refresh();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              {concept === 'cuota' ? `Generar cuotas de ${MONTH_NAMES[month - 1]}` : `Generar afiliación ${year}`}
            </ConfirmButton>
          ) : null}
        </div>
        {preview ? (
          <div className="acc-stats mt" style={{ marginBottom: 0 }}>
            <Stat label="Cargos a crear" value={preview.created} hint={formatMoney(preview.total)} />
            <Stat label="Ya lo tenían" value={preview.alreadyHad} />
            <Stat label="Becados al 100%" value={preview.exempt} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// ======================= BECAS =======================
function ScholarshipsTab() {
  const q = useQuery({
    queryKey: ['fees-member', 'settings'],
    queryFn: () =>
      api.get<{ id: string; memberId: string; discountPct: number; note: string | null; member: { id: string; firstName: string; lastName: string; unit: UnitRef | null } }[]>(
        '/accounting/fees/settings',
      ),
  });
  return (
    <Card title="Protagonistas con beca o descuento" bodyClass="table-wrap">
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <div className="card-body">
          <ErrorBox error={q.error} />
        </div>
      ) : !q.data?.length ? (
        <Empty>Nadie tiene beca. Se cargan desde la ficha del protagonista → pestaña «Pagos» → «Beca / descuento».</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Protagonista</th>
              <th>Unidad</th>
              <th className="num">Descuento en la cuota</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/protagonistas/${s.member.id}`}>
                    {s.member.lastName}, {s.member.firstName}
                  </Link>
                </td>
                <td>
                  <UnitBadge unit={s.member.unit} short />
                </td>
                <td className="num">
                  <Badge tone={s.discountPct >= 100 ? 'gold' : 'info'}>{s.discountPct}%</Badge>
                </td>
                <td className="muted">{s.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}


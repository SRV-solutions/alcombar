import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CAMP_RUBRO_LABELS,
  CAMP_RUBROS,
  campBudgetLineSchema,
  campMenuSchema,
  campShoppingSchema,
  formatDate,
  formatMoney,
  MEAL_LABELS,
  MEALS,
  todayIso,
} from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { LinkedLoansCard } from '../inventory/LinkedLoans';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, Empty, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { Money, MovementDialog, MovementsMini, Stat } from '../accounting/common';
import { campDates, campToInput } from './CampsPage';
import { Stars } from './CampSitesPage';
import type { CampBudgetRow, CampDetail, CampMenuRow, CampShoppingRow } from './types';

type Refetch = () => unknown;

function PrintTitle({ c, what }: { c: CampDetail; what: string }) {
  return (
    <h2 className="print-only">
      {c.name} · {campDates(c.startDate, c.endDate)} · {what}
    </h2>
  );
}

// ======================= PRESUPUESTO Y RENDICIÓN =======================
export function BudgetRenderTab({ c, refetch }: { c: CampDetail; refetch: Refetch }) {
  const toast = useToast();
  const [line, setLine] = useState<CampBudgetRow | 'new' | null>(null);
  const [mov, setMov] = useState<'ingreso' | 'egreso' | null>(null);
  const [resultNotes, setResultNotes] = useState(c.resultNotes ?? '');
  const [siteRating, setSiteRating] = useState<number | null>(c.siteRating);
  const [siteReview, setSiteReview] = useState(c.siteReview ?? '');
  useEffect(() => {
    setResultNotes(c.resultNotes ?? '');
    setSiteRating(c.siteRating);
    setSiteReview(c.siteReview ?? '');
  }, [c.resultNotes, c.siteRating, c.siteReview]);
  const editable = c.canEdit && c.status !== 'rendido';
  const t = c.totals;
  return (
    <div className="stack">
      <div className="row between no-print">
        <span className="muted">Lo real sale de los movimientos de Contabilidad vinculados al campamento (incluye los pagos de inscripción).</span>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer /> Imprimir rendición
        </Button>
      </div>
      <PrintTitle c={c} what="Rendición" />
      <div className="acc-stats">
        <Stat label="Gastos presupuestados" value={formatMoney(t.planned)} />
        <Stat label="Gastos reales" value={formatMoney(t.realExpense)} tone={t.realExpense > t.planned && t.planned > 0 ? 'danger' : undefined} />
        <Stat label="Ingresos reales" value={formatMoney(t.realIncome)} hint={`Cobrado de inscripciones ${formatMoney(t.collected)} de ${formatMoney(t.expectedIncome)}`} tone="ok" />
        <Stat label="Resultado" value={formatMoney(t.resultado)} tone={t.resultado >= 0 ? 'ok' : 'danger'} />
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Por rubro: presupuesto vs. real" bodyClass="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rubro</th>
                <th className="num">Presupuesto</th>
                <th className="num">Real</th>
                <th>Ejecución</th>
              </tr>
            </thead>
            <tbody>
              {c.byRubro.map((r) => {
                const pct = r.planned ? Math.round((r.actual / r.planned) * 100) : null;
                return (
                  <tr key={r.rubro}>
                    <td>{CAMP_RUBRO_LABELS[r.rubro]}</td>
                    <td className="num">
                      <Money value={r.planned} />
                    </td>
                    <td className="num">
                      <Money value={r.actual} />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      {pct === null ? (
                        <span className="muted">{r.actual ? 'Sin presupuesto' : '—'}</span>
                      ) : (
                        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <div className={`bar ${pct > 100 ? 'over' : ''}`} style={{ flex: 1 }}>
                            <span style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="muted nowrap">{pct}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <Money value={t.planned} strong />
                </td>
                <td className="num">
                  <Money value={t.realExpense} strong />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </Card>
        <Card
          title="Presupuesto detallado"
          actions={
            editable ? (
              <Button size="sm" onClick={() => setLine('new')} className="no-print">
                <Plus /> Agregar línea
              </Button>
            ) : null
          }
          bodyClass="table-wrap"
        >
          {!c.budgetLines.length ? (
            <Empty>Sin presupuesto cargado.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {c.budgetLines.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.concept}
                      <div className="muted">{CAMP_RUBRO_LABELS[l.rubro]}</div>
                    </td>
                    <td className="num">
                      <Money value={l.planned} />
                    </td>
                    <td className="num nowrap no-print">
                      {editable ? (
                        <>
                          <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setLine(l)}>
                            <Pencil />
                          </Button>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            title="Eliminar línea"
                            message={`¿Eliminar «${l.concept}»?`}
                            confirmLabel="Eliminar"
                            onConfirm={async () => {
                              try {
                                await api.del(`/camps/budget/${l.id}`);
                                await refetch();
                              } catch (e) {
                                toast.error(e);
                              }
                            }}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        </>
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
        title="Movimientos del campamento"
        actions={
          c.canRecord && c.status !== 'rendido' ? (
            <div className="row no-print">
              <Button size="sm" onClick={() => setMov('egreso')}>
                <Plus /> Registrar gasto
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setMov('ingreso')}>
                <Plus /> Registrar ingreso
              </Button>
            </div>
          ) : null
        }
      >
        {c.movements.length || c.canRecord ? (
          <MovementsMini rows={c.movements} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Los gastos los carga Tesorería en Contabilidad vinculándolos a este campamento (con su rubro).
          </p>
        )}
      </Card>
      <Card title="Rendición">
        <div className="form-grid">
          <Field label="Resultado, sobrantes y pendientes" full>
            {c.canEdit && c.status === 'realizado' ? (
              <Textarea rows={3} value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} placeholder="Ej: sobró comida que se donó; falta devolver 2 carpas" />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.resultNotes ?? '—'}</div>
            )}
          </Field>
          <Field label="Evaluación del lugar">
            <Stars value={siteRating ?? 0} onChange={c.canEdit && c.status === 'realizado' ? setSiteRating : undefined} />
          </Field>
          <Field label="Comentario sobre el lugar">
            {c.canEdit && c.status === 'realizado' ? (
              <Input value={siteReview} onChange={(e) => setSiteReview(e.target.value)} placeholder="Ej: buen agua, baños limitados" />
            ) : (
              <div>{c.siteReview ?? '—'}</div>
            )}
          </Field>
        </div>
        <div className="row mt no-print">
          {c.status === 'borrador' || c.status === 'aprobado' ? <span className="muted">La rendición se carga cuando el campamento está marcado como realizado.</span> : null}
          {c.canEdit && c.status === 'realizado' ? (
            <ConfirmButton
              variant="primary"
              title="Rendir campamento"
              message="El campamento queda «Rendido» con el resultado actual y ya no se puede editar (quien aprueba lo puede reabrir)."
              confirmLabel="Rendir"
              onConfirm={async () => {
                try {
                  await api.post(`/camps/${c.id}/render`, { resultNotes, siteRating, siteReview });
                  toast.ok('Campamento rendido');
                  await refetch();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              <CheckCircle2 /> Rendir campamento
            </ConfirmButton>
          ) : null}
          {c.canApprove && c.status === 'rendido' ? (
            <ConfirmButton
              variant="secondary"
              title="Reabrir rendición"
              message="El campamento vuelve a «Realizado» para corregir la rendición."
              confirmLabel="Reabrir"
              onConfirm={async () => {
                try {
                  await api.post(`/camps/${c.id}/render`, {});
                  await refetch();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              <RotateCcw /> Reabrir rendición
            </ConfirmButton>
          ) : null}
          {c.renderedAt ? <span className="muted">Rendido el {formatDate(c.renderedAt.slice(0, 10))}.</span> : null}
        </div>
      </Card>
      {line ? <BudgetLineDialog campId={c.id} line={line === 'new' ? undefined : line} onClose={() => setLine(null)} onSaved={refetch} /> : null}
      {mov ? (
        <MovementDialog
          defaults={{ kind: mov, campId: c.id, campRubro: mov === 'egreso' ? 'otro' : '' }}
          lockLink={{ label: `Vinculado al campamento «${c.name}»` }}
          onClose={() => setMov(null)}
        />
      ) : null}
    </div>
  );
}

function BudgetLineDialog({ campId, line, onClose, onSaved }: { campId: string; line?: CampBudgetRow; onClose: () => void; onSaved: Refetch }) {
  const toast = useToast();
  type F = z.input<typeof campBudgetLineSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(campBudgetLineSchema),
    defaultValues: line ? { rubro: line.rubro, concept: line.concept, planned: line.planned } : { rubro: 'comida', concept: '', planned: '' as unknown as number },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (line) await api.put(`/camps/budget/${line.id}`, v);
      else await api.post(`/camps/${campId}/budget`, v);
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={line ? 'Editar línea del presupuesto' : 'Nueva línea del presupuesto'}
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
        <Field label="Rubro" required>
          <Select {...register('rubro')}>
            {CAMP_RUBROS.map((r) => (
              <option key={r} value={r}>
                {CAMP_RUBRO_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Monto previsto" required error={e.planned?.message}>
          <Input type="number" step="0.01" min="0" {...register('planned')} invalid={!!e.planned} />
        </Field>
        <Field label="Concepto" required full error={e.concept?.message}>
          <Input {...register('concept')} invalid={!!e.concept} placeholder="Ej: micro ida y vuelta" />
        </Field>
      </form>
    </Modal>
  );
}

// ======================= LOGÍSTICA =======================
function daysOf(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(start + 'T12:00:00Z');
  const last = new Date(end + 'T12:00:00Z');
  while (d <= last && out.length < 40) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
const weekday = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'UTC' });

export function LogisticsTab({ c, refetch }: { c: CampDetail; refetch: Refetch }) {
  const toast = useToast();
  const editable = c.canEdit && c.status !== 'rendido';
  const [menuItem, setMenuItem] = useState<CampMenuRow | 'new' | null>(null);
  const [shopItem, setShopItem] = useState<CampShoppingRow | 'new' | null>(null);
  const [d, setD] = useState({
    transportCompany: c.transportCompany ?? '',
    transportContact: c.transportContact ?? '',
    transportSchedule: c.transportSchedule ?? '',
    transportNotes: c.transportNotes ?? '',
    materials: c.materials ?? '',
  });
  const [saving, setSaving] = useState(false);
  const dirty =
    d.transportCompany !== (c.transportCompany ?? '') ||
    d.transportContact !== (c.transportContact ?? '') ||
    d.transportSchedule !== (c.transportSchedule ?? '') ||
    d.transportNotes !== (c.transportNotes ?? '') ||
    d.materials !== (c.materials ?? '');
  const saveLogistics = async () => {
    setSaving(true);
    try {
      await api.put(`/camps/${c.id}`, { ...campToInput(c), ...d });
      toast.ok('Logística guardada');
      await refetch();
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  const toggleBought = async (s: CampShoppingRow) => {
    try {
      await api.put(`/camps/shopping/${s.id}`, { item: s.item, quantity: s.quantity, notes: s.notes, bought: !s.bought });
      await refetch();
    } catch (e) {
      toast.error(e);
    }
  };
  const days = daysOf(c.startDate, c.endDate);
  const groups = [...days.map((day) => ({ day, items: c.menu.filter((m) => m.day === day) })), { day: null as string | null, items: c.menu.filter((m) => !m.day || !days.includes(m.day)) }].filter(
    (g) => g.items.length,
  );
  const mealOrder = (m: CampMenuRow) => MEALS.indexOf(m.meal);
  return (
    <div className="stack">
      <div className="row between no-print">
        <span className="muted">Menú, lista de compras, transporte y materiales. Se puede imprimir para llevar.</span>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer /> Imprimir logística
        </Button>
      </div>
      <PrintTitle c={c} what="Logística" />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card
          title="Menú"
          actions={
            editable ? (
              <Button size="sm" onClick={() => setMenuItem('new')} className="no-print">
                <Plus /> Agregar comida
              </Button>
            ) : null
          }
        >
          {!groups.length ? (
            <Empty>Sin menú cargado.</Empty>
          ) : (
            groups.map((g) => (
              <div className="menu-day" key={g.day ?? 'sin-dia'}>
                <h3>{g.day ? `${weekday(g.day)} ${formatDate(g.day)}` : 'Sin día'}</h3>
                <table className="table">
                  <tbody>
                    {[...g.items]
                      .sort((a, b) => mealOrder(a) - mealOrder(b))
                      .map((m) => (
                        <tr key={m.id}>
                          <td className="nowrap muted" style={{ width: 100 }}>
                            {MEAL_LABELS[m.meal]}
                          </td>
                          <td>
                            {m.dish}
                            {m.notes ? <div className="muted">{m.notes}</div> : null}
                          </td>
                          <td className="num nowrap no-print">
                            {editable ? (
                              <>
                                <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setMenuItem(m)}>
                                  <Pencil />
                                </Button>
                                <ConfirmButton
                                  variant="ghost"
                                  size="sm"
                                  title="Eliminar comida"
                                  message={`¿Eliminar «${m.dish}»?`}
                                  confirmLabel="Eliminar"
                                  onConfirm={async () => {
                                    try {
                                      await api.del(`/camps/menu/${m.id}`);
                                      await refetch();
                                    } catch (e) {
                                      toast.error(e);
                                    }
                                  }}
                                >
                                  <Trash2 />
                                </ConfirmButton>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </Card>
        <Card
          title={`Compras${c.shopping.length ? ` (${c.shopping.filter((s) => s.bought).length}/${c.shopping.length})` : ''}`}
          actions={
            editable ? (
              <Button size="sm" onClick={() => setShopItem('new')} className="no-print">
                <Plus /> Agregar compra
              </Button>
            ) : null
          }
          bodyClass="table-wrap"
        >
          {!c.shopping.length ? (
            <Empty>Sin lista de compras.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {c.shopping.map((s) => (
                  <tr key={s.id} className={s.bought ? 'voided' : ''}>
                    <td style={{ width: 30 }}>
                      <input type="checkbox" checked={s.bought} disabled={!editable} onChange={() => toggleBought(s)} aria-label="Comprado" />
                    </td>
                    <td className="desc">
                      {s.item}
                      {s.notes ? <div className="muted">{s.notes}</div> : null}
                    </td>
                    <td className="nowrap">{s.quantity ?? ''}</td>
                    <td className="num nowrap no-print">
                      {editable ? (
                        <>
                          <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setShopItem(s)}>
                            <Pencil />
                          </Button>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            title="Eliminar"
                            message={`¿Eliminar «${s.item}»?`}
                            confirmLabel="Eliminar"
                            onConfirm={async () => {
                              try {
                                await api.del(`/camps/shopping/${s.id}`);
                                await refetch();
                              } catch (e) {
                                toast.error(e);
                              }
                            }}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Transporte">
          <div className="form-grid">
            <Field label="Empresa / medio">
              <Input value={d.transportCompany} disabled={!editable} onChange={(e) => setD({ ...d, transportCompany: e.target.value })} placeholder="Ej: Micros El Rápido" />
            </Field>
            <Field label="Contacto">
              <Input value={d.transportContact} disabled={!editable} onChange={(e) => setD({ ...d, transportContact: e.target.value })} placeholder="Nombre y teléfono" />
            </Field>
            <Field label="Horarios" full>
              <Input value={d.transportSchedule} disabled={!editable} onChange={(e) => setD({ ...d, transportSchedule: e.target.value })} placeholder="Ej: salida viernes 18 h desde la sede, vuelta domingo 17 h" />
            </Field>
            <Field label="Notas" full>
              <Textarea rows={2} value={d.transportNotes} disabled={!editable} onChange={(e) => setD({ ...d, transportNotes: e.target.value })} />
            </Field>
          </div>
        </Card>
        <Card title="Materiales">
          <Field label="Qué hay que llevar" hint="Lo que sale del depósito se pide abajo, en «Materiales prestados»">
            <Textarea
              rows={7}
              value={d.materials}
              disabled={!editable}
              onChange={(e) => setD({ ...d, materials: e.target.value })}
              placeholder={'Ej:\n- 4 carpas de patrulla\n- 2 ollas grandes\n- botiquín'}
            />
          </Field>
        </Card>
      </div>
      {editable ? (
        <div className="row no-print" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={saveLogistics} loading={saving} disabled={!dirty}>
            Guardar transporte y materiales
          </Button>
        </div>
      ) : null}
      <div className="no-print">
        <LinkedLoansCard
          link={{ campId: c.id }}
          defaults={{
            unitId: c.ownerUnitId ?? '',
            campId: c.id,
            purpose: c.name,
            ...(c.startDate >= todayIso() ? { outDate: c.startDate, dueDate: c.endDate } : {}),
          }}
        />
      </div>
      {menuItem ? <MenuDialog campId={c.id} days={days} item={menuItem === 'new' ? undefined : menuItem} onClose={() => setMenuItem(null)} onSaved={refetch} /> : null}
      {shopItem ? <ShoppingDialog campId={c.id} item={shopItem === 'new' ? undefined : shopItem} onClose={() => setShopItem(null)} onSaved={refetch} /> : null}
    </div>
  );
}

function MenuDialog({ campId, days, item, onClose, onSaved }: { campId: string; days: string[]; item?: CampMenuRow; onClose: () => void; onSaved: Refetch }) {
  const toast = useToast();
  type F = z.input<typeof campMenuSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(campMenuSchema),
    defaultValues: item ? { day: item.day ?? '', meal: item.meal, dish: item.dish, notes: item.notes ?? '' } : { day: days[0] ?? '', meal: 'almuerzo', dish: '', notes: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (item) await api.put(`/camps/menu/${item.id}`, v);
      else await api.post(`/camps/${campId}/menu`, v);
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={item ? 'Editar comida' : 'Agregar comida'}
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
        <Field label="Día">
          <Select {...register('day')}>
            <option value="">Sin día</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {weekday(d)} {formatDate(d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comida" required>
          <Select {...register('meal')}>
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plato" required full error={e.dish?.message}>
          <Input {...register('dish')} invalid={!!e.dish} placeholder="Ej: guiso de lentejas" />
        </Field>
        <Field label="Notas" full>
          <Input {...register('notes')} placeholder="Ej: opción sin TACC para 2" />
        </Field>
      </form>
    </Modal>
  );
}

function ShoppingDialog({ campId, item, onClose, onSaved }: { campId: string; item?: CampShoppingRow; onClose: () => void; onSaved: Refetch }) {
  const toast = useToast();
  type F = z.input<typeof campShoppingSchema>;
  const { register, handleSubmit, formState, setError } = useForm<F>({
    resolver: zodResolver(campShoppingSchema),
    defaultValues: item ? { item: item.item, quantity: item.quantity ?? '', bought: item.bought, notes: item.notes ?? '' } : { item: '', quantity: '', bought: false, notes: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (item) await api.put(`/camps/shopping/${item.id}`, v);
      else await api.post(`/camps/${campId}/shopping`, v);
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={item ? 'Editar compra' : 'Agregar compra'}
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
        <Field label="Qué" required error={e.item?.message}>
          <Input {...register('item')} invalid={!!e.item} placeholder="Ej: fideos" />
        </Field>
        <Field label="Cantidad">
          <Input {...register('quantity')} placeholder="Ej: 6 kg" />
        </Field>
        <Field label="Notas" full>
          <Input {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

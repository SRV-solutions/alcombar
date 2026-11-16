/**
 * Pases de unidad: por edad (cambio de rama) o por elección (otra unidad de la misma rama), de a varios.
 * Cada pase queda en el historial del protagonista con fecha y motivo.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, Search } from 'lucide-react';
import {
  ageAt,
  BRANCH_INFO,
  dueForTransfer,
  formatDate,
  NEXT_BRANCH,
  todayIso,
  TRANSFER_REASON_LABELS,
  TRANSFER_REASONS,
  type Branch,
  type TransferReason,
} from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { MemberListItem, Unit, UnitRef } from '../../lib/types';
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Tabs, UnitBadge } from '../../components/ui';

type Tab = 'edad' | 'elegir' | 'historial';
const branchOrder = (b: string | null | undefined) => (b ? BRANCH_INFO[b as Branch]?.order ?? 9 : 9);
const sortUnits = (a: { branch: string; name: string }, b: { branch: string; name: string }) =>
  branchOrder(a.branch) - branchOrder(b.branch) || a.name.localeCompare(b.name);

interface TransferRow {
  id: string;
  date: string;
  reason: string | null;
  reasonLabel: string | null;
  notes: string | null;
  member: { id: string; firstName: string; lastName: string };
  fromUnit: UnitRef | null;
  toUnit: UnitRef | null;
}

// ---------------------------------------------------------------------------
// Diálogo: pase de varios
// ---------------------------------------------------------------------------
function BulkTransferDialog({
  members,
  targets,
  defaultReason,
  onClose,
  onDone,
}: {
  members: MemberListItem[];
  targets: Unit[];
  defaultReason?: TransferReason;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [toUnitId, setToUnitId] = useState(targets.length === 1 ? targets[0].id : '');
  const [smallGroupId, setSmallGroupId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [reasonTouched, setReasonTouched] = useState(false);
  const [reasonState, setReason] = useState<TransferReason>(defaultReason ?? 'eleccion');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const target = targets.find((u) => u.id === toUnitId);
  const fromBranches = [...new Set(members.map((m) => m.unit?.branch))];
  // Motivo sugerido: si cambia de rama es por edad; si es la misma rama, por elección (se puede cambiar)
  const reason: TransferReason =
    reasonTouched || !target ? reasonState : fromBranches.length === 1 && fromBranches[0] === target.branch ? 'eleccion' : 'edad';

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ moved: number; toUnit: string; skipped: { name: string; why: string }[] }>('/members/transfers', {
        memberIds: members.map((m) => m.id),
        toUnitId,
        toSmallGroupId: smallGroupId,
        date,
        reason,
        notes,
      });
      toast.ok(`${r.moved} ${r.moved === 1 ? 'pase registrado' : 'pases registrados'} a ${r.toUnit}`);
      if (r.skipped.length) toast.info(`No se pasaron: ${r.skipped.map((s) => `${s.name} (${s.why})`).join('; ')}`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['members'] }),
        qc.invalidateQueries({ queryKey: ['member'] }),
        qc.invalidateQueries({ queryKey: ['units'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['transfers'] }),
        qc.invalidateQueries({ queryKey: ['organigrama'] }),
      ]);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Pase de ${members.length} ${members.length === 1 ? 'protagonista' : 'protagonistas'}`}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!toUnitId || !date}>
            <ArrowLeftRight /> Hacer el pase
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {members
            .slice(0, 12)
            .map((m) => `${m.firstName} ${m.lastName}`)
            .join(', ')}
          {members.length > 12 ? ` y ${members.length - 12} más` : ''}
        </p>
        <div className="form-grid">
          <Field label="Pasan a" required>
            <Select value={toUnitId} onChange={(e) => (setToUnitId(e.target.value), setSmallGroupId(''))}>
              <option value="">Elegí la unidad</option>
              {targets.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={target ? BRANCH_INFO[target.branch as Branch]?.smallGroup.one ?? 'Pequeño grupo' : 'Pequeño grupo'} hint="Opcional">
            <Select value={smallGroupId} onChange={(e) => setSmallGroupId(e.target.value)} disabled={!target || !target.smallGroups.length}>
              <option value="">Sin asignar</option>
              {target?.smallGroups
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Fecha del pase" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Motivo">
            <Select
              value={reason}
              onChange={(e) => {
                setReasonTouched(true);
                setReason(e.target.value as TransferReason);
              }}
            >
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {TRANSFER_REASON_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notas" full hint="Por ejemplo: «pidió estar con sus amigos» o «ceremonia de pase del 30/11»">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Queda en el historial de cada uno. La asistencia y la documentación anteriores se conservan.
        </p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tabla con selección
// ---------------------------------------------------------------------------
function SelectableMembers({
  rows,
  selected,
  onToggle,
  onToggleAll,
  canSelect,
  refDate,
}: {
  rows: MemberListItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  canSelect: boolean;
  refDate: string;
}) {
  const allChecked = rows.length > 0 && rows.every((m) => selected.has(m.id));
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {canSelect ? (
              <th style={{ width: 36 }}>
                <input type="checkbox" aria-label="Seleccionar todos" checked={allChecked} onChange={onToggleAll} />
              </th>
            ) : null}
            <th>Protagonista</th>
            <th className="num">Edad</th>
            <th>Pequeño grupo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              {canSelect ? (
                <td>
                  <input type="checkbox" aria-label={`Seleccionar a ${m.firstName}`} checked={selected.has(m.id)} onChange={() => onToggle(m.id)} />
                </td>
              ) : null}
              <td className="nowrap">
                <Link to={`/protagonistas/${m.id}`}>
                  {m.lastName}, {m.firstName}
                </Link>
              </td>
              <td className="num">{ageAt(m.birthDate, refDate) ?? '—'}</td>
              <td>{m.smallGroup?.name ?? <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return {
    selected,
    toggle: (id: string) =>
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    setAll: (ids: string[], on: boolean) =>
      setSelected((prev) => {
        const n = new Set(prev);
        for (const id of ids) {
          if (on) n.add(id);
          else n.delete(id);
        }
        return n;
      }),
    clear: () => setSelected(new Set()),
  };
}

// ---------------------------------------------------------------------------
// Pestaña: sugeridos por edad
// ---------------------------------------------------------------------------
function ByAge({ members, units }: { members: MemberListItem[]; units: Unit[] }) {
  const { can } = useAuth();
  const year = new Date().getFullYear();
  const [ref, setRef] = useState<'fin' | 'hoy'>('fin');
  const refDate = ref === 'fin' ? `${year}-12-31` : todayIso();
  const sel = useSelection();
  const [dialog, setDialog] = useState<{ rows: MemberListItem[]; targets: Unit[] } | null>(null);

  const withUnit = members.filter((m) => m.unit);
  const noBirth = withUnit.filter((m) => !m.birthDate).length;
  const due = withUnit.filter((m) => dueForTransfer(m.unit!.branch, ageAt(m.birthDate, refDate)));
  const byUnit = useMemo(() => {
    const map = new Map<string, MemberListItem[]>();
    for (const m of due) map.set(m.unit!.id, [...(map.get(m.unit!.id) ?? []), m]);
    return [...map.entries()]
      .map(([id, rows]) => ({ unit: units.find((u) => u.id === id) ?? (rows[0].unit as Unit), rows: rows.sort((a, b) => a.lastName.localeCompare(b.lastName)) }))
      .sort((a, b) => sortUnits(a.unit, b.unit));
  }, [due, units]);

  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <span className="muted">Edad calculada</span>
        <div className="segmented">
          <button className={ref === 'fin' ? 'on' : ''} onClick={() => setRef('fin')}>
            al 31/12/{year}
          </button>
          <button className={ref === 'hoy' ? 'on' : ''} onClick={() => setRef('hoy')}>
            a hoy
          </button>
        </div>
        <span className="muted">
          Aparecen los que tienen la edad máxima de su rama o más (Castores 7, Lobatos 11, Scouts 14, Caminantes 17, Rovers 21).
        </span>
      </div>
      {noBirth ? <div className="alert alert-warn">{noBirth} protagonistas no tienen fecha de nacimiento: no se pueden evaluar por edad.</div> : null}

      {!byUnit.length ? (
        <Card>
          <Empty>Nadie tiene edad de pase {ref === 'fin' ? `a fin de ${year}` : 'hoy'}.</Empty>
        </Card>
      ) : (
        byUnit.map(({ unit, rows }) => {
          const next = NEXT_BRANCH[unit.branch as Branch];
          const targets = next ? units.filter((u) => u.active && u.branch === next).sort(sortUnits) : [];
          const editable = can('members', 'edit', unit.id) && !!next;
          const chosen = rows.filter((m) => sel.selected.has(m.id));
          return (
            <Card
              key={unit.id}
              title={
                <h2 className="row" style={{ gap: 8 }}>
                  <UnitBadge unit={unit} />
                  <ArrowRight size={16} />
                  {next ? BRANCH_INFO[next].label : 'Egresan del Movimiento (cumplen 21)'}
                  <Badge>{rows.length}</Badge>
                </h2>
              }
              actions={
                editable ? (
                  <Button size="sm" disabled={!chosen.length} onClick={() => setDialog({ rows: chosen, targets })}>
                    <ArrowLeftRight /> Pasar {chosen.length ? `(${chosen.length})` : 'seleccionados'}
                  </Button>
                ) : null
              }
              bodyClass=""
            >
              <SelectableMembers
                rows={rows}
                selected={sel.selected}
                onToggle={sel.toggle}
                onToggleAll={() => sel.setAll(rows.map((m) => m.id), !rows.every((m) => sel.selected.has(m.id)))}
                canSelect={editable}
                refDate={refDate}
              />
              {!next ? (
                <div className="card-body muted">Los Rovers egresan a los 21: si siguen en el Grupo, pueden sumarse como adultos.</div>
              ) : null}
            </Card>
          );
        })
      )}

      {dialog ? (
        <BulkTransferDialog members={dialog.rows} targets={dialog.targets} defaultReason="edad" onClose={() => setDialog(null)} onDone={sel.clear} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: elegir chicos de una unidad
// ---------------------------------------------------------------------------
function Choose({ members, units }: { members: MemberListItem[]; units: Unit[] }) {
  const { can } = useAuth();
  const sources = units.filter((u) => can('members', 'edit', u.id)).sort(sortUnits);
  const [fromId, setFromId] = useState(sources[0]?.id ?? '');
  const [q, setQ] = useState('');
  const sel = useSelection();
  const [open, setOpen] = useState(false);
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const rows = members
    .filter((m) => m.unit?.id === fromId && norm(`${m.lastName} ${m.firstName}`).includes(norm(q.trim())))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const chosen = rows.filter((m) => sel.selected.has(m.id));
  const targets = units.filter((u) => u.active && u.id !== fromId).sort(sortUnits);

  if (!sources.length) return <Empty>No tenés permiso para hacer pases en ninguna unidad.</Empty>;
  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <Select value={fromId} onChange={(e) => (setFromId(e.target.value), sel.clear())} aria-label="Unidad de origen">
          {sources.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Button disabled={!chosen.length} onClick={() => setOpen(true)}>
          <ArrowLeftRight /> Pasar a otra unidad {chosen.length ? `(${chosen.length})` : ''}
        </Button>
      </div>
      <Card bodyClass="">
        {!rows.length ? (
          <Empty>{q ? 'No hay coincidencias.' : 'La unidad no tiene protagonistas activos.'}</Empty>
        ) : (
          <SelectableMembers
            rows={rows}
            selected={sel.selected}
            onToggle={sel.toggle}
            onToggleAll={() => sel.setAll(rows.map((m) => m.id), !rows.every((m) => sel.selected.has(m.id)))}
            canSelect
            refDate={todayIso()}
          />
        )}
      </Card>
      {open ? <BulkTransferDialog members={chosen} targets={targets} onClose={() => setOpen(false)} onDone={sel.clear} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña: historial
// ---------------------------------------------------------------------------
function History() {
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);
  const list = useQuery({ queryKey: ['transfers', year], queryFn: () => api.get<TransferRow[]>(`/members/transfers${qs({ year })}`) });
  return (
    <Card
      title={`Pases de ${year}`}
      actions={
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año" style={{ width: 'auto' }}>
          {Array.from({ length: 5 }, (_, i) => current - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      }
      bodyClass="table-wrap"
    >
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <div className="card-body">
          <ErrorBox error={list.error} />
        </div>
      ) : !list.data?.length ? (
        <Empty>No hubo pases en {year}.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Protagonista</th>
              <th>De</th>
              <th />
              <th>A</th>
              <th>Motivo</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((t) => (
              <tr key={t.id}>
                <td className="nowrap">{formatDate(t.date)}</td>
                <td className="nowrap">
                  <Link to={`/protagonistas/${t.member.id}`}>
                    {t.member.lastName}, {t.member.firstName}
                  </Link>
                </td>
                <td>
                  <UnitBadge unit={t.fromUnit} short />
                </td>
                <td>
                  <ArrowRight size={14} className="muted" />
                </td>
                <td>
                  <UnitBadge unit={t.toUnit} short />
                </td>
                <td>{t.reason ? <Badge tone={t.reason === 'edad' ? 'info' : t.reason === 'eleccion' ? 'gold' : 'neutral'}>{t.reasonLabel}</Badge> : '—'}</td>
                <td className="muted">{t.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function TransfersPage() {
  const [tab, setTab] = useState<Tab>('edad');
  const units = useUnits();
  const members = useQuery({ queryKey: ['members', { pases: true }], queryFn: () => api.get<MemberListItem[]>('/members?status=activo') });
  const pending = (members.data ?? []).filter((m) => !m.unit).length;

  return (
    <>
      <PageHeader
        title="Pases de unidad"
        crumbs={[{ to: '/protagonistas', label: 'Protagonistas' }]}
        sub="Pasá chicos de una unidad a otra: de rama por edad, o a otra unidad de la misma rama (por ejemplo, de la Pedro Bártolo a la Luis Conde)."
      />
      <Tabs
        tabs={[
          { key: 'edad', label: 'Sugeridos por edad' },
          { key: 'elegir', label: 'Elegir chicos' },
          { key: 'historial', label: 'Historial' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {pending && tab !== 'historial' ? (
        <div className="alert alert-info mb">
          {pending} protagonistas todavía no tienen unidad: esos se ubican desde{' '}
          <Link to="/protagonistas?unitId=pendientes">Protagonistas → Por asignar unidad</Link>.
        </div>
      ) : null}
      {tab === 'historial' ? (
        <History />
      ) : members.isLoading || units.isLoading ? (
        <Loading />
      ) : members.error ? (
        <ErrorBox error={members.error} />
      ) : tab === 'edad' ? (
        <ByAge members={members.data ?? []} units={units.data ?? []} />
      ) : (
        <Choose members={members.data ?? []} units={units.data ?? []} />
      )}
    </>
  );
}

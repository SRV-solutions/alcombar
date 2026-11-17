import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  GraduationCap,
  Info,
  Pencil,
  Printer,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { BRANCH_INFO, BRANCHES, formatDate, todayIso, type Branch } from '@shared';
import { api } from '../../lib/api';
import { normalize } from '../../help/helpIndex';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Checkbox, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';
import { MONTHS } from './types';
import './calendar.css';
import './saturdays.css';

interface UnitRef {
  id: string;
  name: string;
  code: string;
  branch: string;
}
interface SaturdayRow {
  date: string;
  noActivity: boolean;
  ephemeris: string | null;
  training: string | null;
  serviceNote: string | null;
  meetings: string | null;
  activities: string | null;
  others: string | null;
  services: { eventId: string; unit: UnitRef }[];
  linked: { title: string; link: string | null; unit: string | null }[];
}
interface SaturdaysData {
  year: number;
  canEdit: boolean;
  myUnitIds: string[];
  saturdays: SaturdayRow[];
  otherDays: { date: string; eventId: string; unit: UnitRef }[];
}

/** Cómo se nombra cada rama en el servicio (como en la planilla del Grupo). */
const SERVICE_BRANCH_LABEL: Record<Branch, string> = { castores: 'Castores', lobatos: 'Manadas', scouts: 'Scouts', caminantes: 'Caminantes', rovers: 'Rovers' };
const SERVICE_NOTE_SUGGESTIONS = ['Familia Scout', 'Todas las ramas', 'Misa a cargo de la ACA', 'Familia Scout · Misa a cargo de la ACA'];
const short = (iso: string) => formatDate(iso).slice(0, 5);
const monthShort = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3);

/** Agrupa las unidades de servicio por rama: "Manadas" si están todas las de la rama; si no, cada unidad. */
function serviceGroups(services: SaturdayRow['services'], allUnits: UnitRef[]) {
  const out: { key: string; label: string; title: string; color: string }[] = [];
  for (const b of BRANCHES) {
    const mine = services.filter((s) => s.unit.branch === b).map((s) => s.unit);
    if (!mine.length) continue;
    const branchUnits = allUnits.filter((u) => u.branch === b);
    const color = BRANCH_INFO[b].color;
    if (branchUnits.length > 1 && branchUnits.every((u) => mine.some((m) => m.id === u.id))) {
      out.push({ key: b, label: SERVICE_BRANCH_LABEL[b], title: mine.map((u) => u.name).join(' y '), color });
    } else {
      for (const u of mine) out.push({ key: u.id, label: branchUnits.length > 1 ? u.code : SERVICE_BRANCH_LABEL[b], title: u.name, color });
    }
  }
  return out;
}

function ServicePills({ row, units }: { row: SaturdayRow; units: UnitRef[] }) {
  const groups = serviceGroups(row.services, units);
  if (!groups.length && !row.serviceNote) return <span className="sat-empty">Sin asignar</span>;
  return (
    <div className="sat-pills">
      {groups.map((g) => (
        <span key={g.key} className="sat-pill" style={{ ['--c' as string]: g.color }} title={g.title}>
          {g.label}
        </span>
      ))}
      {row.serviceNote ? <span className="sat-pill sat-pill-note">{row.serviceNote}</span> : null}
    </div>
  );
}

function Line({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="sat-line">
      <span className="sat-line-icon" title={label} aria-label={label}>
        {icon}
      </span>
      <span className="sat-line-text">{children}</span>
    </div>
  );
}

// ---------------- Edición (Jefatura) ----------------
interface EditForm {
  serviceUnitIds: string[];
  serviceNote: string;
  noActivity: boolean;
  activities: string;
  meetings: string;
  ephemeris: string;
  training: string;
  others: string;
}
const toForm = (r: SaturdayRow): EditForm => ({
  serviceUnitIds: r.services.map((s) => s.unit.id),
  serviceNote: r.serviceNote ?? '',
  noActivity: r.noActivity,
  activities: r.activities ?? '',
  meetings: r.meetings ?? '',
  ephemeris: r.ephemeris ?? '',
  training: r.training ?? '',
  others: r.others ?? '',
});

function EditDialog({ data, date, onClose, onSaved }: { data: SaturdaysData; date: string; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const toast = useToast();
  const units = useUnits();
  const [current, setCurrent] = useState(date);
  const row = data.saturdays.find((s) => s.date === current)!;
  const [form, setForm] = useState<EditForm>(() => toForm(row));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const idx = data.saturdays.findIndex((s) => s.date === current);
  const prev = data.saturdays[idx - 1];
  const next = data.saturdays[idx + 1];
  const active = (units.data ?? []).filter((u) => u.active || form.serviceUnitIds.includes(u.id));

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const branchOn = (b: Branch) => {
    const ids = active.filter((u) => u.branch === b).map((u) => u.id);
    return ids.length > 0 && ids.every((id) => form.serviceUnitIds.includes(id));
  };
  const toggleBranch = (b: Branch) => {
    const ids = active.filter((u) => u.branch === b).map((u) => u.id);
    set('serviceUnitIds', branchOn(b) ? form.serviceUnitIds.filter((x) => !ids.includes(x)) : [...new Set([...form.serviceUnitIds, ...ids])]);
  };
  const toggleUnit = (id: string) =>
    set('serviceUnitIds', form.serviceUnitIds.includes(id) ? form.serviceUnitIds.filter((x) => x !== id) : [...form.serviceUnitIds, id]);

  const go = (d: string) => {
    const r = data.saturdays.find((s) => s.date === d)!;
    setCurrent(d);
    setForm(toForm(r));
    setDirty(false);
  };
  const save = async (then?: string) => {
    setBusy(true);
    try {
      if (dirty) {
        await api.put(`/calendar/saturdays/${current}`, form);
        toast.ok(`Sábado ${short(current)} guardado`);
        await onSaved();
      }
      if (then) go(then);
      else onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={
        <span className="sat-edit-title">
          <Button variant="ghost" size="sm" onClick={() => prev && void save(prev.date)} disabled={!prev || busy} aria-label="Sábado anterior">
            <ChevronLeft />
          </Button>
          Sábado {formatDate(current)}
          <Button variant="ghost" size="sm" onClick={() => next && void save(next.date)} disabled={!next || busy} aria-label="Sábado siguiente">
            <ChevronRight />
          </Button>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {next ? (
            <Button variant="secondary" onClick={() => void save(next.date)} loading={busy}>
              Guardar y seguir con el {short(next.date)} <ChevronRight />
            </Button>
          ) : null}
          <Button onClick={() => void save()} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="sat-edit">
        <section>
          <h3>Servicio y Misa</h3>
          <p className="muted sat-edit-hint">Tocá una rama para asignar todas sus unidades. Si es solo una unidad, marcala abajo.</p>
          <div className="sat-branch-toggles">
            {BRANCHES.filter((b) => active.some((u) => u.branch === b)).map((b) => (
              <button
                key={b}
                type="button"
                className={`sat-branch-toggle ${branchOn(b) ? 'on' : ''}`}
                style={{ ['--c' as string]: BRANCH_INFO[b].color }}
                onClick={() => toggleBranch(b)}
                aria-pressed={branchOn(b)}
              >
                {SERVICE_BRANCH_LABEL[b]}
              </button>
            ))}
          </div>
          <div className="sat-unit-checks">
            {active.map((u) => (
              <Checkbox key={u.id} checked={form.serviceUnitIds.includes(u.id)} onChange={() => toggleUnit(u.id)} label={`${u.code} · ${u.name}`} />
            ))}
          </div>
          <Field label="Aclaración del servicio (opcional)" full hint="Por ejemplo: Familia Scout, Todas las ramas o Misa a cargo de la ACA.">
            <Input list="sat-service-notes" value={form.serviceNote} onChange={(e) => set('serviceNote', e.target.value)} maxLength={200} />
          </Field>
          <datalist id="sat-service-notes">
            {SERVICE_NOTE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </section>
        <section>
          <h3>Ese sábado</h3>
          <Checkbox
            checked={form.noActivity}
            onChange={(e) => set('noActivity', e.target.checked)}
            label="No hay actividad (receso, feriado sin actividad, campamento de Grupo…)"
          />
          <div className="form-grid sat-edit-fields">
            <Field label="Actividades" full>
              <Textarea rows={2} value={form.activities} onChange={(e) => set('activities', e.target.value)} placeholder="Ej: Inicio interramas, Fogón de inicio" />
            </Field>
            <Field label="Reuniones">
              <Textarea rows={2} value={form.meetings} onChange={(e) => set('meetings', e.target.value)} placeholder="Ej: Consejo de Grupo" />
            </Field>
            <Field label="Formación">
              <Textarea rows={2} value={form.training} onChange={(e) => set('training', e.target.value)} placeholder="Ej: Aplicación del Sistema de Equipos" />
            </Field>
            <Field label="Efemérides">
              <Textarea rows={2} value={form.ephemeris} onChange={(e) => set('ephemeris', e.target.value)} placeholder="Ej: Día del scout (5/9)" />
            </Field>
            <Field label="Otros">
              <Textarea rows={2} value={form.others} onChange={(e) => set('others', e.target.value)} placeholder="Ej: Feriado largo, Pases de unidades" />
            </Field>
          </div>
        </section>
      </div>
    </Modal>
  );
}

// ---------------- Cambio de día de servicio ----------------
function SwapDialog({ data, row, units, onClose, onDone }: { data: SaturdaysData; row: SaturdayRow; units: UnitRef[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const today = todayIso();
  const [toDate, setToDate] = useState('');
  const [going, setGoing] = useState<string[]>(row.services.map((s) => s.unit.id));
  const [coming, setComing] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const target = data.saturdays.find((s) => s.date === toDate);
  const options = data.saturdays.filter((s) => s.date !== row.date && s.date >= today);
  const label = (s: SaturdayRow) => {
    const g = serviceGroups(s.services, units).map((x) => x.label);
    if (s.serviceNote) g.push(s.serviceNote);
    return g.length ? g.join(' + ') : 'sin servicio';
  };
  const nameOf = (id: string) => units.find((u) => u.id === id)?.name ?? '';
  const pick = (d: string) => {
    setToDate(d);
    setComing(data.saturdays.find((s) => s.date === d)?.services.map((s) => s.unit.id) ?? []);
  };
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const mine = going.some((id) => data.myUnitIds.includes(id)) || coming.some((id) => data.myUnitIds.includes(id));

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/calendar/saturdays/swap', { fromDate: row.date, toDate, unitIds: going, withUnitIds: coming, reason });
      toast.ok('Listo: se cambió el día y les avisamos a los adultos de las unidades.');
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
      wide
      title="Cambiar el día de servicio"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!toDate || !going.length || (!mine && !data.canEdit)}>
            <ArrowLeftRight /> Confirmar el cambio
          </Button>
        </>
      }
    >
      <div className="sat-swap">
        <Field label={`El sábado ${short(row.date)} tiene servicio ${label(row)}. ¿Con qué sábado lo cambiás?`} full>
          <Select value={toDate} onChange={(e) => pick(e.target.value)} autoFocus>
            <option value="">Elegí el sábado…</option>
            {options.map((s) => (
              <option key={s.date} value={s.date}>
                {short(s.date)} · {label(s)}
                {s.noActivity ? ' · sin actividad' : ''}
              </option>
            ))}
          </Select>
        </Field>
        {toDate ? (
          <div className="sat-swap-cols">
            <div className="sat-swap-col">
              <div className="sat-swap-head">
                Pasan del {short(row.date)} al {short(toDate)}
              </div>
              {row.services.map((s) => (
                <Checkbox key={s.unit.id} checked={going.includes(s.unit.id)} onChange={() => toggle(going, setGoing, s.unit.id)} label={s.unit.name} />
              ))}
            </div>
            <ArrowLeftRight className="sat-swap-arrow" aria-hidden />
            <div className="sat-swap-col">
              <div className="sat-swap-head">
                Pasan del {short(toDate)} al {short(row.date)}
              </div>
              {target?.services.length ? (
                target.services.map((s) => (
                  <Checkbox key={s.unit.id} checked={coming.includes(s.unit.id)} onChange={() => toggle(coming, setComing, s.unit.id)} label={s.unit.name} />
                ))
              ) : (
                <span className="muted">Ese sábado no tiene unidades de servicio.</span>
              )}
            </div>
          </div>
        ) : null}
        {toDate ? (
          <Field label="Motivo (opcional, les llega a todos)" full>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ej: ese sábado tenemos salida de unidad" />
          </Field>
        ) : null}
        {toDate && going.length ? (
          <div className="sat-preview">
            <Info />
            <div>
              <strong>{going.map(nameOf).join(', ')}</strong> {going.length > 1 ? 'pasan' : 'pasa'} al sábado {short(toDate)}
              {coming.length ? (
                <>
                  {' '}
                  y <strong>{coming.map(nameOf).join(', ')}</strong> al sábado {short(row.date)}
                </>
              ) : null}
              . Les llega un aviso (en la campanita y por mail) a los adultos de {going.length + coming.length > 1 ? 'esas unidades' : 'esa unidad'}.
              {target?.noActivity ? ' Ojo: ese sábado está marcado sin actividad.' : ''}
              {!mine && !data.canEdit ? ' Solo pueden hacer el cambio los adultos de alguna de esas unidades.' : ''}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

// ---------------- Página ----------------
/** Calendario anual de sábados del Grupo: servicio y misa, actividades, reuniones, formación, efemérides y otros. */
export function SaturdaysPage() {
  const qc = useQueryClient();
  const unitsQ = useUnits();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const year = Number(params.get('anio')) || Number(today.slice(0, 4));
  const [showPast, setShowPast] = useState(false);
  const [filter, setFilter] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<SaturdayRow | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const q = useQuery({ queryKey: ['saturdays', year], queryFn: () => api.get<SaturdaysData>(`/calendar/saturdays?year=${year}`) });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['saturdays'] }), qc.invalidateQueries({ queryKey: ['calendar'] })]);

  const units: UnitRef[] = useMemo(() => (unitsQ.data ?? []).filter((u) => u.active), [unitsQ.data]);
  const d = q.data;
  const isCurrentYear = year === Number(today.slice(0, 4));
  const nextSaturday = d?.saturdays.find((s) => s.date >= today)?.date;

  // Si vienen de un aviso (#s-2026-11-21), se muestra y se resalta ese sábado
  const hashDate = location.hash.startsWith('#s-') ? location.hash.slice(3) : null;
  useEffect(() => {
    if (hashDate && hashDate < today) setShowPast(true);
  }, [hashDate, today]);
  useEffect(() => {
    if (!hashDate || !d) return;
    const el = document.getElementById(`s-${hashDate}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hashDate, d, showPast]);

  const rows = useMemo(() => {
    if (!d) return [];
    const t = normalize(text);
    return d.saturdays.filter((s) => {
      if (isCurrentYear && !showPast && s.date < today) return false;
      if (filter === 'mine' && !s.services.some((x) => d.myUnitIds.includes(x.unit.id))) return false;
      if (filter === 'familia' && !normalize(s.serviceNote ?? '').includes('familia')) return false;
      if (filter && filter !== 'mine' && filter !== 'familia' && !s.services.some((x) => x.unit.branch === filter)) return false;
      if (t) {
        const hay = normalize(
          [s.activities, s.meetings, s.training, s.ephemeris, s.others, s.serviceNote, ...s.services.map((x) => `${x.unit.name} ${x.unit.code}`), ...s.linked.map((l) => l.title)]
            .filter(Boolean)
            .join(' '),
        );
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [d, filter, text, showPast, today, isCurrentYear]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const data = d!;
  const past = data.saturdays.filter((s) => s.date < today).length;
  const setYear = (y: number) => {
    const n = new URLSearchParams(params);
    n.set('anio', String(y));
    setParams(n, { replace: true });
  };
  const canSwap = (s: SaturdayRow) => s.date >= today && s.services.length > 0 && (data.canEdit || s.services.some((x) => data.myUnitIds.includes(x.unit.id)));
  const hasMine = data.myUnitIds.length > 0 && !data.canEdit;

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/calendario', label: 'Calendario' }]}
        title={`Calendario de sábados ${year}`}
        sub={
          data.canEdit
            ? 'Sos parte de la Jefatura: tocá «Editar» en cualquier sábado para cambiar el servicio, las actividades o lo que haga falta.'
            : 'Qué unidad está de servicio cada sábado y qué pasa ese día. Lo arma la Jefatura de Grupo; si tu unidad necesita cambiar su día de servicio, usá «Cambiar día».'
        }
        actions={
          <>
            <div className="cal-month-nav">
              <Button variant="secondary" size="sm" onClick={() => setYear(year - 1)} aria-label="Año anterior">
                <ChevronLeft />
              </Button>
              <span className="cal-month-label sat-year">{year}</span>
              <Button variant="secondary" size="sm" onClick={() => setYear(year + 1)} aria-label="Año siguiente">
                <ChevronRight />
              </Button>
            </div>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </>
        }
      />

      <div className="sat-help card">
        <button type="button" className="sat-help-toggle" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
          <CircleHelp /> ¿Qué hace la rama que está de servicio?
          <ChevronRight className={`sat-help-chev ${showHelp ? 'open' : ''}`} />
        </button>
        {showHelp ? (
          <div className="sat-help-body">
            <p>
              La rama responsable se encarga de la limpieza y el orden de baños, sedes y áreas comunes. También sirve la merienda y limpia los elementos usados.
              Además prepara la celebración de la Santa Misa, excepto el día que está a cargo de la ACA.
            </p>
            <p>
              <strong>Importante: sacar la basura al finalizar el día.</strong>
            </p>
            <p className="muted">
              ¿Tu unidad no puede ese sábado? Tocá «Cambiar día», elegí con qué sábado cambiarlo y listo: a los adultos de las unidades que se mueven les
              llega un aviso al instante.
            </p>
          </div>
        ) : null}
      </div>

      <div className="sat-toolbar no-print">
        <div className="sat-search">
          <Search className="sat-search-icon" />
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar: Consejo, feriado, campamento…" aria-label="Buscar en el calendario" />
        </div>
        <select className="select select-inline" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por servicio">
          <option value="">Todos los sábados</option>
          {hasMine ? <option value="mine">Cuando está de servicio mi unidad</option> : null}
          {BRANCHES.filter((b) => units.some((u) => u.branch === b)).map((b) => (
            <option key={b} value={b}>
              Servicio de {SERVICE_BRANCH_LABEL[b]}
            </option>
          ))}
          <option value="familia">Servicio de Familia Scout</option>
        </select>
        {isCurrentYear && past ? <Checkbox checked={showPast} onChange={(e) => setShowPast(e.target.checked)} label={`Mostrar los que ya pasaron (${past})`} /> : null}
      </div>

      {!rows.length ? (
        <Empty>{text || filter ? 'Ningún sábado coincide con la búsqueda.' : 'No quedan sábados este año.'}</Empty>
      ) : (
        <div className="sat-list">
          {rows.map((s, i) => {
            const newMonth = i === 0 || rows[i - 1].date.slice(5, 7) !== s.date.slice(5, 7);
            const empty = !s.activities && !s.meetings && !s.training && !s.ephemeris && !s.others && !s.linked.length && !s.noActivity;
            const mineToday = s.services.some((x) => data.myUnitIds.includes(x.unit.id)) && !data.canEdit;
            return (
              <div key={s.date}>
                {newMonth ? <h2 className="sat-month">{MONTHS[Number(s.date.slice(5, 7)) - 1]}</h2> : null}
                <article
                  id={`s-${s.date}`}
                  className={['sat-row', s.date < today ? 'past' : '', s.date === nextSaturday ? 'next' : '', s.noActivity ? 'off' : '', hashDate === s.date ? 'focus' : '', mineToday ? 'mine' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="sat-date">
                    <span className="sat-day">{Number(s.date.slice(8, 10))}</span>
                    <span className="sat-mon">{monthShort(s.date)}</span>
                    {s.date === nextSaturday ? <Badge tone="bordo">Próximo</Badge> : null}
                  </div>
                  <div className="sat-service">
                    <span className="sat-label">Servicio y Misa</span>
                    <ServicePills row={s} units={units} />
                    {mineToday ? <span className="sat-mine">Le toca a tu unidad</span> : null}
                  </div>
                  <div className="sat-what">
                    {s.noActivity ? <Badge tone="neutral">Sin actividad</Badge> : null}
                    {s.activities ? (
                      <Line icon={<Sparkles />} label="Actividades">
                        {s.activities}
                      </Line>
                    ) : null}
                    {s.meetings ? (
                      <Line icon={<Users />} label="Reuniones">
                        <strong>{s.meetings}</strong>
                      </Line>
                    ) : null}
                    {s.training ? (
                      <Line icon={<GraduationCap />} label="Formación">
                        {s.training}
                      </Line>
                    ) : null}
                    {s.linked.map((l, k) => (
                      <Line key={k} icon={<Flag />} label="En el calendario">
                        {l.link ? <Link to={l.link}>{l.title}</Link> : l.title}
                        {l.unit ? <span className="muted"> · {l.unit}</span> : null}
                      </Line>
                    ))}
                    {s.ephemeris ? (
                      <Line icon={<BookOpen />} label="Efemérides">
                        <span className="muted">{s.ephemeris}</span>
                      </Line>
                    ) : null}
                    {s.others ? (
                      <Line icon={<Info />} label="Otros">
                        {s.others}
                      </Line>
                    ) : null}
                    {empty ? <span className="sat-empty">Actividad de cada unidad</span> : null}
                  </div>
                  <div className="sat-actions no-print">
                    {canSwap(s) ? (
                      <Button size="sm" variant="secondary" onClick={() => setSwapping(s)}>
                        <ArrowLeftRight /> Cambiar día
                      </Button>
                    ) : null}
                    {data.canEdit ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(s.date)} aria-label={`Editar el sábado ${short(s.date)}`}>
                        <Pencil /> Editar
                      </Button>
                    ) : null}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}

      {data.otherDays.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <strong>Servicios cargados en otros días</strong>
            <ul className="list-plain">
              {data.otherDays.map((o) => (
                <li key={o.eventId}>
                  {formatDate(o.date)} · {o.unit.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {editing ? <EditDialog data={data} date={editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
      {swapping ? <SwapDialog data={data} row={swapping} units={units} onClose={() => setSwapping(null)} onDone={() => void refresh()} /> : null}
    </>
  );
}

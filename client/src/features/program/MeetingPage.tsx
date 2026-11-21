import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, ChevronDown, ExternalLink, FilePlus2, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { formatDate, MEETING_RESPONSIBLE_PRESETS, meetingResponsibleLabel, meetingSchema } from '@shared';
import { api, ApiError, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { adultName, useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, LinkButton, Loading, PageHeader, Select, Textarea } from '../../components/ui';
import { minutes, UnitSelect, useProgramUnit } from './common';
import type { MeetingItemRow, MeetingResponse, SheetSummary } from './types';

interface Row {
  key: number;
  time: string;
  activitySheetId: string;
  title: string;
  responsibleAdultId: string;
  /** Responsable escrito a mano (párroco, Jefatura, dos personas…). */
  responsibleText: string;
  /** Está eligiendo «Otro»: muestra el campo para escribir. */
  other: boolean;
  durationMin: string;
  notes: string;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** El próximo sábado (o hoy, si es sábado). */
function upcomingSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return iso(d);
}
/** Suma minutos a una hora HH:MM. */
const addMinutes = (time: string, m: number) => {
  const [h, mm] = time.split(':').map(Number);
  const t = (h * 60 + mm + m) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t);
/**
 * Minuto del día para ordenar. La madrugada (antes de las 05:00) cuenta como el final del día: en un campamento,
 * el juego nocturno de las 00:30 va después de la velada, no antes del desayuno.
 */
const dayMinute = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h < 5 ? h + 24 : h) * 60 + m;
};
/** Minutos entre dos horas HH:MM (null si falta alguna o la segunda no es posterior). */
const minutesBetween = (from: string, to: string) => {
  if (!isTime(from) || !isTime(to)) return null;
  const d = dayMinute(to) - dayMinute(from);
  return d > 0 && d <= 600 ? d : null;
};
/** Ordena por hora los momentos que la tienen; los que todavía no tienen hora quedan en su lugar. */
function sortByTime<T extends { time: string }>(rs: T[]): T[] {
  const timed = rs
    .map((r, i) => ({ r, i }))
    .filter((x) => isTime(x.r.time))
    .sort((a, b) => dayMinute(a.r.time) - dayMinute(b.r.time) || a.i - b.i)
    .map((x) => x.r);
  let k = 0;
  const out = rs.map((r) => (isTime(r.time) ? timed[k++] : r));
  return out.every((r, i) => r === rs[i]) ? rs : out;
}

let seq = 0;
const toRow = (i: MeetingItemRow): Row => ({
  key: ++seq,
  time: i.time ? i.time.slice(0, 5) : '',
  activitySheetId: i.activitySheetId ?? '',
  title: i.title ?? '',
  responsibleAdultId: i.responsibleAdultId ?? '',
  responsibleText: i.responsibleAdultId ? '' : (i.responsibleText ?? ''),
  other: !i.responsibleAdultId && !!i.responsibleText,
  durationMin: i.durationMin?.toString() ?? '',
  notes: i.notes ?? '',
});
const emptyRow = (time = ''): Row => ({ key: ++seq, time, activitySheetId: '', title: '', responsibleAdultId: '', responsibleText: '', other: false, durationMin: '', notes: '' });

/** Programa → Programa del sábado: la grilla de la reunión de una unidad, con fichas o momentos sueltos. */
export function MeetingPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { unitId, setUnitId, unit, options, loading } = useProgramUnit('view');
  const date = params.get('date') || upcomingSaturday();
  const setDate = (d: string) => {
    const n = new URLSearchParams(params);
    n.set('date', d);
    if (unitId) n.set('unitId', unitId);
    setParams(n, { replace: true });
  };
  const q = useQuery({
    queryKey: ['program-meeting', unitId, date],
    queryFn: () => api.get<MeetingResponse>(`/program/meetings${qs({ unitId, date })}`),
    enabled: !!unitId && !!date,
    refetchOnWindowFocus: false,
  });
  const dates = useQuery({ queryKey: ['program-meeting-dates', unitId], queryFn: () => api.get<string[]>(`/program/meetings/dates${qs({ unitId })}`), enabled: !!unitId });
  const sheets = useQuery({ queryKey: ['program-sheets', unitId, '', ''], queryFn: () => api.get<SheetSummary[]>(`/program/sheets${qs({ unitId })}`), enabled: !!unitId });
  const canEdit = !!q.data?.canEdit;
  const adults = useAdults(canEdit);

  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  /** El momento que se está editando: los demás quedan plegados en un renglón resumen. */
  const [openKey, setOpenKey] = useState<number | null>(null);
  const linked = useRef<string | null>(null);
  const navigate = useNavigate();
  const { can } = useAuth();

  // Cargar lo guardado cada vez que cambia la unidad, la fecha o vuelve del servidor.
  useEffect(() => {
    if (!q.data) return;
    const p = q.data.program;
    // Siempre en orden de hora, y todo plegado: se ve el día entero de un vistazo
    let loaded = sortByTime(p ? p.items.map(toRow) : []);
    setNotes(p?.notes ?? '');
    setDirty(false);
    setRowErrors({});
    setOpenKey(null);
    // Vuelve de crear una ficha para un momento (?vincular=<ficha>&fila=<n>): se vincula y se guarda solo
    const link = params.get('vincular');
    const fila = Number(params.get('fila'));
    if (link && linked.current !== link) {
      linked.current = link;
      const n = new URLSearchParams(params);
      n.delete('vincular');
      n.delete('fila');
      setParams(n, { replace: true });
      if (Number.isInteger(fila) && loaded[fila] && !loaded[fila].activitySheetId) {
        loaded = loaded.map((r, j) => (j === fila ? { ...r, activitySheetId: link } : r));
        setRows(loaded);
        void persist(loaded, p?.notes ?? '', 'Ficha creada y vinculada al momento');
        return;
      }
    }
    setRows(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, unitId, date]);

  const sheetById = useMemo(() => new Map((sheets.data ?? []).map((s) => [s.id, s])), [sheets.data]);
  // Momentos que se pisan con el siguiente: terminan después de que el otro empieza
  const overlaps = useMemo(() => {
    const out = new Map<number, string>();
    rows.forEach((r, i) => {
      const next = rows[i + 1];
      const n = Number(r.durationMin);
      if (!next || !n || !/^\d{2}:\d{2}$/.test(r.time) || !/^\d{2}:\d{2}$/.test(next.time)) return;
      const gap = minutesBetween(r.time, next.time);
      const end = addMinutes(r.time, n);
      const name = next.title.trim() || sheetById.get(next.activitySheetId)?.name || 'el siguiente momento';
      if (gap === null) out.set(r.key, `Empieza a la misma hora o después que «${name}» (${next.time}): revisá el orden.`);
      else if (n > gap) out.set(r.key, `Se pisa ${n - gap} min con «${name}»: termina a las ${end} y el otro empieza a las ${next.time}.`);
    });
    return out;
  }, [rows, sheetById]);
  const sheetGroups = useMemo(() => {
    const all = sheets.data ?? [];
    return {
      today: all.filter((s) => s.date === date),
      others: all.filter((s) => s.date !== date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    };
  }, [sheets.data, date]);
  const adultOptions = useMemo(() => (adults.data ?? []).filter((a) => a.status !== 'baja').sort((a, b) => a.lastName.localeCompare(b.lastName)), [adults.data]);
  // Primero los de la unidad; después el resto del Grupo (un sinodal de otra unidad que viene a dar un taller)
  const unitAdults = useMemo(() => adultOptions.filter((a) => (a.assignments ?? []).some((c) => c.unitId === unitId)), [adultOptions, unitId]);
  const otherAdults = useMemo(() => adultOptions.filter((a) => !unitAdults.includes(a)), [adultOptions, unitAdults]);
  const pickResponsible = (key: number, value: string) => {
    if (value === '__otro') update(key, { responsibleAdultId: '', other: true });
    else if (value.startsWith('txt:')) update(key, { responsibleAdultId: '', other: true, responsibleText: value.slice(4) });
    else update(key, { responsibleAdultId: value, other: false, responsibleText: '' });
  };

  const update = (key: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  /**
   * Cambiar la hora de un momento ajusta las duraciones para que nada se pise: este dura hasta que empieza el
   * siguiente, y el anterior, hasta que empieza este.
   */
  const changeTime = (key: number, time: string) => {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      if (i < 0) return rs;
      // Si con la hora nueva el momento va a cambiar de lugar, no se tocan las duraciones de sus vecinos de ahora
      const before = rs[i - 1];
      const after = rs[i + 1];
      const stays =
        isTime(time) && (!before || !isTime(before.time) || dayMinute(before.time) <= dayMinute(time)) && (!after || !isTime(after.time) || dayMinute(time) <= dayMinute(after.time));
      if (!stays) return rs.map((r, j) => (j === i ? { ...r, time } : r));
      return rs.map((r, j) => {
        if (j === i) {
          const next = rs[i + 1];
          const d = next ? minutesBetween(time, next.time) : null;
          return { ...r, time, ...(d ? { durationMin: String(d) } : {}) };
        }
        if (j === i - 1) {
          const d = minutesBetween(r.time, time);
          return d ? { ...r, durationMin: String(d) } : r;
        }
        return r;
      });
    });
    setDirty(true);
  };
  /** Y al revés: cambiar los minutos de un momento corre la hora del siguiente para que empiece cuando este termina. */
  const changeDuration = (key: number, durationMin: string) => {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      if (i < 0) return rs;
      const n = Number(durationMin);
      const start = rs[i].time;
      const shift = /^\d{2}:\d{2}$/.test(start) && durationMin !== '' && Number.isFinite(n) && n > 0 && n <= 600;
      return rs.map((r, j) => (j === i ? { ...r, durationMin } : j === i + 1 && shift ? { ...r, time: addMinutes(start, n) } : r));
    });
    setDirty(true);
  };
  /** Acomoda los momentos por hora (al salir del campo de hora o de minutos, y antes de guardar). */
  const resort = () => setRows((rs) => sortByTime(rs));
  /** El orden lo da la hora: solo se mueve a mano un momento que todavía no la tiene (o dos a la misma hora). */
  const canMove = (i: number, d: -1 | 1) => {
    const a = rows[i];
    const b = rows[i + d];
    return !!a && !!b && (!isTime(a.time) || !isTime(b.time) || a.time === b.time);
  };
  const move = (i: number, d: -1 | 1) => {
    if (!canMove(i, d)) return;
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const n = [...rs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setDirty(true);
  };
  const add = () => {
    // Empieza cuando termina el último momento con hora; queda abierto para completarlo y los demás se pliegan
    const last = [...rows].reverse().find((r) => isTime(r.time));
    const next = last ? (Number(last.durationMin) > 0 ? addMinutes(last.time, Number(last.durationMin)) : '') : rows.length ? '' : '14:30';
    const row = emptyRow(next);
    setRows(sortByTime([...rows, row]));
    setOpenKey(row.key);
    setDirty(true);
    requestAnimationFrame(() => document.querySelector('.meeting-item.open')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const remove = (key: number) => {
    setRows((rs) => rs.filter((r) => r.key !== key));
    setDirty(true);
  };
  /** Crear la ficha REME de un momento: guarda lo que haya cambiado, abre la ficha nueva y al volver queda vinculada. */
  const createSheetFor = async (i: number) => {
    const r = rows[i];
    if (dirty && !(await persist(rows, notes))) return;
    navigate(`/programa/fichas/nueva${qs({ unitId, date, nombre: r.title.trim(), min: r.durationMin, volver: 'sabado', fila: String(i) })}`);
  };
  const canCreateSheet = !!unitId && can('activities', 'create', unitId);
  const pickSheet = (key: number, id: string) => {
    const s = sheetById.get(id);
    const row = rows.find((r) => r.key === key);
    update(key, { activitySheetId: id, ...(s?.durationMin && !row?.durationMin ? { durationMin: String(s.durationMin) } : {}) });
  };

  /** Guarda el programa (las filas que se le pasan). Devuelve si salió bien. */
  const persist = async (rowsArg: Row[], notesArg: string, okMessage = 'Programa guardado'): Promise<boolean> => {
    const payload = {
      unitId,
      date,
      notes: notesArg,
      items: rowsArg.map((r) => ({
        time: r.time,
        activitySheetId: r.activitySheetId || null,
        title: r.title,
        responsibleAdultId: r.responsibleAdultId || null,
        responsibleText: r.responsibleAdultId ? null : r.responsibleText.trim() || null,
        durationMin: r.durationMin,
        notes: r.notes,
      })),
    };
    const check = meetingSchema.safeParse(payload);
    if (!check.success) {
      const errs: Record<number, string> = {};
      for (const i of check.error.issues) if (i.path[0] === 'items' && typeof i.path[1] === 'number') errs[rowsArg[i.path[1]].key] ??= i.message;
      setRowErrors(errs);
      // Se abre el primer momento con problema, para verlo sin buscarlo
      const firstBad = rowsArg.find((r) => errs[r.key]);
      if (firstBad) setOpenKey(firstBad.key);
      toast.error(Object.keys(errs).length ? 'Revisá los momentos marcados' : check.error.issues[0].message);
      return false;
    }
    setBusy(true);
    try {
      await api.put('/program/meetings', payload);
      toast.ok(okMessage);
      setDirty(false);
      setRowErrors({});
      await qc.invalidateQueries({ queryKey: ['program-meeting', unitId, date] });
      void qc.invalidateQueries({ queryKey: ['program-meeting-dates', unitId] });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.details) toast.error(`${e.message}: ${Object.values(e.details)[0]}`);
      else toast.error(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    const sorted = sortByTime(rows);
    if (sorted !== rows) setRows(sorted);
    void persist(sorted, notes);
  };
  const adultById = new Map(adultOptions.map((a) => [a.id, a]));
  /** Lo que se ve de un momento cuando está plegado. */
  const summaryOf = (r: Row) => {
    const sheet = r.activitySheetId ? sheetById.get(r.activitySheetId) : null;
    const n = Number(r.durationMin);
    const who = r.responsibleAdultId ? adultById.get(r.responsibleAdultId) : null;
    return {
      end: isTime(r.time) && n > 0 ? addMinutes(r.time, n) : '',
      name: r.title.trim() || sheet?.name || '',
      sheetExtra: sheet ? (r.title.trim() ? `${sheet.code} · ${sheet.name}` : sheet.code) : '',
      who: who ? `${who.firstName} ${who.lastName}` : r.responsibleText.trim(),
      dur: n > 0 ? minutes(n) : '',
    };
  };

  if (loading) return <Loading />;
  if (!options.length) return <Empty>No tenés unidades para armar el programa del sábado.</Empty>;

  const total = rows.reduce((t, r) => t + (Number(r.durationMin) || 0), 0);
  const saved = q.data?.program;
  // También lo impreso va en orden de hora, aunque se haya guardado en otro orden
  const printRows = sortByTime((saved?.items ?? []).map((i) => ({ ...i, time: i.time?.slice(0, 5) ?? '' }))).map((i) => ({
    time: i.time,
    what: i.sheet ? `${i.sheet.name} (${i.sheet.code})` : i.title ?? '',
    extra: [i.sheet && i.title ? i.title : '', i.notes ?? ''].filter(Boolean).join(' · '),
    who: meetingResponsibleLabel(i),
    dur: minutes(i.durationMin),
  }));
  const readTable = (
    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '12%' }}>Hora</th>
          <th style={{ width: 'auto' }}>Actividad</th>
          <th style={{ width: '24%' }}>Responsable</th>
          <th style={{ width: '12%' }}>Duración</th>
        </tr>
      </thead>
      <tbody>
        {printRows.map((r, i) => (
          <tr key={i}>
            <td>{r.time || '—'}</td>
            <td>
              <strong>{r.what}</strong>
              {r.extra ? <div>{r.extra}</div> : null}
            </td>
            <td>{r.who || '—'}</td>
            <td>{r.dur || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <PageHeader
        title="Programa del sábado"
        sub="La grilla de la reunión: qué se hace, a qué hora, quién lo lleva. Podés usar fichas de la unidad o momentos sueltos (formación, juego, merienda)."
        actions={
          <>
            {saved ? (
              <Button variant="secondary" onClick={() => window.print()} disabled={dirty} title={dirty ? 'Guardá antes de imprimir' : undefined}>
                <Printer /> Imprimir
              </Button>
            ) : null}
            {canEdit ? (
              <Button onClick={save} loading={busy} disabled={!dirty}>
                <Save /> Guardar programa
              </Button>
            ) : null}
          </>
        }
      />
      <div className="toolbar no-print">
        <UnitSelect value={unitId} onChange={setUnitId} options={options} />
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Fecha" style={{ width: 'auto' }} />
        {dates.data?.length ? (
          <Select value={dates.data.includes(date) ? date : ''} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Programas guardados" style={{ width: 'auto' }}>
            <option value="">Programas guardados ({dates.data.length})</option>
            {dates.data.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </Select>
        ) : null}
        {date !== upcomingSaturday() ? (
          <Button variant="ghost" onClick={() => setDate(upcomingSaturday())}>
            <CalendarDays /> Próximo sábado
          </Button>
        ) : null}
      </div>

      {q.data?.camps?.length ? (
        <div className="alert alert-info mb no-print">
          Este día es parte de{' '}
          {q.data.camps.map((c, i) => (
            <span key={c.id}>
              {i ? ' y ' : ''}
              <Link to={`/campamentos/${c.id}`}>«{c.name}»</Link>
            </span>
          ))}
          : lo que cargues acá es el cronograma de ese día y se ve en el campamento.
        </div>
      ) : null}
      {q.isLoading || !q.data ? (
        q.error ? <ErrorBox error={q.error} /> : <Loading />
      ) : canEdit ? (
        <div className="no-print">
          {dirty ? <div className="alert alert-warn mb">Hay cambios sin guardar.</div> : null}
          <Card
            title={`${unit?.name ?? ''} · ${formatDate(date)}`}
            actions={
              saved ? (
                <ConfirmButton
                  size="sm"
                  title="Borrar programa"
                  message={`¿Borrar el programa del ${formatDate(date)}? Las fichas no se borran.`}
                  confirmLabel="Borrar"
                  onConfirm={async () => {
                    try {
                      await api.del(`/program/meetings${qs({ unitId, date })}`);
                      toast.ok('Programa borrado');
                      await qc.invalidateQueries({ queryKey: ['program-meeting', unitId, date] });
                      void qc.invalidateQueries({ queryKey: ['program-meeting-dates', unitId] });
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  <Trash2 /> Borrar
                </ConfirmButton>
              ) : null
            }
          >
            {!rows.length ? (
              <Empty icon={<CalendarDays />}>
                {saved ? 'El programa quedó vacío.' : 'Todavía no hay programa para este día.'} Agregá el primer momento.
              </Empty>
            ) : (
              <div className="meeting-list">
                <div className="meeting-head" aria-hidden>
                  <span>Hora</span>
                  <span>Actividad</span>
                  <span>Responsable</span>
                  <span>Duración</span>
                </div>
                {rows.map((r, i) => {
                  const sheet = r.activitySheetId ? sheetById.get(r.activitySheetId) : null;
                  const open = openKey === r.key;
                  const sum = summaryOf(r);
                  const warn = overlaps.get(r.key) || rowErrors[r.key];
                  return (
                    <div key={r.key} className={`meeting-item${open ? ' open' : ''}`}>
                      <button type="button" className="meeting-summary" aria-expanded={open} onClick={() => setOpenKey(open ? null : r.key)} title={open ? 'Plegar' : 'Desplegar para editar'}>
                        <span className="ms-time">
                          {r.time || <span className="muted">Sin hora</span>}
                          {sum.end ? <span className="ms-end"> a {sum.end}</span> : null}
                        </span>
                        <span className="ms-what">
                          <strong>{sum.name || <span className="muted">Momento sin nombre</span>}</strong>
                          {sum.sheetExtra ? <span className="ms-sheet">{sum.sheetExtra}</span> : null}
                        </span>
                        <span className="ms-who">{sum.who || <span className="muted">Sin responsable</span>}</span>
                        <span className="ms-dur">{sum.dur}</span>
                        <span className="ms-icons">
                          {warn ? <AlertTriangle className="ms-warn" aria-label="Tiene un aviso" /> : null}
                          <ChevronDown className="ms-chevron" aria-hidden />
                        </span>
                      </button>
                      {open ? (
                    <div className="meeting-row">
                      <Field label="Hora">
                        <Input type="time" value={r.time} onChange={(e) => changeTime(r.key, e.target.value)} onBlur={resort} />
                      </Field>
                      <div className="what stack" style={{ gap: 6 }}>
                        <Field label="Ficha (opcional)">
                          <Select value={r.activitySheetId} onChange={(e) => pickSheet(r.key, e.target.value)} aria-label="Ficha del momento">
                            <option value="">— Sin ficha (momento suelto) —</option>
                            {sheetGroups.today.length ? (
                              <optgroup label="Fichas de este día">
                                {sheetGroups.today.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.code} · {s.name}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                            <optgroup label="Otras fichas de la unidad">
                              {sheetGroups.others.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.code} · {s.name}
                                  {s.date ? ` (${formatDate(s.date)})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          </Select>
                        </Field>
                        <Input
                          placeholder={sheet ? 'Título (opcional, si no usa el de la ficha)' : 'Título: formación, juego, merienda…'}
                          value={r.title}
                          onChange={(e) => update(r.key, { title: e.target.value })}
                          invalid={!!rowErrors[r.key]}
                          aria-label="Título"
                        />
                        <Input placeholder="Notas" value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} aria-label="Notas" />
                        <div className="meeting-sheet-line">
                        {sheet ? (
                          <Link to={`/programa/fichas/${sheet.id}`} className="meeting-sheet-link">
                            <ExternalLink size={14} /> Ver la ficha {sheet.code}
                          </Link>
                        ) : canCreateSheet && !r.activitySheetId ? (
                          <button type="button" className="meeting-sheet-link" disabled={busy} onClick={() => void createSheetFor(i)}>
                            <FilePlus2 size={14} /> Crear la ficha REME de este momento
                          </button>
                        ) : null}
                        {rowErrors[r.key] ? <span className="error" style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{rowErrors[r.key]}</span> : null}
                        {sheet && sheet.status !== 'aprobada' && sheet.status !== 'realizada' && sheet.status !== 'evaluada' ? (
                          <span className="muted" style={{ fontSize: '0.82rem' }}>
                            Ojo: la ficha todavía no está aprobada.
                          </span>
                        ) : null}
                        </div>
                      </div>
                      <Field label="Responsable">
                        <Select value={r.other ? '__otro' : r.responsibleAdultId} onChange={(e) => pickResponsible(r.key, e.target.value)}>
                          <option value="">—</option>
                          {unitAdults.length ? (
                            <optgroup label={`De ${unit?.name ?? 'la unidad'}`}>
                              {unitAdults.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.lastName}, {a.firstName}
                                  {a.totem ? ` «${a.totem}»` : ''}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          <optgroup label="Otro">
                            {MEETING_RESPONSIBLE_PRESETS.map((p) => (
                              <option key={p} value={`txt:${p}`}>
                                {p}
                              </option>
                            ))}
                            <option value="__otro">Otro (escribirlo)…</option>
                          </optgroup>
                          <optgroup label="Otros adultos del Grupo">
                            {otherAdults.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.lastName}, {a.firstName}
                                {a.totem ? ` «${a.totem}»` : ''}
                              </option>
                            ))}
                          </optgroup>
                        </Select>
                        {r.other ? (
                          <Input
                            style={{ marginTop: 4 }}
                            value={r.responsibleText}
                            maxLength={120}
                            placeholder="Quién lo lleva: Párroco, Puma y Aldi…"
                            aria-label="Responsable (otro)"
                            onChange={(e) => update(r.key, { responsibleText: e.target.value })}
                          />
                        ) : null}
                      </Field>
                      <Field label="Min.">
                        <Input type="number" min={0} max={600} value={r.durationMin} invalid={!!overlaps.get(r.key)} onChange={(e) => changeDuration(r.key, e.target.value)} onBlur={resort} />
                      </Field>
                      <div className="row-actions" style={{ paddingTop: 22 }}>
                        {/* El orden lo da la hora: las flechas quedan solo para un momento sin hora */}
                        {canMove(i, -1) ? (
                          <Button variant="ghost" size="sm" className="btn-icon" onClick={() => move(i, -1)} aria-label="Subir" title="Subir">
                            <ArrowUp />
                          </Button>
                        ) : null}
                        {canMove(i, 1) ? (
                          <Button variant="ghost" size="sm" className="btn-icon" onClick={() => move(i, 1)} aria-label="Bajar" title="Bajar">
                            <ArrowDown />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="btn-icon" onClick={() => remove(r.key)} aria-label="Quitar este momento" title="Quitar este momento">
                          <X />
                        </Button>
                      </div>
                    </div>
                      ) : null}
                      {overlaps.get(r.key) ? (
                        <div className="meeting-overlap" role="alert">
                          <AlertTriangle size={14} /> {overlaps.get(r.key)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="row mt" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span className="row" style={{ gap: 8 }}>
                <Button variant="secondary" onClick={add} className="meeting-add">
                  <Plus /> Agregar momento
                </Button>
                <LinkButton to={`/programa/fichas/nueva${qs({ unitId })}`} variant="ghost">
                  Crear una ficha nueva
                </LinkButton>
              </span>
              {total ? <span className="muted">Duración total: {minutes(total)}</span> : null}
            </div>
            <div className="mt">
              <Field label="Notas del día" hint="Avisos, qué traer, quién abre la sede…">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
          </Card>
        </div>
      ) : !saved ? (
        <Empty icon={<CalendarDays />}>No hay programa cargado para el {formatDate(date)}.</Empty>
      ) : (
        <div className="no-print">
          <Card title={`${unit?.name ?? ''} · ${formatDate(date)}`}>
            {readTable}
            {saved.notes ? <p style={{ whiteSpace: 'pre-wrap' }}>{saved.notes}</p> : null}
          </Card>
        </div>
      )}

      {saved ? (
        <div className="print-only print-sheet">
          <div className="print-head">
            <div>
              <div className="brand">ALCONBAR · Grupo Scout 155 Divina Providencia</div>
              <div>{unit?.name}</div>
            </div>
            <div className="code">{formatDate(date)}</div>
          </div>
          <h2 style={{ margin: '0 0 10px' }}>Programa del sábado</h2>
          {readTable}
          {saved.notes ? <p style={{ whiteSpace: 'pre-wrap' }}>{saved.notes}</p> : null}
        </div>
      ) : null}
    </>
  );
}

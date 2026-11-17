import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, CalendarDays, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { formatDate, meetingSchema } from '@shared';
import { api, ApiError, qs } from '../../lib/api';
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

let seq = 0;
const toRow = (i: MeetingItemRow): Row => ({
  key: ++seq,
  time: i.time ? i.time.slice(0, 5) : '',
  activitySheetId: i.activitySheetId ?? '',
  title: i.title ?? '',
  responsibleAdultId: i.responsibleAdultId ?? '',
  durationMin: i.durationMin?.toString() ?? '',
  notes: i.notes ?? '',
});
const emptyRow = (time = ''): Row => ({ key: ++seq, time, activitySheetId: '', title: '', responsibleAdultId: '', durationMin: '', notes: '' });

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

  // Cargar lo guardado cada vez que cambia la unidad, la fecha o vuelve del servidor.
  useEffect(() => {
    if (!q.data) return;
    const p = q.data.program;
    setRows(p ? p.items.map(toRow) : []);
    setNotes(p?.notes ?? '');
    setDirty(false);
    setRowErrors({});
  }, [q.data, unitId, date]);

  const sheetById = useMemo(() => new Map((sheets.data ?? []).map((s) => [s.id, s])), [sheets.data]);
  const sheetGroups = useMemo(() => {
    const all = sheets.data ?? [];
    return {
      today: all.filter((s) => s.date === date),
      others: all.filter((s) => s.date !== date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    };
  }, [sheets.data, date]);
  const adultOptions = useMemo(() => (adults.data ?? []).filter((a) => a.status !== 'baja').sort((a, b) => a.lastName.localeCompare(b.lastName)), [adults.data]);

  const update = (key: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
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
    const last = rows[rows.length - 1];
    const next = last?.time && last.durationMin ? addMinutes(last.time, Number(last.durationMin)) : rows.length ? '' : '14:30';
    setRows([...rows, emptyRow(next)]);
    setDirty(true);
  };
  const remove = (key: number) => {
    setRows((rs) => rs.filter((r) => r.key !== key));
    setDirty(true);
  };
  const pickSheet = (key: number, id: string) => {
    const s = sheetById.get(id);
    const row = rows.find((r) => r.key === key);
    update(key, { activitySheetId: id, ...(s?.durationMin && !row?.durationMin ? { durationMin: String(s.durationMin) } : {}) });
  };

  const save = async () => {
    const payload = {
      unitId,
      date,
      notes,
      items: rows.map((r) => ({
        time: r.time,
        activitySheetId: r.activitySheetId || null,
        title: r.title,
        responsibleAdultId: r.responsibleAdultId || null,
        durationMin: r.durationMin,
        notes: r.notes,
      })),
    };
    const check = meetingSchema.safeParse(payload);
    if (!check.success) {
      const errs: Record<number, string> = {};
      for (const i of check.error.issues) if (i.path[0] === 'items' && typeof i.path[1] === 'number') errs[rows[i.path[1]].key] ??= i.message;
      setRowErrors(errs);
      toast.error(Object.keys(errs).length ? 'Revisá los momentos marcados' : check.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await api.put('/program/meetings', payload);
      toast.ok('Programa guardado');
      setRowErrors({});
      await qc.invalidateQueries({ queryKey: ['program-meeting', unitId, date] });
      void qc.invalidateQueries({ queryKey: ['program-meeting-dates', unitId] });
    } catch (e) {
      if (e instanceof ApiError && e.details) toast.error(`${e.message}: ${Object.values(e.details)[0]}`);
      else toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (!options.length) return <Empty>No tenés unidades para armar el programa del sábado.</Empty>;

  const total = rows.reduce((t, r) => t + (Number(r.durationMin) || 0), 0);
  const saved = q.data?.program;
  const printRows = (saved?.items ?? []).map((i) => ({
    time: i.time?.slice(0, 5) ?? '',
    what: i.sheet ? `${i.sheet.name} (${i.sheet.code})` : i.title ?? '',
    extra: [i.sheet && i.title ? i.title : '', i.notes ?? ''].filter(Boolean).join(' · '),
    who: i.responsible ? adultName(i.responsible) : '',
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
                {rows.map((r, i) => {
                  const sheet = r.activitySheetId ? sheetById.get(r.activitySheetId) : null;
                  return (
                    <div key={r.key} className="meeting-row">
                      <Field label="Hora">
                        <Input type="time" value={r.time} onChange={(e) => update(r.key, { time: e.target.value })} />
                      </Field>
                      <div className="what stack" style={{ gap: 6 }}>
                        <Field label="Ficha (opcional)">
                          <Select value={r.activitySheetId} onChange={(e) => pickSheet(r.key, e.target.value)}>
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
                        {rowErrors[r.key] ? <span className="error" style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{rowErrors[r.key]}</span> : null}
                        {sheet && sheet.status !== 'aprobada' && sheet.status !== 'realizada' && sheet.status !== 'evaluada' ? (
                          <span className="muted" style={{ fontSize: '0.82rem' }}>
                            Ojo: la ficha todavía no está aprobada.
                          </span>
                        ) : null}
                      </div>
                      <Field label="Responsable">
                        <Select value={r.responsibleAdultId} onChange={(e) => update(r.key, { responsibleAdultId: e.target.value })}>
                          <option value="">—</option>
                          {adultOptions.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.lastName}, {a.firstName}
                              {a.totem ? ` «${a.totem}»` : ''}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Min.">
                        <Input type="number" min={0} max={600} value={r.durationMin} onChange={(e) => update(r.key, { durationMin: e.target.value })} />
                      </Field>
                      <div className="row-actions" style={{ paddingTop: 22 }}>
                        <Button variant="ghost" size="sm" className="btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" title="Subir">
                          <ArrowUp />
                        </Button>
                        <Button variant="ghost" size="sm" className="btn-icon" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Bajar" title="Bajar">
                          <ArrowDown />
                        </Button>
                        <Button variant="ghost" size="sm" className="btn-icon" onClick={() => remove(r.key)} aria-label="Quitar" title="Quitar">
                          <X />
                        </Button>
                      </div>
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
              <div className="brand">ALCOMBAR · Grupo Scout 155 Divina Providencia</div>
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

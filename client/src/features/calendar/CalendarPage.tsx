import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { CALENDAR_TYPE_LABELS, CALENDAR_TYPES, todayIso } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { Badge, Button, Card, Empty, ErrorBox, LinkButton, Loading, Modal, PageHeader, Select, UnitBadge } from '../../components/ui';
import { EventDetails, EventDialog } from './EventDialog';
import { RotationDialog } from './RotationDialog';
import { addDays, day, longDate, MONTHS, parseIso, time, toIso, typeLabel, WEEKDAYS_SHORT, type CalItem } from './types';
import './calendar.css';

function useNarrow(px = 700) {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${px}px)`).matches : false);
  const [narrow, setNarrow] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [px]);
  return narrow;
}

const MAX_CHIPS = 3;

export function CalendarPage() {
  const { can, me } = useAuth();
  const units = useUnits();
  const narrow = useNarrow();
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const month = params.get('mes') ?? today.slice(0, 7); // 'YYYY-MM'
  const unitId = params.get('unidad') ?? '';
  const type = params.get('tipo') ?? '';
  const [viewPref, setViewPref] = useState<'mes' | 'agenda'>('mes');
  const view = narrow ? 'agenda' : viewPref;
  const [dialog, setDialog] = useState<
    { kind: 'new'; date?: string } | { kind: 'edit'; id: string } | { kind: 'details'; item: CalItem } | { kind: 'day'; date: string } | { kind: 'rotation' } | null
  >(null);

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const monthStart = `${month}-01`;
  const first = parseIso(monthStart);
  const monthEnd = toIso(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  // La grilla arranca el lunes de la semana del día 1 y muestra 6 semanas
  const gridStart = addDays(monthStart, -((first.getDay() + 6) % 7));
  const gridEnd = addDays(gridStart, 41);
  const from = view === 'mes' ? gridStart : monthStart;
  const to = view === 'mes' ? gridEnd : monthEnd;

  const q = useQuery({
    queryKey: ['calendar', from, to, unitId, type],
    queryFn: () => api.get<{ items: CalItem[] }>(`/calendar${qs({ from, to, unitId, type })}`),
  });
  const items = q.data?.items ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) {
      for (let d = day(it.start) < from ? from : day(it.start); d <= day(it.end) && d <= to; d = addDays(d, 1)) {
        map.set(d, [...(map.get(d) ?? []), it]);
      }
    }
    for (const list of map.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
    return map;
  }, [items, from, to]);

  const shiftMonth = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    set('mes', toIso(d).slice(0, 7));
  };
  const canCreate = can('calendar', 'create');
  const open = (it: CalItem) => (it.source === 'calendar' && it.editable ? setDialog({ kind: 'edit', id: it.id }) : setDialog({ kind: 'details', item: it }));
  const chip = (it: CalItem) => (
    <button key={`${it.source}-${it.id}`} className={`cal-chip cal-type-${it.type}`} title={`${it.title}${it.place ? ` · ${it.place}` : ''}`} onClick={() => open(it)}>
      {!it.allDay && time(it.start) ? <span className="cal-time">{time(it.start)}</span> : null}
      {it.unit ? <span className="cal-unit">{it.unit.code}</span> : null}
      {it.title}
    </button>
  );

  // Agenda: los días del mes con algo
  const agendaDays = [...byDay.keys()].filter((d) => d >= monthStart && d <= monthEnd).sort();

  return (
    <>
      <PageHeader
        title="Calendario"
        sub="Actividades del Grupo y de cada unidad: reuniones, servicio rotativo, Consejos, eventos y campamentos."
        actions={
          <>
            <LinkButton to="/calendario/sabados" variant="secondary">
              <CalendarDays /> Sábados del año
            </LinkButton>
            {me?.isJefatura ? (
              <Button variant="secondary" onClick={() => setDialog({ kind: 'rotation' })}>
                <Repeat /> Servicio rotativo
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={() => setDialog({ kind: 'new', date: month === today.slice(0, 7) ? today : monthStart })}>
                <Plus /> Nuevo evento
              </Button>
            ) : null}
          </>
        }
      />

      <div className="cal-toolbar">
        <div className="cal-month-nav">
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft />
          </Button>
          <span className="cal-month-label">
            {MONTHS[first.getMonth()]} {first.getFullYear()}
          </span>
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => set('mes', '')}>
            Hoy
          </Button>
        </div>
        {!narrow ? (
          <div className="segmented" role="tablist" aria-label="Vista">
            <button role="tab" aria-selected={view === 'mes'} className={view === 'mes' ? 'on' : ''} onClick={() => setViewPref('mes')}>
              Mes
            </button>
            <button role="tab" aria-selected={view === 'agenda'} className={view === 'agenda' ? 'on' : ''} onClick={() => setViewPref('agenda')}>
              Agenda
            </button>
          </div>
        ) : null}
        <Select value={unitId} onChange={(e) => set('unidad', e.target.value)} aria-label="Unidad" style={{ width: 'auto' }}>
          <option value="">Grupo y todas las unidades</option>
          <option value="grupo">Solo lo del Grupo</option>
          {units.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => set('tipo', e.target.value)} aria-label="Tipo" style={{ width: 'auto' }}>
          <option value="">Todos los tipos</option>
          {CALENDAR_TYPES.map((t) => (
            <option key={t} value={t}>
              {CALENDAR_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      {q.error ? (
        <ErrorBox error={q.error} />
      ) : view === 'mes' ? (
        <Card bodyClass="">
          {q.isLoading ? (
            <Loading />
          ) : (
            <div className="cal-grid" role="grid" aria-label={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`}>
              {WEEKDAYS_SHORT.map((w) => (
                <div key={w} className="cal-head" role="columnheader">
                  {w}
                </div>
              ))}
              {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((d) => {
                const list = byDay.get(d) ?? [];
                const out = d < monthStart || d > monthEnd;
                return (
                  <div key={d} className={`cal-cell ${out ? 'out' : ''} ${d === today ? 'today' : ''}`} role="gridcell">
                    <button
                      className={`cal-daynum ${canCreate ? 'can-add' : ''}`}
                      onClick={() => canCreate && setDialog({ kind: 'new', date: d })}
                      title={canCreate ? 'Agregar un evento este día' : undefined}
                      aria-label={longDate(d)}
                    >
                      {parseIso(d).getDate()}
                    </button>
                    {list.slice(0, MAX_CHIPS).map(chip)}
                    {list.length > MAX_CHIPS ? (
                      <button className="cal-more" onClick={() => setDialog({ kind: 'day', date: d })}>
                        +{list.length - MAX_CHIPS} más
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card bodyClass="">
          {q.isLoading ? (
            <Loading />
          ) : !agendaDays.length ? (
            <Empty icon={<CalendarDays />}>No hay nada cargado en {MONTHS[first.getMonth()]}.</Empty>
          ) : (
            <div className="cal-agenda">
              {agendaDays.map((d) => (
                <div key={d} className="cal-agenda-day">
                  <div className={`cal-agenda-date ${d === today ? 'today' : ''}`}>
                    {longDate(d)}
                    {d === today ? ' · hoy' : ''}
                  </div>
                  {(byDay.get(d) ?? []).map((it) => (
                    <button key={`${it.source}-${it.id}`} className={`cal-agenda-item cal-type-${it.type}`} onClick={() => open(it)}>
                      <span className="when">{it.allDay || !time(it.start) ? 'Todo el día' : `${time(it.start)}${time(it.end) ? `–${time(it.end)}` : ''}`}</span>
                      <span className="what">
                        <strong>{it.title}</strong>
                        <span className="meta">
                          <Badge>{typeLabel(it.type)}</Badge>
                          {it.unit ? <UnitBadge unit={it.unit} short /> : <span>Grupo</span>}
                          {it.place ? <span>· {it.place}</span> : null}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="cal-legend" aria-label="Referencias">
        {CALENDAR_TYPES.map((t) => (
          <span key={t} className={`cal-type-${t}`}>
            <i /> {CALENDAR_TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      {dialog?.kind === 'new' ? <EventDialog date={dialog.date} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'edit' ? <EventDialog eventId={dialog.id} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'details' ? <EventDetails item={dialog.item} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'rotation' ? <RotationDialog onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'day' ? (
        <Modal title={longDate(dialog.date)} onClose={() => setDialog(null)}>
          <div className="stack">{(byDay.get(dialog.date) ?? []).map((it) => chip(it))}</div>
        </Modal>
      ) : null}
    </>
  );
}

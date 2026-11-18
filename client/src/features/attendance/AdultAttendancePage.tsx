import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCheck, UsersRound } from 'lucide-react';
import { ATTENDANCE_STATUSES, formatDate, todayIso, type AttendanceStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Input, Loading, PageHeader } from '../../components/ui';

interface Sheet {
  date: string;
  canEdit: boolean;
  adults: { id: string; firstName: string; lastName: string; totem: string | null; cargos: string[]; group: string; status: AttendanceStatus | null; notes: string | null }[];
}
interface History {
  year: number;
  dates: { date: string; presentes: number; total: number }[];
  perAdult: { adult_id: string; presentes: number; total: number }[];
}

const SHORT: Record<AttendanceStatus, string> = { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde', justificado: 'Con aviso' };

/** Último sábado (o hoy si es sábado). */
function lastSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Asistencia de los educadores (adultos con cargo) a las actividades del Grupo. La toma la Jefatura de Grupo. */
export function AdultAttendancePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || lastSaturday();
  const setDate = (d: string) => setParams({ date: d }, { replace: true });
  const year = Number(date.slice(0, 4));

  const sheet = useQuery({ queryKey: ['adult-attendance', date], queryFn: () => api.get<Sheet>(`/adult-attendance${qs({ date })}`) });
  const history = useQuery({ queryKey: ['adult-attendance-history', year], queryFn: () => api.get<History>(`/adult-attendance/history${qs({ year })}`) });

  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (sheet.data) {
      setMarks(Object.fromEntries(sheet.data.adults.map((a) => [a.id, a.status])));
      setDirty(false);
    }
  }, [sheet.data]);

  const adults = sheet.data?.adults ?? [];
  // Agrupados por unidad o equipo, en el orden que vienen
  const groups = useMemo(() => {
    const out: { name: string; adults: Sheet['adults'] }[] = [];
    for (const a of adults) {
      const g = out.find((x) => x.name === a.group);
      if (g) g.adults.push(a);
      else out.push({ name: a.group, adults: [a] });
    }
    return out;
  }, [adults]);
  const canEdit = !!sheet.data?.canEdit && date <= todayIso();
  const marked = Object.values(marks).filter(Boolean).length;
  const present = Object.values(marks).filter((s) => s === 'presente' || s === 'tarde').length;
  const hasSaved = adults.some((a) => a.status);
  const pct = (id: string) => {
    const r = history.data?.perAdult.find((p) => p.adult_id === id);
    return r && r.total ? Math.round((r.presentes / r.total) * 100) : null;
  };
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['adult-attendance'] }), qc.invalidateQueries({ queryKey: ['adult-attendance-history'] })]);

  const save = async () => {
    setSaving(true);
    try {
      const records = Object.entries(marks)
        .filter(([, s]) => s)
        .map(([adultId, status]) => ({ adultId, status }));
      await api.put('/adult-attendance', { date, records });
      toast.ok(`Asistencia guardada: ${present} de ${records.length} presentes`);
      await refresh();
      setDirty(false);
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Asistencia de educadores" sub="Quiénes de los adultos con cargo vinieron a cada actividad del Grupo. La toma la Jefatura de Grupo." />
      <div className="toolbar">
        <Input type="date" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Fecha" />
        <span className="muted">{new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })}</span>
      </div>

      <div className="split">
        <Card
          title={
            <h2>
              {formatDate(date)} {hasSaved ? <Badge tone="ok">Tomada</Badge> : <Badge>Sin tomar</Badge>}
            </h2>
          }
          actions={
            canEdit ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setMarks(Object.fromEntries(adults.map((a) => [a.id, marks[a.id] ?? 'presente'])));
                    setDirty(true);
                  }}
                >
                  <CheckCheck /> Resto presentes
                </Button>
                {hasSaved ? (
                  <ConfirmButton
                    size="sm"
                    title="Borrar asistencia"
                    message={`¿Borrar la asistencia de educadores del ${formatDate(date)}?`}
                    confirmLabel="Borrar"
                    onConfirm={async () => {
                      await api.del(`/adult-attendance${qs({ date })}`);
                      await refresh();
                    }}
                  >
                    Borrar
                  </ConfirmButton>
                ) : null}
              </>
            ) : null
          }
          bodyClass="table-wrap"
        >
          {sheet.isLoading ? (
            <Loading />
          ) : sheet.error ? (
            <div className="card-body">
              <ErrorBox error={sheet.error} />
            </div>
          ) : !adults.length ? (
            <Empty icon={<UsersRound />}>No hay adultos con cargo en {year}. Los cargos se cargan en la ficha de cada adulto.</Empty>
          ) : (
            <table className="table att-table">
              <thead>
                <tr>
                  <th>Educador/a</th>
                  <th>Asistencia</th>
                  <th className="num" title={`Asistencia en ${year}`}>
                    % año
                  </th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.name}>
                  <tr className="att-group">
                    <th colSpan={3}>{g.name}</th>
                  </tr>
                  {g.adults.map((a) => (
                    <tr key={a.id}>
                      <td className="att-name">
                        <Link to={`/adultos/${a.id}`}>
                          {a.lastName}, {a.firstName}
                        </Link>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          {a.cargos.join(' · ')}
                        </div>
                      </td>
                      <td className="att-btn">
                        <div className="segmented" role="radiogroup" aria-label={`Asistencia de ${a.firstName}`}>
                          {ATTENDANCE_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={!canEdit}
                              className={marks[a.id] === s ? `on-${s}` : ''}
                              aria-pressed={marks[a.id] === s}
                              onClick={() => {
                                setMarks((prev) => ({ ...prev, [a.id]: prev[a.id] === s ? null : s }));
                                setDirty(true);
                              }}
                            >
                              {SHORT[s]}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="num att-pct muted">{pct(a.id) !== null ? `${pct(a.id)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
          {adults.length && canEdit ? (
            <div className="card-body row between" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="muted">
                {present} presentes · {marked} de {adults.length} marcados
              </span>
              <Button onClick={save} loading={saving} disabled={!dirty || !marked}>
                Guardar asistencia
              </Button>
            </div>
          ) : null}
        </Card>

        <Card title={`Encuentros ${year}`}>
          {history.data?.dates.length ? (
            <ul className="list-plain">
              {history.data.dates.map((d) => (
                <li key={d.date} className="row between">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setDate(d.date);
                    }}
                    style={{ fontWeight: d.date === date ? 700 : undefined }}
                  >
                    {formatDate(d.date)}
                  </a>
                  <span className="muted">
                    {d.presentes}/{d.total} presentes
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Todavía no se tomó asistencia de educadores este año.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

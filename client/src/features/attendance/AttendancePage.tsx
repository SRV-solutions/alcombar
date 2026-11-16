import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarCheck, CheckCheck } from 'lucide-react';
import { ATTENDANCE_STATUSES, BRANCH_INFO, formatDate, todayIso, type AttendanceStatus, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select } from '../../components/ui';

interface Sheet {
  unitId: string;
  date: string;
  canEdit: boolean;
  members: { id: string; firstName: string; lastName: string; smallGroup: { id: string; name: string } | null; status: AttendanceStatus | null; notes: string | null }[];
}
interface History {
  year: number;
  dates: { date: string; presentes: number; total: number }[];
  perMember: { member_id: string; presentes: number; total: number }[];
}

const SHORT: Record<AttendanceStatus, string> = { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde', justificado: 'Con aviso' };

/** Último sábado (o hoy si es sábado). */
function lastSaturday(): string {
  const d = new Date();
  const diff = (d.getDay() + 1) % 7; // sábado = 6
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendancePage() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const [params, setParams] = useSearchParams();
  const viewable = (units.data ?? []).filter((u) => can('attendance', 'view', u.id));
  const defaultUnit = viewable.find((u) => can('attendance', 'edit', u.id))?.id ?? viewable[0]?.id ?? '';
  const unitId = params.get('unitId') || defaultUnit;
  const date = params.get('date') || lastSaturday();
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    n.set(k, v);
    setParams(n, { replace: true });
  };

  const sheet = useQuery({
    queryKey: ['attendance', unitId, date],
    queryFn: () => api.get<Sheet>(`/attendance${qs({ unitId, date })}`),
    enabled: !!unitId,
  });
  const history = useQuery({
    queryKey: ['attendance-history', unitId],
    queryFn: () => api.get<History>(`/attendance/history${qs({ unitId })}`),
    enabled: !!unitId,
  });

  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (sheet.data) {
      setMarks(Object.fromEntries(sheet.data.members.map((m) => [m.id, m.status])));
      setDirty(false);
    }
  }, [sheet.data]);

  const unit = units.data?.find((u) => u.id === unitId);
  const sgLabel = unit ? BRANCH_INFO[unit.branch as Branch]?.smallGroup.one : 'Pequeño grupo';
  const members = useMemo(
    () =>
      [...(sheet.data?.members ?? [])].sort(
        (a, b) => (a.smallGroup?.name ?? 'zzz').localeCompare(b.smallGroup?.name ?? 'zzz') || a.lastName.localeCompare(b.lastName),
      ),
    [sheet.data],
  );
  const canEdit = !!sheet.data?.canEdit && date <= todayIso();
  const marked = Object.values(marks).filter(Boolean).length;
  const present = Object.values(marks).filter((s) => s === 'presente' || s === 'tarde').length;
  const hasSaved = sheet.data?.members.some((m) => m.status);
  const pct = (id: string) => {
    const r = history.data?.perMember.find((p) => p.member_id === id);
    return r && r.total ? Math.round((r.presentes / r.total) * 100) : null;
  };

  const save = async () => {
    setSaving(true);
    try {
      const records = Object.entries(marks)
        .filter(([, s]) => s)
        .map(([memberId, status]) => ({ memberId, status }));
      await api.put('/attendance', { unitId, date, records });
      toast.ok(`Asistencia guardada: ${present} de ${records.length} presentes`);
      await qc.invalidateQueries({ queryKey: ['attendance', unitId] });
      await qc.invalidateQueries({ queryKey: ['attendance-history', unitId] });
      setDirty(false);
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (units.isLoading) return <Loading />;
  if (!viewable.length) return <Empty>No tenés unidades asignadas para tomar asistencia.</Empty>;

  return (
    <>
      <PageHeader title="Asistencia" sub="Registro por encuentro de cada unidad" />
      <div className="toolbar">
        <Select value={unitId} onChange={(e) => set('unitId', e.target.value)} aria-label="Unidad">
          {viewable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={date} max={todayIso()} onChange={(e) => e.target.value && set('date', e.target.value)} aria-label="Fecha" />
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
                    setMarks(Object.fromEntries(members.map((m) => [m.id, marks[m.id] ?? 'presente'])));
                    setDirty(true);
                  }}
                >
                  <CheckCheck /> Resto presentes
                </Button>
                {hasSaved ? (
                  <ConfirmButton
                    size="sm"
                    title="Borrar asistencia"
                    message={`¿Borrar la asistencia del ${formatDate(date)}?`}
                    confirmLabel="Borrar"
                    onConfirm={async () => {
                      await api.del(`/attendance${qs({ unitId, date })}`);
                      await qc.invalidateQueries({ queryKey: ['attendance', unitId] });
                      await qc.invalidateQueries({ queryKey: ['attendance-history', unitId] });
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
          ) : !members.length ? (
            <Empty icon={<CalendarCheck />}>
              La unidad no tiene protagonistas activos. <Link to="/protagonistas/importar">Importalos desde una planilla</Link>.
            </Empty>
          ) : (
            <table className="table att-table">
              <thead>
                <tr>
                  <th>Protagonista</th>
                  <th>{sgLabel}</th>
                  <th>Asistencia</th>
                  <th className="num" title={`Asistencia en ${history.data?.year ?? ''}`}>
                    % año
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="nowrap att-name">
                      <Link to={`/protagonistas/${m.id}`}>
                        {m.lastName}, {m.firstName}
                      </Link>
                    </td>
                    <td className="att-sg">{m.smallGroup?.name ?? '—'}</td>
                    <td className="att-btn">
                      <div className="segmented" role="radiogroup" aria-label={`Asistencia de ${m.firstName}`}>
                        {ATTENDANCE_STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={!canEdit}
                            className={marks[m.id] === s ? `on-${s}` : ''}
                            aria-pressed={marks[m.id] === s}
                            onClick={() => {
                              setMarks((prev) => ({ ...prev, [m.id]: prev[m.id] === s ? null : s }));
                              setDirty(true);
                            }}
                          >
                            {SHORT[s]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="num att-pct muted">{pct(m.id) !== null ? `${pct(m.id)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {members.length && canEdit ? (
            <div className="card-body row between" style={{ borderTop: '1px solid var(--borde)' }}>
              <span className="muted">
                {present} presentes · {marked} de {members.length} marcados
              </span>
              <Button onClick={save} loading={saving} disabled={!dirty || !marked}>
                Guardar asistencia
              </Button>
            </div>
          ) : null}
          {!canEdit && sheet.data && date <= todayIso() ? (
            <div className="card-body muted">Solo lectura: la asistencia la toman los educadores de la unidad.</div>
          ) : null}
        </Card>

        <Card title={`Encuentros ${history.data?.year ?? ''}`}>
          {history.data?.dates.length ? (
            <ul className="list-plain">
              {history.data.dates.map((d) => (
                <li key={d.date} className="row between">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      set('date', d.date);
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
            <Field label="">
              <p className="muted">Todavía no se tomó asistencia este año.</p>
            </Field>
          )}
        </Card>
      </div>
    </>
  );
}

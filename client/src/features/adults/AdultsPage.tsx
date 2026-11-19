import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Plus, UserCheck } from 'lucide-react';
import { ADULT_STATUSES, ADULT_STATUS_LABELS, ageAt, BRANCH_INFO, BRANCHES, trainingSummary, type AdultStatus, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { matchesPerson } from '../../lib/search';
import { FilterBar } from '../../components/FilterBar';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Adult, Assignment } from '../../lib/types';
import { Badge, Button, Empty, ErrorBox, LinkButton, Loading, PageHeader, Select, type Tone } from '../../components/ui';
import { DocsSummaryBadge } from '../members/MembersPage';

export const ADULT_STATUS_TONES: Record<string, Tone> = { alta: 'ok', prueba: 'warn', baja: 'neutral' };

export function AdultStatusBadge({ status }: { status: string }) {
  return <Badge tone={ADULT_STATUS_TONES[status] ?? 'neutral'}>{ADULT_STATUS_LABELS[status as AdultStatus] ?? status}</Badge>;
}

export function assignmentLabel(a: Assignment) {
  const pendingBranch = !a.unit && a.branch ? BRANCH_INFO[a.branch as Branch]?.label ?? a.branch : null;
  const where = a.unit ? a.unit.code : a.supportTeam ? a.supportTeam.name : pendingBranch ? `${pendingBranch} (unidad por asignar)` : 'Grupo';
  return `${a.position} · ${where}`;
}

export function AdultsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const units = useUnits();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [unitId, setUnitId] = useState('');
  const [branch, setBranch] = useState('');
  // Acceso a la app: lo ve y lo filtra quien administra usuarios
  const [access, setAccess] = useState('');
  const seesAccess = can('users', 'view');
  const [downloading, setDownloading] = useState(false);

  const adults = useQuery({
    queryKey: ['adults', { status, unitId }],
    queryFn: () => api.get<Adult[]>(`/adults${qs({ status, unitId })}`),
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setDownloading(true);
    try {
      await api.download('/adults/export', 'adultos.csv');
    } catch (e) {
      toast.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const year = new Date().getFullYear();
  // Búsqueda y rama en el navegador: al instante, por palabras, sin tildes y con DNI con o sin puntos
  const list = (adults.data ?? []).filter((a) => {
    const cur = (a.assignments ?? []).filter((x) => x.year === year);
    if (branch && !cur.some((x) => (x.unit?.branch ?? x.branch) === branch)) return false;
    if (access && (a.access?.state ?? 'sin_usuario') !== access) return false;
    return matchesPerson(q, [a.lastName, a.firstName, a.totem, a.dni, ...cur.map((x) => `${x.position} ${x.unit?.code ?? ''} ${x.supportTeam?.name ?? ''}`)], a.dni);
  });

  return (
    <>
      <PageHeader
        title="Adultos"
        sub={adults.data ? `${list.length} adulto${list.length === 1 ? '' : 's'}` : undefined}
        actions={
          <>
            {can('adults', 'export') ? (
              <Button variant="secondary" onClick={exportCsv} loading={downloading}>
                <Download /> Exportar CSV
              </Button>
            ) : null}
            {can('adults', 'create') ? (
              <LinkButton to="/adultos/nuevo">
                <Plus /> Nuevo adulto
              </LinkButton>
            ) : null}
          </>
        }
      />
      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Buscar por nombre, apellido, tótem, cargo o DNI"
        active={[status, unitId, branch, access].filter(Boolean).length}
        onClear={() => {
          setStatus('');
          setUnitId('');
          setBranch('');
          setAccess('');
        }}
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ADULT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ADULT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label="Unidad">
          <option value="">Todas las unidades</option>
          {(units.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Rama">
          <option value="">Todas las ramas</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {BRANCH_INFO[b].label}
            </option>
          ))}
        </Select>
        {seesAccess ? (
          <Select value={access} onChange={(e) => setAccess(e.target.value)} aria-label="Acceso a la app">
            <option value="">Con o sin acceso</option>
            <option value="activo">Usan la app</option>
            <option value="sin_clave">Invitados, sin entrar</option>
            <option value="sin_usuario">Sin usuario</option>
            <option value="desactivado">Usuario desactivado</option>
          </Select>
        ) : null}
      </FilterBar>
      {adults.isLoading ? (
        <Loading />
      ) : adults.error ? (
        <ErrorBox error={adults.error} />
      ) : !list.length ? (
        <Empty>{q || status || unitId || branch || access ? 'No hay adultos que coincidan con la búsqueda.' : 'Todavía no hay adultos cargados.'}</Empty>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Adulto</th>
                  <th>Cargos {year}</th>
                  <th>Formación</th>
                  <th>Documentación</th>
                  <th>Estado</th>
                  <th title="Si tiene usuario en la app y si ya entró">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => navigate(`/adultos/${a.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {a.lastName}, {a.firstName}
                      </div>
                      {a.totem ? <div className="muted">«{a.totem}»</div> : null}
                    </td>
                    <td>
                      {a.assignments.length ? (
                        a.assignments.map((x) => <div key={x.id}>{assignmentLabel(x)}</div>)
                      ) : (
                        <span className="muted">Sin cargo</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const t = trainingSummary(
                          a.courses.map((c) => ({ name: c.course?.name ?? '', modulesDone: c.modulesDone })),
                          ageAt(a.birthDate),
                        );
                        return (
                          <Badge tone={t.summary.startsWith('Insignia') ? 'ok' : t.summary === 'Sin formación registrada' ? 'warn' : 'info'}>
                            {t.summary}
                          </Badge>
                        );
                      })()}
                    </td>
                    <td>
                      <DocsSummaryBadge docs={a.docs ?? null} />
                    </td>
                    <td>
                      <AdultStatusBadge status={a.status} />
                    </td>
                    <td className="nowrap">
                      {seesAccess ? (
                        a.access ? (
                          <Badge tone={a.access.state === 'activo' ? 'ok' : a.access.state === 'sin_clave' ? 'warn' : 'neutral'}>
                            {a.access.state === 'activo' ? 'Usa la app' : a.access.state === 'sin_clave' ? 'Sin entrar' : 'Desactivado'}
                          </Badge>
                        ) : (
                          <span className="muted">Sin usuario</span>
                        )
                      ) : a.user ? (
                        <span title={a.user.active ? 'Usuario activo' : 'Usuario desactivado'} style={{ color: a.user.active ? 'var(--ok)' : 'var(--gris)' }}>
                          <UserCheck size={18} />
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

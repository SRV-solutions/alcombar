import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, KeyRound, Plus, UserCheck } from 'lucide-react';
import { ADULT_STATUSES, ADULT_STATUS_LABELS, ageAt, BRANCH_INFO, BRANCHES, trainingSummary, type AdultStatus, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { matchesPerson } from '../../lib/search';
import { FilterBar } from '../../components/FilterBar';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Adult, Assignment, UserInfo } from '../../lib/types';
import { Badge, Button, Card, Empty, ErrorBox, LinkButton, Loading, PageHeader, Select, type Tone } from '../../components/ui';
import { AccessDialog } from '../admin/UsersPage';
import { TotemAvatar } from '../../components/TotemAvatar';
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

const roleNames = (u: UserInfo) => u.userRoles.map((ur) => `${ur.role.name}${ur.unit ? ` (${ur.unit.code})` : ''}`);
/** Un solo estado del acceso: desactivado, invitado que todavía no entró, o en uso. */
export function AccessBadge({ user, long }: { user: { active: boolean; hasPassword: boolean } | null; long?: boolean }) {
  if (!user) return long ? <Badge>Sin usuario</Badge> : <span className="muted">Sin usuario</span>;
  if (!user.active) return <Badge>Desactivado</Badge>;
  if (!user.hasPassword) return <Badge tone="warn">{long ? 'Invitado, sin entrar' : 'Sin entrar'}</Badge>;
  return <Badge tone="ok">Usa la app</Badge>;
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
  // Las cuentas de la app: acá se dan, se editan y se desactivan, sin pasar por otra pantalla
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<UserInfo[]>('/users'), enabled: seesAccess });
  const [dialog, setDialog] = useState<{ user: UserInfo | null; adultId: string | null; fixed: boolean } | null>(null);
  const userOf = (adultId: string) => users.data?.find((u) => u.adultId === adultId) ?? null;
  const canGive = can('users', 'create');
  const canManage = can('users', 'edit');

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

  // Cuentas que no son de un adulto del Grupo: sueltas, o de rovers (esas se manejan desde su ficha)
  const filtering = Boolean(status || unitId || branch || access);
  const loose = filtering ? [] : (users.data ?? []).filter((u) => !u.adultId && !u.memberId && matchesPerson(q, [u.name, u.email], null));
  const roverAccounts = filtering ? [] : (users.data ?? []).filter((u) => u.memberId && matchesPerson(q, [u.name], null));
  const withAccess = seesAccess && adults.data ? list.filter((a) => a.access && a.access.state !== 'desactivado').length : null;

  return (
    <>
      <PageHeader
        title="Adultos"
        sub={
          adults.data
            ? `${list.length} adulto${list.length === 1 ? '' : 's'}${withAccess != null ? ` · ${withAccess} con acceso a la app` : ''}`
            : undefined
        }
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
                  <th title="Si puede entrar a la app, con qué roles y si ya entró">Acceso a la app</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => navigate(`/adultos/${a.id}`)}>
                    <td>
                      <div className="person-cell">
                        <TotemAvatar animal={a.avatar} size={34} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {a.lastName}, {a.firstName}
                          </div>
                          {a.totem ? <div className="muted">«{a.totem}»</div> : null}
                        </div>
                      </div>
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
                    <td className="access-cell">
                      {seesAccess ? (
                        (() => {
                          const u = userOf(a.id);
                          const names = u ? roleNames(u) : [];
                          const action = u ? canManage : canGive && a.status !== 'baja';
                          return (
                            <div className="access-row">
                              <div>
                                {a.access ? (
                                  <Badge tone={a.access.state === 'activo' ? 'ok' : a.access.state === 'sin_clave' ? 'warn' : 'neutral'}>
                                    {a.access.state === 'activo' ? 'Usa la app' : a.access.state === 'sin_clave' ? 'Sin entrar' : 'Desactivado'}
                                  </Badge>
                                ) : (
                                  <span className="muted">Sin usuario</span>
                                )}
                                {names.length ? (
                                  <div className="muted access-roles" title={names.join(' · ')}>
                                    {names.slice(0, 2).join(' · ')}
                                    {names.length > 2 ? ` +${names.length - 2}` : ''}
                                  </div>
                                ) : null}
                              </div>
                              {action && users.data ? (
                                <Button
                                  variant={u ? 'ghost' : 'secondary'}
                                  size="sm"
                                  aria-label={u ? `Acceso de ${a.firstName} ${a.lastName}` : `Dar acceso a ${a.firstName} ${a.lastName}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDialog({ user: u, adultId: a.id, fixed: true });
                                  }}
                                >
                                  <KeyRound /> {u ? 'Acceso' : 'Dar acceso'}
                                </Button>
                              ) : null}
                            </div>
                          );
                        })()
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

      {roverAccounts.length ? (
        <div className="mt">
          <Card title={`Rovers con acceso (${roverAccounts.length})`}>
            <p className="muted" style={{ marginTop: 0 }}>
              Entran con su DNI. Su acceso se da, se renueva y se quita desde la ficha de cada uno.
            </p>
            <ul className="list-plain">
              {roverAccounts.map((u) => (
                <li key={u.id} className="row between">
                  <Link to={`/protagonistas/${u.memberId}`}>{u.name}</Link>
                  <AccessBadge user={u} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
      {loose.length ? (
        <div className="mt">
          <Card title={`Cuentas sin ficha de adulto (${loose.length})`}>
            <p className="muted" style={{ marginTop: 0 }}>
              Pueden entrar a la app pero no figuran entre los adultos del Grupo. Si la persona es del Grupo, vinculala con su ficha desde «Acceso».
            </p>
            <ul className="list-plain">
              {loose.map((u) => (
                <li key={u.id} className="access-row">
                  <div>
                    <strong>{u.name}</strong>
                    <div className="muted access-roles">{[u.email, ...roleNames(u)].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <AccessBadge user={u} />
                    {canManage ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ user: u, adultId: null, fixed: false })}>
                        <KeyRound /> Acceso
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
      {seesAccess && canGive && adults.data ? (
        <p className="muted" style={{ fontSize: '0.87rem' }}>
          ¿Alguien que no es adulto del Grupo necesita entrar?{' '}
          <button type="button" className="link-btn" onClick={() => setDialog({ user: null, adultId: null, fixed: false })}>
            Crear una cuenta sin ficha
          </button>
          .
        </p>
      ) : null}
      {dialog ? <AccessDialog user={dialog.user} presetAdultId={dialog.user ? null : dialog.adultId} fixedAdult={dialog.fixed} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

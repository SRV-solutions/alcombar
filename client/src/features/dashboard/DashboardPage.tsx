import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cake, Tent, Upload } from 'lucide-react';
import { BRANCH_INFO, type Branch } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Card, ErrorBox, LinkButton, Loading, PageHeader, UnitBadge } from '../../components/ui';
import { PendingCard, UpcomingCard } from './DashboardExtras';

interface Dashboard {
  year: number;
  totals: { members: number; adults: number; adultsWithoutTraining: number; users: number | null };
  pending?: { members: { branch: string | null; count: number }[]; adults: number };
  units: {
    id: string;
    name: string;
    code: string;
    branch: string;
    minAdults: number | null;
    members: number;
    adults: number;
    docs: { ok: number; expiring: number; expired: number; missing: number } | null;
  }[];
  birthdays: { id: string; name: string; day: number; unit: string }[];
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function DashboardPage() {
  const { me, can, canAll } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;
  const units = [...data.units].sort(
    (a, b) => (BRANCH_INFO[a.branch as Branch]?.order ?? 9) - (BRANCH_INFO[b.branch as Branch]?.order ?? 9) || a.name.localeCompare(b.name),
  );
  const today = new Date();
  const pendingMembers = (data.pending?.members ?? []).reduce((a, p) => a + p.count, 0);
  const pendingAdults = data.pending?.adults ?? 0;

  return (
    <>
      <PageHeader
        title={`¡Hola, ${me?.user.name.split(' ')[0]}!`}
        sub="Resumen del Grupo Scout 155 Divina Providencia"
        actions={
          can('members', 'create') && data.totals.members === 0 ? (
            <LinkButton to="/protagonistas/importar" variant="gold">
              <Upload /> Importar protagonistas
            </LinkButton>
          ) : null
        }
      />

      {pendingMembers || pendingAdults ? (
        <div className="alert alert-warn mb">
          <div className="row between">
            <div>
              <strong>Falta ubicar a gente en su unidad.</strong>{' '}
              {pendingMembers ? (
                <>
                  {pendingMembers} protagonistas (
                  {data.pending!.members.map((p) => `${BRANCH_INFO[p.branch as Branch]?.label ?? 'sin rama'}: ${p.count}`).join(', ')})
                </>
              ) : null}
              {pendingMembers && pendingAdults ? ' y ' : null}
              {pendingAdults ? <>{pendingAdults} adultos con cargo sin unidad</> : null}. Vinieron de Mi Rincón solo con la rama.
            </div>
            <div className="row">
              {pendingMembers && canAll('members', 'view') ? (
                <LinkButton to="/protagonistas?unitId=pendientes" size="sm">
                  <Tent /> Repartir protagonistas
                </LinkButton>
              ) : null}
              {pendingAdults && can('group', 'view') ? (
                <LinkButton to="/grupo/organigrama" size="sm" variant="secondary">
                  Ver cargos por asignar
                </LinkButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-4 mb">
        <div className="card stat">
          <div className="label">Protagonistas</div>
          <div className="value">{data.totals.members}</div>
          <div className="hint">activos en {units.filter((u) => u.members > 0).length} unidades</div>
        </div>
        <div className="card stat">
          <div className="label">Adultos</div>
          <div className="value">{data.totals.adults}</div>
          <div className="hint">en actividad</div>
        </div>
        <div className="card stat">
          <div className="label">Sin formación registrada</div>
          <div className="value" style={{ color: data.totals.adultsWithoutTraining ? 'var(--warn)' : undefined }}>{data.totals.adultsWithoutTraining}</div>
          <div className="hint">adultos</div>
        </div>
        {data.totals.users !== null ? (
          <div className="card stat">
            <div className="label">Usuarios</div>
            <div className="value">{data.totals.users}</div>
            <div className="hint">con acceso a la app</div>
          </div>
        ) : null}
      </div>

      <div className="split">
        <Card title="Unidades" bodyClass="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th className="num">Protagonistas</th>
                <th className="num">Adultos {data.year}</th>
                <th>Documentación</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const d = u.docs;
                const total = d ? d.ok + d.expiring + d.expired + d.missing : 0;
                return (
                  <tr key={u.id}>
                    <td>
                      <Link to={`/grupo/unidades/${u.id}`}>
                        <UnitBadge unit={u} />
                      </Link>
                    </td>
                    <td className="num">{u.members}</td>
                    <td className="num">
                      {u.adults}
                      {u.minAdults && u.adults < u.minAdults ? <span title={`Mínimo: ${u.minAdults}`} style={{ color: 'var(--danger)' }}> ▲</span> : null}
                    </td>
                    <td>
                      {d && total ? (
                        <Link to={`/documentacion?unitId=${u.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <DocBar d={d} total={total} />
                          <span className="muted nowrap">{Math.round((d.ok / total) * 100)}% al día</span>
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card
          title={
            <h2 className="row" style={{ gap: 8 }}>
              <Cake size={18} color="var(--bordo)" /> Cumpleaños de {MONTHS[today.getMonth()]}
            </h2>
          }
        >
          {data.birthdays.length ? (
            <ul className="list-plain">
              {data.birthdays.map((b) => (
                <li key={b.id} className="row between" style={{ fontWeight: b.day === today.getDate() ? 700 : undefined }}>
                  <Link to={`/protagonistas/${b.id}`}>{b.name}</Link>
                  <span className="muted">
                    {b.day} · {b.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No hay cumpleaños cargados para este mes.</p>
          )}
        </Card>
      </div>

      <div className="split mt">
        <UpcomingCard />
        <PendingCard />
      </div>
    </>
  );
}

function DocBar({ d, total }: { d: { ok: number; expiring: number; expired: number; missing: number }; total: number }) {
  const seg = (n: number, color: string, label: string) =>
    n ? <span title={`${label}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: color, display: 'block' }} /> : null;
  return (
    <span style={{ display: 'flex', width: 120, height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--border-soft, var(--border))', flexShrink: 0 }}>
      {seg(d.ok, 'var(--ok)', 'Al día')}
      {seg(d.expiring, 'var(--expiring)', 'Vence pronto')}
      {seg(d.expired, 'var(--danger)', 'Vencido')}
      {seg(d.missing, 'var(--dot-missing)', 'Falta')}
    </span>
  );
}

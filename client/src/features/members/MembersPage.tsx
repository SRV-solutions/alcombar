import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Download, Plus, Search, Tent, Upload, Users } from 'lucide-react';
import { ageAt, BRANCH_INFO, BRANCHES, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { DocSummary, MemberListItem } from '../../lib/types';
import { Badge, Button, Card, Empty, ErrorBox, Input, LinkButton, Loading, PageHeader, Select, UnitBadge } from '../../components/ui';
import { AssignUnitDialog } from './AssignUnitDialog';

export const PENDING = 'pendientes';

export function DocsSummaryBadge({ docs }: { docs: DocSummary | null }) {
  if (!docs || !docs.total) return <span className="muted">—</span>;
  const pending = docs.missing + docs.expired;
  if (!pending && !docs.expiring) return <Badge tone="ok">Completa</Badge>;
  if (!pending) return <Badge tone="warn">{docs.expiring} vence pronto</Badge>;
  return (
    <Badge tone={docs.ok + docs.expiring === 0 ? 'danger' : 'warn'}>
      {docs.ok + docs.expiring}/{docs.total} al día
    </Badge>
  );
}

export function PendingBadge({ branch }: { branch: string | null }) {
  const info = branch ? BRANCH_INFO[branch as Branch] : null;
  return (
    <span className="unit-badge" title="Todavía no tiene unidad asignada">
      <span className="unit-dot" style={{ background: info?.color ?? 'var(--muted)' }} />
      <Badge tone="warn">Por asignar{info ? ` · ${info.label}` : ''}</Badge>
    </span>
  );
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function MembersPage() {
  const { can, canAll, me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const units = useUnits();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // Por defecto, la unidad del usuario (si tiene un rol de unidad)
  const myUnit = me?.roles.find((r) => r.unit)?.unit?.id ?? '';
  const unitId = params.get('unitId') ?? myUnit;
  const pendingView = unitId === PENDING;
  const smallGroupId = params.get('sg') ?? '';
  const branch = params.get('rama') ?? '';
  const status = params.get('status') ?? 'activo';
  const q = params.get('q') ?? '';

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'unitId') {
      next.delete('sg');
      next.delete('rama');
      if (!v) next.set('unitId', '');
    }
    setParams(next, { replace: true });
  };

  const list = useQuery({
    queryKey: ['members', { unitId, smallGroupId, status, branch }],
    queryFn: () => api.get<MemberListItem[]>(`/members${qs({ unitId, smallGroupId, status, branch: pendingView ? branch : '' })}`),
  });
  useEffect(() => setSelected(new Set()), [unitId, branch]);

  const filtered = useMemo(() => {
    const needle = norm(q).trim();
    if (!needle) return list.data ?? [];
    return (list.data ?? []).filter((m) => norm(`${m.lastName} ${m.firstName} ${m.dni ?? ''}`).includes(needle));
  }, [list.data, q]);

  const selectedUnit = units.data?.find((u) => u.id === unitId);
  const sgLabel = selectedUnit ? BRANCH_INFO[selectedUnit.branch as Branch]?.smallGroup.one ?? 'Pequeño grupo' : 'Pequeño grupo';
  // Para ver "por asignar" hay que poder ver a todo el Grupo; para asignar, poder editar alguna unidad
  const canSeePending = canAll('members', 'view');
  const canAssign = can('members', 'edit');
  const pendingInList = !pendingView && !unitId ? (list.data ?? []).filter((m) => !m.unit).length : 0;

  const selectedRows = filtered.filter((m) => selected.has(m.id));
  const selectedBranches = [...new Set(selectedRows.map((m) => m.branch))];
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  return (
    <>
      <PageHeader
        title="Protagonistas"
        sub="Padrón de chicos y chicas del Grupo"
        actions={
          <>
            {can('members', 'export') ? (
              <Button
                variant="secondary"
                onClick={() => api.download(`/members/export${qs({ unitId: pendingView ? '' : unitId })}`, 'protagonistas.csv').catch(toast.error)}
              >
                <Download /> Exportar
              </Button>
            ) : null}
            {can('members', 'edit') ? (
              <LinkButton to="/pases" variant="secondary">
                <ArrowLeftRight /> Pases
              </LinkButton>
            ) : null}
            {can('members', 'create') ? (
              <>
                <LinkButton to="/protagonistas/importar" variant="secondary">
                  <Upload /> Importar planilla
                </LinkButton>
                <LinkButton to={`/protagonistas/nuevo${qs({ unitId: pendingView ? '' : unitId })}`}>
                  <Plus /> Nuevo
                </LinkButton>
              </>
            ) : null}
          </>
        }
      />

      {pendingInList && canSeePending ? (
        <div className="alert alert-warn mb row between">
          <span>
            <strong>{pendingInList}</strong> protagonistas todavía no tienen unidad (vinieron de Mi Rincón solo con la rama).
          </span>
          <Button size="sm" variant="secondary" onClick={() => set('unitId', PENDING)}>
            <Tent /> Repartirlos por unidad
          </Button>
        </div>
      ) : null}

      <div className="toolbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar por nombre o DNI" value={q} onChange={(e) => set('q', e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Select value={unitId} onChange={(e) => set('unitId', e.target.value)} aria-label="Unidad">
          <option value="">Todas las unidades</option>
          {canSeePending ? <option value={PENDING}>Por asignar unidad</option> : null}
          {units.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        {pendingView ? (
          <Select value={branch} onChange={(e) => set('rama', e.target.value)} aria-label="Rama">
            <option value="">Todas las ramas</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {BRANCH_INFO[b].label}
              </option>
            ))}
          </Select>
        ) : null}
        {selectedUnit && selectedUnit.smallGroups.length ? (
          <Select value={smallGroupId} onChange={(e) => set('sg', e.target.value)} aria-label={sgLabel}>
            <option value="">{`Todas las ${BRANCH_INFO[selectedUnit.branch as Branch]?.smallGroup.many.toLowerCase() ?? 'pequeños grupos'}`}</option>
            {selectedUnit.smallGroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}
        {!pendingView ? (
          <Select value={status} onChange={(e) => set('status', e.target.value)} aria-label="Estado">
            <option value="activo">Activos</option>
            <option value="baja">Dados de baja</option>
            <option value="todos">Todos</option>
          </Select>
        ) : null}
      </div>

      {pendingView ? (
        <div className="alert alert-info mb row between">
          <span>
            Tildá a los chicos de una misma rama y tocá <strong>Asignar unidad</strong>. Cada Jefe/a de Unidad puede tomar a los suyos. También podés
            importar la nómina de una unidad: los que coincidan por DNI quedan asignados.
          </span>
          {canAssign ? (
            <Button
              disabled={!selectedRows.length || selectedBranches.length > 1}
              onClick={() => setAssigning(true)}
              title={selectedBranches.length > 1 ? 'Elegí chicos de una sola rama' : undefined}
            >
              <Tent /> Asignar unidad{selectedRows.length ? ` (${selectedRows.length})` : ''}
            </Button>
          ) : null}
        </div>
      ) : null}
      {pendingView && selectedBranches.length > 1 ? <div className="alert alert-warn mb">Elegiste chicos de distintas ramas: asigná de una rama por vez.</div> : null}

      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !filtered.length ? (
          <Empty icon={<Users />}>
            {pendingView
              ? '¡No queda nadie por asignar! Todos los protagonistas tienen unidad.'
              : list.data?.length
                ? 'No hay coincidencias con la búsqueda.'
                : 'Todavía no hay protagonistas cargados en esta selección.'}
            {can('members', 'create') && !list.data?.length && !pendingView ? (
              <div className="mt">
                <LinkButton to="/protagonistas/importar" variant="gold">
                  <Upload /> Importar desde planilla
                </LinkButton>
              </div>
            ) : null}
          </Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {pendingView && canAssign ? (
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map((m) => m.id)))}
                    />
                  </th>
                ) : null}
                <th>Apellido y nombre</th>
                {pendingView ? <th>Rama</th> : !unitId ? <th>Unidad</th> : null}
                {!pendingView ? <th>{sgLabel}</th> : null}
                <th className="num">Edad</th>
                <th>DNI</th>
                {!pendingView ? <th>Documentación</th> : null}
                {status !== 'activo' && !pendingView ? <th>Estado</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => navigate(`/protagonistas/${m.id}`)}>
                  {pendingView && canAssign ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Seleccionar a ${m.firstName}`} checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                    </td>
                  ) : null}
                  <td>
                    <strong>{m.lastName}</strong>, {m.firstName}
                  </td>
                  {pendingView ? (
                    <td>
                      <span className="unit-badge">
                        <span className="unit-dot" style={{ background: BRANCH_INFO[m.branch as Branch]?.color ?? 'var(--muted)' }} />
                        {BRANCH_INFO[m.branch as Branch]?.label ?? 'Sin rama'}
                      </span>
                    </td>
                  ) : !unitId ? (
                    <td>{m.unit ? <UnitBadge unit={m.unit} short /> : <PendingBadge branch={m.branch} />}</td>
                  ) : null}
                  {!pendingView ? <td>{m.smallGroup?.name ?? <span className="muted">—</span>}</td> : null}
                  <td className="num">{ageAt(m.birthDate) ?? '—'}</td>
                  <td className="nowrap">{m.dni ?? <span className="muted">—</span>}</td>
                  {!pendingView ? (
                    <td>
                      <DocsSummaryBadge docs={m.docs} />
                    </td>
                  ) : null}
                  {status !== 'activo' && !pendingView ? (
                    <td>{m.status === 'baja' ? <Badge>Baja</Badge> : <Badge tone="ok">Activo/a</Badge>}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {filtered.length ? (
        <p className="muted mt">
          {filtered.length} protagonistas
          {pendingView ? (
            <>
              {' '}
              por asignar · <Link to="/protagonistas?unitId=">ver el padrón completo</Link>
            </>
          ) : null}
        </p>
      ) : null}

      {assigning ? (
        <AssignUnitDialog
          memberIds={selectedRows.map((m) => m.id)}
          branch={selectedBranches[0] ?? null}
          onClose={() => setAssigning(false)}
          onDone={() => setSelected(new Set())}
        />
      ) : null}
    </>
  );
}

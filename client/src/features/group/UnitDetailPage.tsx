import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Pencil, Plus, Search, Shuffle, Trash2 } from 'lucide-react';
import { ageAt, BRANCH_INFO, defaultSmallGroupKind, formatDate, SMALL_GROUP_KINDS, smallGroupSchema, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Adult, MemberListItem, SmallGroup, Unit } from '../../lib/types';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmButton,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
  UnitBadge,
} from '../../components/ui';
import { UnitFormModal } from './UnitsPage';
import { matchesPerson } from '../../lib/search';

type SmallGroupForm = z.input<typeof smallGroupSchema>;

const KIND_LABELS: Record<string, string> = {
  equipo: 'Equipo',
  seisena: 'Seisena',
  patrulla: 'Patrulla',
};

function SmallGroupModal({ unit, group, adults, onClose }: { unit: Unit; group?: SmallGroup; adults: Adult[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SmallGroupForm>({
    resolver: zodResolver(smallGroupSchema),
    defaultValues: group
      ? {
          unitId: unit.id,
          name: group.name,
          kind: group.kind as SmallGroupForm['kind'],
          active: group.active,
          companionAdultId: group.companionAdultId ?? '',
        }
      : {
          unitId: unit.id,
          name: '',
          kind: defaultSmallGroupKind(unit.branch as Branch),
          active: true,
          companionAdultId: '',
        },
  });

  const onSubmit = async (values: SmallGroupForm) => {
    try {
      if (group) await api.put(`/group/small-groups/${group.id}`, values);
      else await api.post('/group/small-groups', values);
      await qc.invalidateQueries({ queryKey: ['units'] });
      await qc.invalidateQueries({ queryKey: ['members'] });
      toast.ok(group ? 'Pequeño grupo actualizado' : 'Pequeño grupo creado');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };

  const label = BRANCH_INFO[unit.branch as Branch]?.smallGroup.one ?? 'Pequeño grupo';
  return (
    <Modal
      title={group ? `Editar ${group.name}` : `Nuevo/a ${label.toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="sg-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="sg-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('unitId')} />
        <Field label="Nombre" required error={errors.name?.message} full>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Halcones" autoFocus />
        </Field>
        <Field label="Tipo" required error={errors.kind?.message}>
          <Select {...register('kind')}>
            {SMALL_GROUP_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <Checkbox {...register('active')} label="Activo" />
        </div>
        {unit.branch === 'scouts' ? (
          <Field label="Educador/a que la acompaña" error={errors.companionAdultId?.message} full hint="Quien hace el seguimiento de la patrulla y de la progresión de sus integrantes">
            <Select {...register('companionAdultId')}>
              <option value="">— Sin definir —</option>
              {group?.companion && !adults.some((a) => a.id === group.companion!.id) ? (
                <option value={group.companion.id}>
                  {group.companion.lastName}, {group.companion.firstName}
                </option>
              ) : null}
              {adults.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.lastName}, {a.firstName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}

export function UnitDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const units = useUnits();
  const unit = units.data?.find((u) => u.id === id);
  const [editUnit, setEditUnit] = useState(false);
  const [sgModal, setSgModal] = useState<SmallGroup | 'new' | null>(null);
  // Filtros de las tablas: pequeño grupo ('' = todos, 'sin' = sin asignar) y buscadores
  const [sgFilter, setSgFilter] = useState('');
  const [memberQ, setMemberQ] = useState('');
  const [adultQ, setAdultQ] = useState('');
  // Selección para mover varios de pequeño grupo a la vez
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState('');
  const [moving, setMoving] = useState(false);

  const canMembers = can('members', 'view');
  const canAdults = can('adults', 'view');
  const members = useQuery({
    queryKey: ['members', { unitId: id }],
    queryFn: () => api.get<MemberListItem[]>(`/members${qs({ unitId: id })}`),
    enabled: canMembers && !!unit,
  });
  const adults = useQuery({
    queryKey: ['adults', { unitId: id }],
    queryFn: () => api.get<Adult[]>(`/adults${qs({ unitId: id })}`),
    enabled: canAdults && !!unit,
  });

  if (units.isLoading) return <Loading />;
  if (units.error) return <ErrorBox error={units.error} />;
  if (!unit) return <Empty>No se encontró la unidad.</Empty>;

  const info = BRANCH_INFO[unit.branch as Branch];
  const sgLabel = info?.smallGroup ?? {
    one: 'Pequeño grupo',
    many: 'Pequeños grupos',
  };
  const groups = [...unit.smallGroups].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  const countIn = (sgId: string) => (members.data ?? []).filter((m) => m.smallGroup?.id === sgId).length;
  const withoutGroup = (members.data ?? []).filter((m) => !m.smallGroup).length;
  const shownMembers = (members.data ?? []).filter(
    (m) =>
      (!sgFilter || (sgFilter === 'sin' ? !m.smallGroup : m.smallGroup?.id === sgFilter)) &&
      matchesPerson(memberQ, [m.lastName, m.firstName, m.dni, m.smallGroup?.name], m.dni),
  );
  const shownAdults = (adults.data ?? []).filter((a) =>
    matchesPerson(adultQ, [a.firstName, a.lastName, a.totem, ...a.assignments.filter((x) => x.unitId === id).map((x) => x.position)], a.dni),
  );
  const showGroup = (key: string) => {
    setSgFilter(key);
    document.getElementById('unit-members')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Mover de pequeño grupo: los adultos con permiso de editar protagonistas en esta unidad (jefes y ayudantes)
  const canMove = can('members', 'edit', unit.id);
  const activeGroups = groups.filter((g) => g.active);
  const shownSelected = shownMembers.filter((m) => selected.has(m.id));
  const allShownSelected = shownMembers.length > 0 && shownSelected.length === shownMembers.length;
  const toggle = (memberId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  const move = async (memberIds: string[], smallGroupId: string | null) => {
    setMoving(true);
    try {
      const r = await api.post<{ moved: number }>('/members/small-group', { memberIds, smallGroupId });
      const dest = smallGroupId ? groups.find((g) => g.id === smallGroupId)?.name : `sin ${sgLabel.one.toLowerCase()}`;
      toast.ok(r.moved === 1 ? `Movido a ${dest}` : `${r.moved} protagonistas movidos a ${dest}`);
      setSelected(new Set());
      setMoveTo('');
      await qc.invalidateQueries({ queryKey: ['members'] });
      await qc.invalidateQueries({ queryKey: ['units'] });
    } catch (e) {
      toast.error(e);
    } finally {
      setMoving(false);
    }
  };

  const deleteGroup = async (sg: SmallGroup) => {
    try {
      await api.del(`/group/small-groups/${sg.id}`);
      await qc.invalidateQueries({ queryKey: ['units'] });
      await qc.invalidateQueries({ queryKey: ['members'] });
      toast.ok('Pequeño grupo eliminado');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/grupo/unidades', label: 'Unidades' }]}
        title={<UnitBadge unit={unit} />}
        sub={
          <>
            {info?.label} · <code>{unit.code}</code> · {unit.active ? 'Activa' : 'Inactiva'}
          </>
        }
        actions={
          can('group', 'edit') ? (
            <Button variant="secondary" onClick={() => setEditUnit(true)}>
              <Pencil /> Editar unidad
            </Button>
          ) : null
        }
      />

      <div className="grid grid-3 mb">
        <div className="card stat">
          <div className="label">Protagonistas activos</div>
          <div className="value">{unit.memberCount}</div>
          {info ? (
            <div className="hint">
              Rango de edad: {info.ages[0]} a {info.ages[1]} años
            </div>
          ) : null}
        </div>
        <div className="card stat">
          <div className="label">Adultos {new Date().getFullYear()}</div>
          <div className="value">{unit.adultCount}</div>
          <div className="hint">
            {unit.memberCount ? (
              <>
                Mínimo: {unit.minAdults} (1 cada {unit.kidsPerAdult} protagonistas){' '}
                {unit.adultCount < unit.minAdults ? <Badge tone="warn">Faltan {unit.minAdults - unit.adultCount}</Badge> : <Badge tone="ok">Cumple</Badge>}
              </>
            ) : (
              <>Mínimo: 1 cada {unit.kidsPerAdult} protagonistas</>
            )}
          </div>
        </div>
        <div className="card stat">
          <div className="label">{sgLabel.many}</div>
          <div className="value">{unit.smallGroups.filter((s) => s.active).length}</div>
        </div>
      </div>

      <div className="stack">
        <Card
          title={sgLabel.many}
          actions={
            can('small_groups', 'create', unit.id) ? (
              <Button size="sm" onClick={() => setSgModal('new')}>
                <Plus /> Agregar
              </Button>
            ) : null
          }
          bodyClass=""
        >
          {!groups.length ? (
            <Empty>Esta unidad todavía no tiene {sgLabel.many.toLowerCase()}.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table stack-sm">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    {canMembers ? <th className="num">Protagonistas</th> : null}
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {groups.map((sg) => (
                    <tr key={sg.id}>
                      <td>
                        {canMembers ? (
                          <button type="button" className="link-btn" onClick={() => showGroup(sg.id)} title={`Ver los protagonistas de ${sg.name}`}>
                            {sg.name}
                          </button>
                        ) : (
                          sg.name
                        )}
                        {sg.companion ? (
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            Acompaña: {sg.companion.firstName} {sg.companion.lastName}
                          </div>
                        ) : null}
                      </td>
                      <td>{KIND_LABELS[sg.kind] ?? sg.kind}</td>
                      {canMembers ? <td className="num">{countIn(sg.id)}</td> : null}
                      <td>{sg.active ? <Badge tone="ok">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                      <td className="num nowrap">
                        {can('small_groups', 'edit', unit.id) ? (
                          <Button variant="ghost" size="sm" onClick={() => setSgModal(sg)}>
                            <Pencil /> Editar
                          </Button>
                        ) : null}
                        {can('small_groups', 'delete', unit.id) ? (
                          <ConfirmButton
                            size="sm"
                            title={`Eliminar ${sg.name}`}
                            message={<p>Los protagonistas de este pequeño grupo van a quedar sin asignar. ¿Querés eliminarlo?</p>}
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteGroup(sg)}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {canMembers && withoutGroup > 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        <button type="button" className="link-btn muted" onClick={() => showGroup('sin')}>
                          Sin pequeño grupo asignado
                        </button>
                      </td>
                      <td className="num">{withoutGroup}</td>
                      <td colSpan={2} />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {canMembers ? (
          <div id="unit-members">
            <Card
              title={`Protagonistas (${members.data && (sgFilter || memberQ.trim()) ? `${shownMembers.length} de ${members.data.length}` : (members.data?.length ?? '…')})`}
              actions={
                <Link to={`/protagonistas?unitId=${unit.id}`} className="btn btn-secondary btn-sm">
                  Ver en el padrón
                </Link>
              }
              bodyClass=""
            >
              {members.isLoading ? (
                <Loading />
              ) : members.error ? (
                <div className="card-body">
                  <ErrorBox error={members.error} />
                </div>
              ) : !members.data?.length ? (
                <Empty>No hay protagonistas activos en esta unidad.</Empty>
              ) : (
                <>
                  <div className="toolbar table-toolbar">
                    <Select value={sgFilter} onChange={(e) => setSgFilter(e.target.value)} aria-label={sgLabel.one} style={{ width: 'auto' }}>
                      <option value="">Todos los {sgLabel.many.toLowerCase()}</option>
                      {groups.map((sg) => (
                        <option key={sg.id} value={sg.id}>
                          {sg.name} ({countIn(sg.id)})
                        </option>
                      ))}
                      {withoutGroup ? (
                        <option value="sin">
                          Sin {sgLabel.one.toLowerCase()} ({withoutGroup})
                        </option>
                      ) : null}
                    </Select>
                    <div className="search-input">
                      <Search />
                      <Input
                        value={memberQ}
                        onChange={(e) => setMemberQ(e.target.value)}
                        placeholder="Buscar por nombre o DNI"
                        aria-label="Buscar protagonista"
                      />
                    </div>
                  </div>
                  {canMove && shownSelected.length ? (
                    <div className="toolbar table-toolbar move-bar">
                      <strong>
                        {shownSelected.length} seleccionado{shownSelected.length === 1 ? '' : 's'}
                      </strong>
                      <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Mover a" style={{ width: 'auto' }}>
                        <option value="">Mover a…</option>
                        {activeGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                        <option value="sin">Sin {sgLabel.one.toLowerCase()}</option>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!moveTo}
                        loading={moving}
                        onClick={() =>
                          void move(
                            shownSelected.map((m) => m.id),
                            moveTo === 'sin' ? null : moveTo,
                          )
                        }
                      >
                        <Shuffle /> Mover
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                        Cancelar
                      </Button>
                    </div>
                  ) : null}
                  {!shownMembers.length ? (
                    <Empty>Nadie coincide con el filtro.</Empty>
                  ) : (
                    <div className="table-wrap">
                      <table className="table stack-sm">
                        <thead>
                          <tr>
                            {canMove ? (
                              <th style={{ width: 32 }}>
                                <input
                                  type="checkbox"
                                  aria-label="Seleccionar todos"
                                  checked={allShownSelected}
                                  onChange={() => setSelected(allShownSelected ? new Set() : new Set(shownMembers.map((m) => m.id)))}
                                />
                              </th>
                            ) : null}
                            <th>Apellido y nombre</th>
                            <th>{sgLabel.one}</th>
                            <th>Nacimiento</th>
                            <th className="num">Edad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownMembers.map((m) => (
                            <tr key={m.id}>
                              {canMove ? (
                                <td>
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar a ${m.firstName} ${m.lastName}`}
                                    checked={selected.has(m.id)}
                                    onChange={() => toggle(m.id)}
                                  />
                                </td>
                              ) : null}
                              <td>
                                <Link to={`/protagonistas/${m.id}`}>
                                  {m.lastName}, {m.firstName}
                                </Link>
                              </td>
                              <td>
                                {canMove && activeGroups.length ? (
                                  <Select
                                    className="select-inline"
                                    value={m.smallGroup?.id ?? ''}
                                    disabled={moving}
                                    aria-label={`${sgLabel.one} de ${m.firstName} ${m.lastName}`}
                                    onChange={(e) => void move([m.id], e.target.value || null)}
                                  >
                                    <option value="">Sin {sgLabel.one.toLowerCase()}</option>
                                    {groups
                                      .filter((g) => g.active || g.id === m.smallGroup?.id)
                                      .map((g) => (
                                        <option key={g.id} value={g.id}>
                                          {g.name}
                                        </option>
                                      ))}
                                  </Select>
                                ) : (
                                  (m.smallGroup?.name ?? <span className="muted">—</span>)
                                )}
                              </td>
                              <td className="nowrap">{formatDate(m.birthDate) || <span className="muted">—</span>}</td>
                              <td className="num">{ageAt(m.birthDate) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        ) : null}

        {canAdults ? (
          <Card
            title={`Adultos ${new Date().getFullYear()}${adults.data && adultQ.trim() ? ` (${shownAdults.length} de ${adults.data.length})` : ''}`}
            bodyClass=""
          >
            {adults.isLoading ? (
              <Loading />
            ) : adults.error ? (
              <div className="card-body">
                <ErrorBox error={adults.error} />
              </div>
            ) : !adults.data?.length ? (
              <Empty>No hay adultos con cargo en esta unidad este año.</Empty>
            ) : (
              <>
                <div className="toolbar table-toolbar">
                  <div className="search-input">
                    <Search />
                    <Input
                      value={adultQ}
                      onChange={(e) => setAdultQ(e.target.value)}
                      placeholder="Buscar por nombre, tótem o cargo"
                      aria-label="Buscar adulto"
                    />
                  </div>
                </div>
                {!shownAdults.length ? (
                  <Empty>Nadie coincide con la búsqueda.</Empty>
                ) : (
                  <div className="table-wrap">
                    <table className="table stack-sm">
                      <thead>
                        <tr>
                          <th>Adulto</th>
                          <th>Cargo</th>
                          <th>Formación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shownAdults.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <Link to={`/adultos/${a.id}`}>{adultName(a)}</Link>
                            </td>
                            <td>
                              {a.assignments
                                .filter((x) => x.unitId === unit.id)
                                .map((x) => x.position)
                                .join(', ')}
                            </td>
                            <td>
                              {a.courses.length ? (
                                <Badge tone="ok">
                                  {a.courses.length} registrada
                                  {a.courses.length === 1 ? '' : 's'}
                                </Badge>
                              ) : (
                                <Badge tone="warn">Sin formación</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Card>
        ) : null}
      </div>

      {editUnit ? <UnitFormModal unit={unit} onClose={() => setEditUnit(false)} /> : null}
      {sgModal ? <SmallGroupModal unit={unit} group={sgModal === 'new' ? undefined : sgModal} adults={adults.data ?? []} onClose={() => setSgModal(null)} /> : null}
    </>
  );
}

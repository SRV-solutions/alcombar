import { Fragment, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@shared';
import { api, qs } from '../../lib/api';
import { useUnits } from '../../lib/queries';
import type { AuditEntry, Unit } from '../../lib/types';
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, Select, type Tone } from '../../components/ui';

const ENTITY_LABELS: Record<string, string> = {
  Member: 'Protagonista',
  Guardian: 'Responsable',
  MemberGuardian: 'Vínculo con responsable',
  MemberDocument: 'Documentación',
  Affiliation: 'Afiliación',
  UnitTransfer: 'Pase de unidad',
  Attendance: 'Asistencia',
  Adult: 'Adulto',
  AdultAssignment: 'Cargo de adulto',
  AdultCourse: 'Formación de adulto',
  Unit: 'Unidad',
  SmallGroup: 'Pequeño grupo',
  SupportTeam: 'Equipo de apoyo',
  User: 'Usuario',
  UserRole: 'Rol de usuario',
  Role: 'Rol',
  RolePermission: 'Permiso de rol',
  DocumentType: 'Tipo de documento',
  Course: 'Curso',
};

const ACTION_INFO: Record<string, { label: string; tone: Tone }> = {
  create: { label: 'Alta', tone: 'ok' },
  update: { label: 'Modificación', tone: 'info' },
  delete: { label: 'Baja', tone: 'danger' },
  login: { label: 'Ingreso', tone: 'neutral' },
  export: { label: 'Exportación', tone: 'gold' },
  import: { label: 'Importación', tone: 'bordo' },
};

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  firstName: 'Nombre',
  lastName: 'Apellido',
  name: 'Nombre',
  email: 'Email',
  dni: 'DNI',
  birthDate: 'Fecha de nacimiento',
  unitId: 'Unidad',
  smallGroupId: 'Pequeño grupo',
  joinedAt: 'Fecha de ingreso',
  promiseDate: 'Fecha de Promesa',
  address: 'Dirección',
  phone: 'Teléfono',
  status: 'Estado',
  leftAt: 'Fecha de baja',
  notes: 'Notas',
  totem: 'Tótem',
  advisorAdultId: 'Asesor/a personal',
  year: 'Año',
  position: 'Cargo',
  supportTeamId: 'Equipo de apoyo',
  courseId: 'Curso',
  completedAt: 'Fecha de aprobación',
  certificateUrl: 'Certificado',
  presented: 'Presentado',
  presentedAt: 'Fecha de presentación',
  expiresAt: 'Vencimiento',
  documentTypeId: 'Documento',
  relationship: 'Vínculo',
  sortOrder: 'Orden',
  code: 'Código',
  branch: 'Rama',
  minAdults: 'Mínimo de adultos',
  active: 'Activo',
  kind: 'Tipo',
  description: 'Descripción',
  scope: 'Alcance',
  key: 'Clave',
  isSystem: 'Fijo',
  passwordHash: 'Contraseña',
  adultId: 'Adulto',
  roleId: 'Rol',
  permissionId: 'Permiso',
  unitLimited: 'Solo su unidad',
  hasExpiry: 'Tiene vencimiento',
  memberId: 'Protagonista',
  guardianId: 'Responsable',
  fromUnitId: 'Desde la unidad',
  toUnitId: 'Hacia la unidad',
  date: 'Fecha',
  leaderAdultId: 'Responsable del equipo',
  userId: 'Usuario',
  created: 'Nuevos',
  updated: 'Actualizados',
  skipped: 'Con errores',
  guardiansCreated: 'Responsables nuevos',
  smallGroupsCreated: 'Pequeños grupos nuevos',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmtValue(key: string, v: unknown, units: Unit[]): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'string') {
    if (/unitid$/i.test(key)) {
      const u = units.find((x) => x.id === v);
      if (u) return u.name;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    if (UUID_RE.test(v)) return `${v.slice(0, 8)}…`;
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const label = (k: string) => FIELD_LABELS[k] ?? k;

function ValueList({ values, units }: { values: Record<string, unknown>; units: Unit[] }) {
  const entries = Object.entries(values).filter(([k]) => k !== 'id');
  if (!entries.length) return <span className="muted">Sin detalle</span>;
  return (
    <dl className="dl" style={{ gridTemplateColumns: '200px 1fr' }}>
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt>{label(k)}</dt>
          <dd>{fmtValue(k, v, units)}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Changes({ entry, units }: { entry: AuditEntry; units: Unit[] }) {
  const c = entry.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> } | Record<string, unknown> | null;
  if (!c || typeof c !== 'object') return <span className="muted">Sin detalle de cambios.</span>;
  const before = 'before' in c ? (c.before as Record<string, unknown> | undefined) : undefined;
  const after = 'after' in c ? (c.after as Record<string, unknown> | undefined) : undefined;
  if (before && after) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return (
      <ul className="list-plain">
        {keys.map((k) => (
          <li key={k}>
            <strong>{label(k)}:</strong>{' '}
            <span style={{ color: 'var(--gris)', textDecoration: 'line-through' }}>{fmtValue(k, before[k], units)}</span>
            {' → '}
            <span>{fmtValue(k, after[k], units)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (after) return <ValueList values={after} units={units} />;
  if (before) return <ValueList values={before} units={units} />;
  return <ValueList values={c as Record<string, unknown>} units={units} />;
}

const fmtDateTime = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const units = useUnits();

  const audit = useQuery({
    queryKey: ['audit', page, entity, action],
    queryFn: () => api.get<{ rows: AuditEntry[]; total: number; page: number; pageSize: number }>(`/audit${qs({ page, entity, action })}`),
    placeholderData: keepPreviousData,
  });

  const total = audit.data?.total ?? 0;
  const pageSize = audit.data?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const unitList = units.data ?? [];

  return (
    <>
      <PageHeader title="Auditoría" sub="Quién, cuándo y qué cambió. Cada alta, modificación y baja queda registrada." />
      <div className="toolbar">
        <Select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          aria-label="Entidad"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          aria-label="Acción"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_INFO).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        {audit.isFetching && !audit.isLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
      </div>
      <Card bodyClass="">
        {audit.isLoading ? (
          <Loading />
        ) : audit.error ? (
          <div className="card-body">
            <ErrorBox error={audit.error} />
          </div>
        ) : !audit.data?.rows.length ? (
          <Empty>No hay registros con esos filtros.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.rows.map((r) => {
                  const a = ACTION_INFO[r.action] ?? { label: r.action, tone: 'neutral' as Tone };
                  const isOpen = open === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="clickable" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                        <td>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td className="nowrap">{fmtDateTime(r.createdAt)}</td>
                        <td>{r.user ? r.user.name : <span className="muted">Sistema</span>}</td>
                        <td>
                          <Badge tone={a.tone}>{a.label}</Badge>
                        </td>
                        <td>{ENTITY_LABELS[r.entity] ?? r.entity}</td>
                        <td>{r.summary ?? <span className="muted">—</span>}</td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td />
                          <td colSpan={5} style={{ background: 'var(--surface-2)' }}>
                            <Changes entry={r} units={unitList} />
                            <div className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                              {r.user ? `${r.user.email} · ` : ''}
                              {r.entityId ? `ID ${r.entityId} · ` : ''}
                              {r.ip ? `IP ${r.ip}` : ''}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="row between mt">
        <span className="muted">
          Página {page} de {pages} · {total} registros
        </span>
        <div className="row">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft /> Anterior
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
}

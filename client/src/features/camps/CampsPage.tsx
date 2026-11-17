import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CAMP_STATUS_LABELS, CAMP_TYPE_LABELS, CAMP_TYPES, campNights, campSchema, formatDate, type CampInput, type CampStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Select, Textarea, UnitBadge, type Tone } from '../../components/ui';
import type { CampDetail, CampListItem, CampSiteRow } from './types';
import '../accounting/accounting.css';
import './camps.css';

export const CAMP_STATUS_TONE: Record<CampStatus, Tone> = { borrador: 'neutral', aprobado: 'info', realizado: 'warn', rendido: 'ok' };

export const campDates = (start: string, end: string) => (start === end ? formatDate(start) : `${formatDate(start)} al ${formatDate(end)}`);

export const useCampSites = () => useQuery({ queryKey: ['camp-sites'], queryFn: () => api.get<CampSiteRow[]>('/camps/sites'), staleTime: 30_000 });

export function CampsPage() {
  const { unitsWith } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['camps', year, status], queryFn: () => api.get<CampListItem[]>(`/camps${qs({ year, status })}`) });
  const createUnits = unitsWith('camps', 'create');
  const canCreate = createUnits === 'all' || createUnits.length > 0;
  const current = new Date().getFullYear();
  return (
    <>
      <PageHeader
        title="Campamentos y salidas"
        sub="Inscripción, legajo, presupuesto por rubro, rendición y logística de cada campamento, acantonamiento o salida."
        actions={
          <>
            <LinkButton to="/campamentos/lugares" variant="secondary">
              <MapPin /> Lugares de acampe
            </LinkButton>
            {canCreate ? (
              <Button onClick={() => setCreating(true)} id="btn-new-camp">
                <Plus /> Nuevo campamento
              </Button>
            ) : null}
          </>
        }
      />
      <div className="toolbar">
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año">
          {Array.from({ length: 5 }, (_, i) => current + 1 - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(CAMP_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <Card bodyClass="table-wrap">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <div className="card-body">
            <ErrorBox error={q.error} />
          </div>
        ) : !q.data?.length ? (
          <Empty>No hay campamentos ni salidas en {year}.</Empty>
        ) : (
          <table className="table" id="camps-table">
            <thead>
              <tr>
                <th>Campamento</th>
                <th>Fechas</th>
                <th>Unidades</th>
                <th>Lugar</th>
                <th className="num">Inscriptos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/campamentos/${c.id}`)}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="muted">
                      {CAMP_TYPE_LABELS[c.type]}
                      {c.responsible ? ` · ${adultName(c.responsible)}` : ''}
                    </div>
                  </td>
                  <td className="nowrap">
                    {campDates(c.startDate, c.endDate)}
                    <div className="muted">{c.nights === 1 ? '1 noche' : `${c.nights} noches`}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {c.units.length ? c.units.map((u) => <UnitBadge key={u.id} unit={u} short />) : <Badge tone="bordo">Grupo</Badge>}
                    </div>
                  </td>
                  <td>{c.place ?? <span className="muted">—</span>}</td>
                  <td className="num nowrap">
                    {c.enrolled.members}
                    {c.enrolled.adults ? <span className="muted"> + {c.enrolled.adults} ad.</span> : null}
                  </td>
                  <td>
                    <Badge tone={CAMP_STATUS_TONE[c.status]}>{CAMP_STATUS_LABELS[c.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating ? <CampDialog onClose={() => setCreating(false)} onSaved={(id) => navigate(`/campamentos/${id}`)} /> : null}
    </>
  );
}

/** Todos los campos del campamento (el PUT reemplaza todo: logística incluida). */
export function campToInput(c: CampDetail): CampInput {
  return {
    name: c.name,
    type: c.type,
    ownerUnitId: c.ownerUnitId ?? '',
    unitIds: c.units.map((u) => u.id).filter((id) => id !== c.ownerUnitId),
    startDate: c.startDate,
    endDate: c.endDate,
    campSiteId: c.campSiteId ?? '',
    place: c.place ?? '',
    responsibleAdultId: c.responsibleAdultId ?? '',
    cost: c.cost,
    description: c.description ?? '',
    transportCompany: c.transportCompany ?? '',
    transportContact: c.transportContact ?? '',
    transportSchedule: c.transportSchedule ?? '',
    transportNotes: c.transportNotes ?? '',
    materials: c.materials ?? '',
  };
}

export function CampDialog({ camp, onClose, onSaved }: { camp?: CampDetail; onClose: () => void; onSaved?: (id: string) => void }) {
  const toast = useToast();
  const { unitsWith } = useAuth();
  const units = useUnits();
  const adults = useAdults();
  const sites = useCampSites();
  const allowed = unitsWith('camps', camp ? 'edit' : 'create');
  const ownerOptions = (units.data ?? []).filter((u) => u.active && (allowed === 'all' || allowed.includes(u.id) || u.id === camp?.ownerUnitId));
  const { register, handleSubmit, formState, setError, watch, setValue } = useForm<CampInput>({
    resolver: zodResolver(campSchema),
    defaultValues: camp
      ? campToInput(camp)
      : {
          name: '',
          type: 'campamento',
          ownerUnitId: allowed === 'all' ? '' : allowed[0] ?? '',
          unitIds: [],
          startDate: '',
          endDate: '',
          campSiteId: '',
          place: '',
          responsibleAdultId: '',
          cost: 0,
          description: '',
          transportCompany: '',
          transportContact: '',
          transportSchedule: '',
          transportNotes: '',
          materials: '',
        },
  });
  const e = formState.errors;
  const owner = watch('ownerUnitId');
  const unitIds = watch('unitIds') ?? [];
  const start = watch('startDate');
  const end = watch('endDate');
  const siteId = watch('campSiteId');
  const nights = start && end && end >= start ? campNights(start, end) : null;
  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = camp ? await api.put<{ id: string }>(`/camps/${camp.id}`, v) : await api.post<{ id: string }>('/camps', v);
      toast.ok(camp ? 'Campamento actualizado' : 'Campamento creado (en borrador)');
      onSaved?.(saved.id);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={camp ? 'Editar campamento' : 'Nuevo campamento o salida'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={onSubmit} noValidate id="camp-form">
        <Field label="Nombre" required full error={e.name?.message}>
          <Input {...register('name')} invalid={!!e.name} placeholder="Ej: Campamento de verano de la Tropa" />
        </Field>
        <Field label="Tipo" required>
          <Select {...register('type')}>
            {CAMP_TYPES.map((t) => (
              <option key={t} value={t}>
                {CAMP_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unidad organizadora" error={e.ownerUnitId?.message} hint="Sin unidad = campamento de Grupo">
          <Select {...register('ownerUnitId')}>
            {allowed === 'all' || camp?.ownerUnitId === null ? <option value="">Grupo (todas las unidades)</option> : null}
            {ownerOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Otras unidades que participan" full>
          <div className="row" style={{ gap: 6 }}>
            {(units.data ?? [])
              .filter((u) => u.active && u.id !== owner)
              .map((u) => {
                const on = unitIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`month-chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => setValue('unitIds', on ? unitIds.filter((x) => x !== u.id) : [...unitIds, u.id])}
                  >
                    {u.name}
                  </button>
                );
              })}
          </div>
        </Field>
        <Field label="Desde" required error={e.startDate?.message}>
          <Input type="date" {...register('startDate')} invalid={!!e.startDate} />
        </Field>
        <Field label="Hasta" required error={e.endDate?.message} hint={nights !== null ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : undefined}>
          <Input type="date" {...register('endDate')} invalid={!!e.endDate} />
        </Field>
        <Field label="Lugar de acampe (catálogo)">
          <Select {...register('campSiteId')}>
            <option value="">— Otro lugar —</option>
            {sites.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.location ? ` (${s.location})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={siteId ? 'Detalle del lugar (opcional)' : 'Lugar'} error={e.place?.message}>
          <Input {...register('place')} placeholder="Ej: Parque Pereyra Iraola" />
        </Field>
        <Field label="Responsable">
          <Select {...register('responsibleAdultId')}>
            <option value="">—</option>
            {adults.data
              ?.filter((a) => a.status !== 'baja' || a.id === camp?.responsibleAdultId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {adultName(a)}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Costo por protagonista" error={e.cost?.message} hint="Se carga como cargo en la cuenta de cada inscripto">
          <Input type="number" step="0.01" min="0" {...register('cost')} invalid={!!e.cost} />
        </Field>
        <Field label="Descripción / objetivos" full>
          <Textarea rows={3} {...register('description')} />
        </Field>
      </form>
    </Modal>
  );
}

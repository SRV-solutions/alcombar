// Piezas compartidas de Programa: unidad elegida, badges de estado, selector de competencias y vista de la ficha.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BRANCH_INFO,
  EXPLORATION_LABEL,
  COMING_SOON_TEXT,
  formatDate,
  isComingSoon,
  OBJECTIVES_HEADER,
  OPPORTUNITY_TYPE_LABELS,
  SHEET_SCOPE_LABELS,
  SHEET_STATUSES,
  SHEET_STATUS_LABELS,
  type Branch,
  type OpportunityType,
  type SheetScope,
  type SheetStatus,
} from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { adultName, useUnits } from '../../lib/queries';
import { Badge, Input, Select, UnitBadge, type Tone } from '../../components/ui';
import type { Area, CompetencyItem, Sheet } from './types';
import './program.css';

export const STATUS_TONE: Record<SheetStatus, Tone> = {
  borrador: 'neutral',
  en_revision: 'warn',
  aprobada: 'info',
  realizada: 'ok',
  evaluada: 'gold',
};
export function SheetStatusBadge({ status }: { status: string }) {
  return (
    <span className="sheet-status">
      <Badge tone={STATUS_TONE[status as SheetStatus] ?? 'neutral'}>{SHEET_STATUS_LABELS[status as SheetStatus] ?? status}</Badge>
    </span>
  );
}
export function StatusSteps({ status }: { status: string }) {
  const i = SHEET_STATUSES.indexOf(status as SheetStatus);
  return (
    <div className="status-steps" aria-label="Estado de la ficha">
      {SHEET_STATUSES.map((s, k) => (
        <span key={s} className={k < i ? 'done' : k === i ? 'now' : ''}>
          {SHEET_STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
export const typeLabel = (t: string) => OPPORTUNITY_TYPE_LABELS[t as OpportunityType] ?? t;
export const scopeLabel = (s: string) => SHEET_SCOPE_LABELS[s as SheetScope] ?? s;
export const branchOf = (b: string | null | undefined) => (b ? BRANCH_INFO[b as Branch] : null);
export const explorationLabel = (b: string | null | undefined) => (b ? EXPLORATION_LABEL[b as Branch] : 'Marco de exploración');
export const objectivesHeader = (b: string | null | undefined) => (b ? OBJECTIVES_HEADER[b as Branch] : 'Objetivos:');
export const minutes = (m: number | null | undefined) => (m ? (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`) : '');

/**
 * Unidad elegida en las pantallas de Programa: la de la URL (?unitId=), o la del usuario,
 * o la primera que puede ver. Devuelve también las unidades disponibles.
 */
export function useProgramUnit(perm: 'view' | 'create' | 'edit' = 'view', module: 'activities' | 'progression' = 'activities') {
  const { can, me } = useAuth();
  const units = useUnits();
  const [params, setParams] = useSearchParams();
  const options = useMemo(
    () =>
      (units.data ?? [])
        .filter((u) => u.active && can(module, perm, u.id))
        .sort((a, b) => (branchOf(a.branch)?.order ?? 9) - (branchOf(b.branch)?.order ?? 9) || a.name.localeCompare(b.name)),
    [units.data, can, module, perm],
  );
  const mine = me?.roles.find((r) => r.unit && options.some((o) => o.id === r.unit!.id))?.unit?.id;
  const unitId = params.get('unitId') || mine || options[0]?.id || '';
  const setUnitId = (id: string) => {
    const n = new URLSearchParams(params);
    n.set('unitId', id);
    setParams(n, { replace: true });
  };
  return { unitId, setUnitId, unit: options.find((u) => u.id === unitId) ?? units.data?.find((u) => u.id === unitId), options, loading: units.isLoading };
}

export function UnitSelect({ value, onChange, options }: { value: string; onChange: (id: string) => void; options: { id: string; name: string }[] }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Unidad" style={{ width: 'auto' }}>
      {options.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </Select>
  );
}

export const useAreas = (branch: string | null | undefined) =>
  useQuery({
    queryKey: ['program-areas', branch ?? 'all'],
    queryFn: () => api.get<Area[]>(`/program/areas${qs({ branch: branch ?? '' })}`),
    staleTime: 60_000,
  });
export const useCompetencies = (branch: string | null | undefined, all = false) =>
  useQuery({
    queryKey: ['program-competencies', branch ?? 'all', all],
    queryFn: () => api.get<CompetencyItem[]>(`/program/competencies${qs({ branch: branch ?? '', active: all ? 'all' : '' })}`),
    enabled: !!branch || all,
    staleTime: 60_000,
  });

/** Lista de competencias de la rama agrupadas por área, con checkboxes y buscador. */
export function CompetencyPicker({ branch, value, onChange }: { branch: string | null; value: string[]; onChange: (ids: string[]) => void }) {
  const comps = useCompetencies(branch);
  const areas = useAreas(branch);
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!branch) return <p className="muted">Elegí la unidad para ver sus competencias.</p>;
  if (comps.isLoading) return <p className="muted">Cargando competencias…</p>;
  const list = (comps.data ?? []).filter((c) => !q || norm(`${c.number ?? ''} ${c.name}`).includes(norm(q)));
  if (!comps.data?.length) {
    if (isComingSoon(branch)) return <p className="muted" style={{ margin: 0 }}>{COMING_SOON_TEXT}</p>;
    return (
      <p className="muted" style={{ margin: 0 }}>
        Todavía no hay competencias cargadas para {branchOf(branch)?.label}. Las carga Jefatura o Programa en <strong>Progresión → Esquemas y catálogos</strong>.
      </p>
    );
  }
  const groups = [...(areas.data ?? []).map((a) => ({ id: a.id as string | null, name: a.name })), { id: null, name: 'Sin área' }];
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Input placeholder="Buscar competencia" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="comp-picker">
        {groups.map((g) => {
          const items = list.filter((c) => (c.areaId ?? null) === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id ?? 'none'}>
              <div className="area">{g.name}</div>
              {items.map((c) => (
                <label key={c.id}>
                  <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    {c.number ? <strong>{c.number}. </strong> : null}
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <span className="muted">{value.length} elegidas</span>
    </div>
  );
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="sheet-section">
    <h3>{title}</h3>
    {children}
  </div>
);
const Text = ({ value }: { value: string | null | undefined }) => (value ? <p style={{ margin: 0 }}>{value}</p> : <p className="muted" style={{ margin: 0 }}>—</p>);

/** Contenido de la ficha (pantalla). */
export function SheetView({ sheet }: { sheet: Sheet }) {
  const branch = sheet.unit.branch;
  return (
    <div>
      <div className="sheet-grid">
        <div>
          <div className="k">Unidad</div>
          <div className="v">
            <UnitBadge unit={sheet.unit} />
          </div>
        </div>
        <div>
          <div className="k">Fecha</div>
          <div className="v">{formatDate(sheet.date) || '—'}</div>
        </div>
        <div>
          <div className="k">Lugar</div>
          <div className="v">{sheet.place || '—'}</div>
        </div>
        <div>
          <div className="k">Duración</div>
          <div className="v">{minutes(sheet.durationMin) || '—'}</div>
        </div>
        <div>
          <div className="k">Rango de edad</div>
          <div className="v">{sheet.ageMin || sheet.ageMax ? `${sheet.ageMin ?? '?'} a ${sheet.ageMax ?? '?'} años` : '—'}</div>
        </div>
        <div>
          <div className="k">Participantes</div>
          <div className="v">{sheet.participants ?? '—'}</div>
        </div>
        <div>
          <div className="k">Área de desarrollo</div>
          <div className="v">{sheet.area?.name ?? '—'}</div>
        </div>
        <div>
          <div className="k">Tipo</div>
          <div className="v">
            {typeLabel(sheet.opportunityType)} · {scopeLabel(sheet.scope)}
            {sheet.opportunityType === 'campamento' && sheet.nights ? ` · ${sheet.nights} noches` : ''}
          </div>
        </div>
        <div>
          <div className="k">Responsable</div>
          <div className="v">{sheet.responsible ? adultName(sheet.responsible) : '—'}</div>
        </div>
        <div>
          <div className="k">Ciclo de programa</div>
          <div className="v">{sheet.cycle?.name ?? '—'}</div>
        </div>
      </div>

      <Block title={`Objetivos · ${objectivesHeader(branch)}`}>
        {sheet.objectives.length ? (
          <ul>
            {sheet.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        ) : (
          <Text value={null} />
        )}
      </Block>
      <Block title="Propósito (competencias)">
        {sheet.competencies.length ? (
          <div className="chips">
            {sheet.competencies.map((c) => (
              <span key={c.id} className="chip" title={c.area?.name ?? ''}>
                {c.number ? `${c.number}. ` : ''}
                {c.name}
              </span>
            ))}
          </div>
        ) : (
          <Text value={null} />
        )}
      </Block>
      <Block title={explorationLabel(branch)}>
        <Text value={sheet.exploration} />
      </Block>
      <Block title="Descripción de la actividad">
        <Text value={sheet.description} />
      </Block>
      <Block title="Recupero (reflexión y cierre)">
        <Text value={sheet.closing} />
      </Block>
      <Block title="Función de los demás educadores">
        <Text value={sheet.otherEducators} />
      </Block>
      <Block title="Materiales">
        {sheet.materials.length ? (
          <ul>
            {sheet.materials.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : (
          <Text value={null} />
        )}
      </Block>
      {sheet.outside ? (
        <Block title="Seguridad (fuera de la sede): riesgos y medidas">
          <Text value={sheet.safety} />
        </Block>
      ) : null}
      {sheet.status === 'evaluada' ? (
        <Block title="Evaluación">
          <p style={{ margin: '0 0 6px' }}>
            <strong>Qué funcionó:</strong> {sheet.evalWorked || '—'}
          </p>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Qué cambiar:</strong> {sheet.evalChange || '—'}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Asistencia:</strong> {sheet.evalAttendance ?? '—'}
          </p>
        </Block>
      ) : null}
    </div>
  );
}

/** Reutilizado por Ciclos: tipo de ficha + estado en una línea. */
export function SheetLine({ s }: { s: { code: string; name: string; status: string; opportunityType: string; date: string | null } }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
        {s.code}
      </span>
      <strong>{s.name}</strong>
      <span className="muted">{typeLabel(s.opportunityType)}</span>
      <SheetStatusBadge status={s.status} />
    </span>
  );
}

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BRANCH_INFO,
  BRANCHES,
  CARGO_FUNCTIONS,
  CARGO_SCOPES,
  cargoFunctionOf,
  cargoScopeOf,
  OTHER_FUNCTION_KEY,
  REFERENT_FUNCTION,
  type Branch,
  type CargoScope,
} from '@shared';
import { api, ApiError } from '../../lib/api';
import { adultName, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Assignment, SupportTeam } from '../../lib/types';
import { Button, Field, Input, Modal, Textarea } from '../../components/ui';
import { SearchSelect, type SearchOption } from '../../components/SearchSelect';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const isProgramTeam = (t: { name: string } | undefined) => !!t && fold(t.name).startsWith('programa');
const referentText = (b: string) => `Referente de Programa · ${BRANCH_INFO[b as Branch]?.label ?? b}`;
const branchOrder = (b: string) => BRANCH_INFO[b as Branch]?.order ?? 99;

type Errors = Partial<Record<'year' | 'position' | 'unitId' | 'supportTeamId' | 'branch' | 'custom' | 'notes', string>>;

/**
 * Cargo de un adulto en dos pasos: dónde está (unidad, Grupo, equipo de apoyo u otro) y qué función cumple.
 * Al editar se recupera todo lo que ya tenía, aunque el texto del cargo esté escrito distinto.
 */
export function AssignmentModal({ adultId, item, onClose }: { adultId: string; item?: Assignment; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const units = useUnits();
  const teams = useQuery({ queryKey: ['support-teams'], queryFn: () => api.get<SupportTeam[]>('/group/support-teams') });

  const initialScope: CargoScope = item ? cargoScopeOf(item) : 'unidad';
  const initialFn = item ? cargoFunctionOf(initialScope, item.position) : '';
  const [year, setYear] = useState(String(item?.year ?? new Date().getFullYear()));
  const [scope, setScope] = useState<CargoScope>(initialScope);
  const [unitId, setUnitId] = useState(item?.unitId ?? '');
  const [teamId, setTeamId] = useState(item?.supportTeamId ?? '');
  const [fn, setFn] = useState(initialFn);
  const [custom, setCustom] = useState(initialFn === OTHER_FUNCTION_KEY ? (item?.position ?? '') : '');
  const [branch, setBranch] = useState(item?.branch ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const team = (teams.data ?? []).find((t) => t.id === teamId);
  const programa = isProgramTeam(team);
  /** Cargo que vino sin unidad, solo con la rama (importado de Mi Rincón). */
  const pendingBranch = item && !item.unitId && !item.supportTeamId && item.branch ? item.branch : null;

  // ---- Opciones ----
  const unitOptions: SearchOption[] = useMemo(
    () =>
      (units.data ?? [])
        .filter((u) => u.active || u.id === unitId)
        // Si el cargo vino solo con la rama, sus unidades van primero
        .sort((a, b) => Number(b.branch === pendingBranch) - Number(a.branch === pendingBranch) || branchOrder(a.branch) - branchOrder(b.branch) || a.name.localeCompare(b.name))
        .map((u) => ({
          value: u.id,
          label: u.name,
          hint: u.code,
          group: BRANCH_INFO[u.branch as Branch]?.label ?? u.branch,
          keywords: u.code,
          color: BRANCH_INFO[u.branch as Branch]?.color,
        })),
    [units.data, unitId, pendingBranch],
  );
  const teamOptions: SearchOption[] = useMemo(
    () =>
      (teams.data ?? []).map((t) => ({
        value: t.id,
        label: t.name,
        hint: t.leader ? `Responsable: ${adultName(t.leader)}` : 'Sin responsable',
      })),
    [teams.data],
  );
  const fnOptions: SearchOption[] = useMemo(() => {
    const base = CARGO_FUNCTIONS[scope].map((f) => ({ value: f.key, label: f.label, hint: f.hint }));
    if (scope === 'equipo' && (programa || fn === REFERENT_FUNCTION.key)) base.push({ value: REFERENT_FUNCTION.key, label: REFERENT_FUNCTION.label, hint: REFERENT_FUNCTION.hint });
    base.push({ value: OTHER_FUNCTION_KEY, label: 'Otra función…', hint: 'La escribís vos' });
    return base;
  }, [scope, programa, fn]);
  const branchOptions: SearchOption[] = BRANCHES.map((b) => ({ value: b, label: BRANCH_INFO[b].label, color: BRANCH_INFO[b].color }));

  // ---- Texto final del cargo ----
  const position = (() => {
    if (fn === OTHER_FUNCTION_KEY) return custom.trim();
    if (fn === REFERENT_FUNCTION.key) return branch ? referentText(branch) : '';
    const def = CARGO_FUNCTIONS[scope].find((f) => f.key === fn);
    if (!def) return '';
    // Si no cambió la función, se respeta cómo estaba escrito (ej. "Jefa de Unidad", "Ayudante de Manada")
    if (item && scope === initialScope && fn === initialFn) return item.position;
    return def.position;
  })();
  const where =
    scope === 'unidad'
      ? (units.data ?? []).find((u) => u.id === unitId)?.code
      : scope === 'equipo'
        ? team?.name
        : scope === 'grupo'
          ? 'Grupo'
          : null;

  const changeScope = (s: CargoScope) => {
    if (s === scope) return;
    setScope(s);
    setErrors({});
    // La función se vuelve a elegir; si volvés al ámbito original, se recupera la que tenía
    setFn(s === initialScope ? initialFn : '');
  };

  const leaderNote =
    scope === 'equipo' && fn === 'encargado' && team && Number(year) === new Date().getFullYear()
      ? team.leaderAdultId && team.leaderAdultId !== adultId && team.leader
        ? `Pasa a ser el responsable de ${team.name} en lugar de ${adultName(team.leader)}.`
        : `Queda como responsable de ${team.name}.`
      : null;

  const validate = (): Errors => {
    const e: Errors = {};
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1950 || y > 2100) e.year = 'Año inválido';
    if (scope === 'unidad' && !unitId) e.unitId = 'Elegí la unidad';
    if (scope === 'equipo' && !teamId) e.supportTeamId = 'Elegí el equipo';
    if (!fn) e.position = 'Elegí la función';
    else if (fn === OTHER_FUNCTION_KEY && !custom.trim()) e.custom = 'Escribí la función';
    else if (fn === REFERENT_FUNCTION.key && !branch) e.branch = 'Elegí la rama';
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      year: Number(year),
      position,
      unitId: scope === 'unidad' ? unitId : '',
      supportTeamId: scope === 'equipo' ? teamId : '',
      branch: scope === 'equipo' && fn === REFERENT_FUNCTION.key ? branch : '',
      notes,
    };
    setSaving(true);
    try {
      if (item) await api.put(`/adults/assignments/${item.id}`, payload);
      else await api.post(`/adults/${adultId}/assignments`, payload);
      await Promise.all(
        [['adult', adultId], ['adults'], ['units'], ['support-teams'], ['organigrama'], ['referents'], ['users']].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
      toast.ok(item ? 'Cargo actualizado' : 'Cargo agregado');
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Errors);
      else toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? 'Editar cargo' : 'Agregar cargo'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field full">
          <label id="cargo-scope-label">¿Dónde cumple el cargo?</label>
          <div className="cargo-scope" role="group" aria-labelledby="cargo-scope-label">
            {CARGO_SCOPES.map((s) => (
              <button key={s.key} type="button" aria-pressed={scope === s.key} onClick={() => changeScope(s.key)}>
                <span className="t">{s.label}</span>
                <span className="h">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {scope === 'unidad' ? (
          <Field
            label="Unidad"
            required
            error={errors.unitId}
            hint={pendingBranch && !unitId ? `Vino sin unidad, solo con la rama ${BRANCH_INFO[pendingBranch as Branch]?.label ?? pendingBranch}` : undefined}
          >
            <SearchSelect
              value={unitId}
              onChange={setUnitId}
              options={unitOptions}
              placeholder="Elegí la unidad"
              searchPlaceholder="Buscar unidad o sigla…"
              invalid={!!errors.unitId}
              aria-label="Unidad"
            />
          </Field>
        ) : scope === 'equipo' ? (
          <Field label="Equipo de apoyo" required error={errors.supportTeamId}>
            <SearchSelect
              value={teamId}
              onChange={(v) => {
                setTeamId(v);
                if (fn === REFERENT_FUNCTION.key && !isProgramTeam((teams.data ?? []).find((t) => t.id === v))) setFn('');
              }}
              options={teamOptions}
              placeholder="Elegí el equipo"
              searchPlaceholder="Buscar equipo…"
              invalid={!!errors.supportTeamId}
              aria-label="Equipo de apoyo"
            />
          </Field>
        ) : null}

        <Field label="Función" required error={errors.position}>
          <SearchSelect
            value={fn}
            onChange={(v) => {
              setFn(v);
              setErrors((e) => ({ ...e, position: undefined }));
            }}
            options={fnOptions}
            placeholder="Elegí la función"
            searchPlaceholder="Buscar función…"
            invalid={!!errors.position}
            aria-label="Función"
          />
        </Field>

        {fn === REFERENT_FUNCTION.key ? (
          <Field label="Rama" required error={errors.branch}>
            <SearchSelect value={branch} onChange={setBranch} options={branchOptions} placeholder="Elegí la rama" searchPlaceholder="Buscar rama…" invalid={!!errors.branch} aria-label="Rama" />
          </Field>
        ) : null}
        {fn === OTHER_FUNCTION_KEY ? (
          <Field label="¿Cuál?" required error={errors.custom}>
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={120} invalid={!!errors.custom} placeholder="Ej.: Director Ejecutivo" />
          </Field>
        ) : null}

        <Field label="Año" required error={errors.year}>
          <Input type="number" inputMode="numeric" min={1950} max={2100} value={year} onChange={(e) => setYear(e.target.value)} invalid={!!errors.year} />
        </Field>

        {position ? (
          <p className="cargo-preview full">
            Va a figurar como <b>{position}</b>
            {where ? (
              <>
                {' '}
                · <b>{where}</b>
              </>
            ) : null}
            .{leaderNote ? ` ${leaderNote}` : ''}
          </p>
        ) : null}

        <Field label="Notas" error={errors.notes} full>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 60 }} maxLength={500} />
        </Field>
      </form>
    </Modal>
  );
}

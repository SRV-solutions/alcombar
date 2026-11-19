import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OPPORTUNITY_TYPES, OPPORTUNITY_TYPE_LABELS, SHEET_SCOPES, SHEET_SCOPE_LABELS, sheetSchema } from '@shared';
import { api, ApiError, errorMessage, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useAdults, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Card, Checkbox, ErrorBox, Field, Input, Loading, PageHeader, Select, Textarea } from '../../components/ui';
import { CompetencyPicker, explorationLabel, objectivesHeader, useAreas } from './common';
import type { Cycle, Sheet } from './types';
import { CloneSheetPicker } from './CloneSheetPicker';

interface FormValues {
  unitId: string;
  name: string;
  date: string;
  place: string;
  durationMin: string;
  opportunityType: string;
  scope: string;
  nights: string;
  cycleId: string;
  areaId: string;
  ageMin: string;
  ageMax: string;
  participants: string;
  responsibleAdultId: string;
  objectivesText: string;
  exploration: string;
  description: string;
  closing: string;
  otherEducators: string;
  materialsText: string;
  outside: boolean;
  safety: string;
}

const EMPTY: FormValues = {
  unitId: '',
  name: '',
  date: '',
  place: '',
  durationMin: '',
  opportunityType: 'variable',
  scope: 'unidad',
  nights: '',
  cycleId: '',
  areaId: '',
  ageMin: '',
  ageMax: '',
  participants: '',
  responsibleAdultId: '',
  objectivesText: '',
  exploration: '',
  description: '',
  closing: '',
  otherEducators: '',
  materialsText: '',
  outside: false,
  safety: '',
};
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const toLines = (t: string) =>
  t
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Alta y edición de una ficha de actividad (formato de la ficha del Grupo, informe §4). */
export function SheetFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { unitsWith } = useAuth();
  const units = useUnits();
  const adults = useAdults();
  const existing = useQuery({ queryKey: ['program-sheet', id], queryFn: () => api.get<Sheet>(`/program/sheets/${id}`), enabled: isEdit });
  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const { register, handleSubmit, watch, reset, setValue, getValues, setError, formState } = form;
  const e = formState.errors;
  const [competencyIds, setCompetencyIds] = useState<string[]>([]);
  // Ficha nueva desde una competencia del catálogo (?branch=&areaId=&competencyId=): se aplica al elegir una
  // unidad de esa rama
  const prefill = useRef(
    !isEdit && params.get('competencyId')
      ? { branch: params.get('branch'), areaId: params.get('areaId'), competencyId: params.get('competencyId') }
      : null,
  );

  const creatable = unitsWith('activities', 'create');
  const unitOptions = (units.data ?? []).filter((u) => u.active && (creatable === 'all' || creatable.includes(u.id)));
  const unitId = watch('unitId');
  const unit = units.data?.find((u) => u.id === unitId);
  const branch = unit?.branch ?? null;
  const areas = useAreas(branch);
  const cycles = useQuery({
    queryKey: ['program-cycles', unitId],
    queryFn: () => api.get<Cycle[]>(`/program/cycles${qs({ unitId })}`),
    enabled: !!unitId,
  });

  // Edición: cargar la ficha
  useEffect(() => {
    if (!existing.data) return;
    const x = existing.data;
    reset({
      unitId: x.unitId,
      name: x.name,
      date: s(x.date),
      place: s(x.place),
      durationMin: s(x.durationMin),
      opportunityType: x.opportunityType,
      scope: x.scope,
      nights: s(x.nights),
      cycleId: s(x.cycleId),
      areaId: s(x.areaId),
      ageMin: s(x.ageMin),
      ageMax: s(x.ageMax),
      participants: s(x.participants),
      responsibleAdultId: s(x.responsibleAdultId),
      objectivesText: x.objectives.join('\n'),
      exploration: s(x.exploration),
      description: s(x.description),
      closing: s(x.closing),
      otherEducators: s(x.otherEducators),
      materialsText: x.materials.join('\n'),
      outside: x.outside,
      safety: s(x.safety),
    });
    setCompetencyIds(x.competencies.map((c) => c.id));
  }, [existing.data, reset]);

  // Alta: unidad y ciclo de la URL, o la única que puede usar
  useEffect(() => {
    if (isEdit || !units.data) return;
    const pre = params.get('unitId');
    const sameBranch = prefill.current?.branch ? unitOptions.filter((o) => o.branch === prefill.current!.branch) : [];
    const u =
      (pre && unitOptions.find((o) => o.id === pre)) ||
      (sameBranch.length === 1 ? sameBranch[0] : null) ||
      (unitOptions.length === 1 ? unitOptions[0] : null);
    if (u) setValue('unitId', u.id);
    const c = params.get('cycleId');
    if (c) setValue('cycleId', c);
    // Desde un momento del programa del sábado: nombre, fecha y duración ya vienen
    const nombre = params.get('nombre');
    if (nombre) setValue('name', nombre);
    const fecha = params.get('date');
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) setValue('date', fecha);
    const min = params.get('min');
    if (min && /^\d+$/.test(min)) setValue('durationMin', min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.data, isEdit]);

  // Alta: al elegir la unidad se proponen edades y cantidad de participantes
  useEffect(() => {
    if (isEdit || !unitId) return;
    api
      .get<{ members: number; ageMin: number | null; ageMax: number | null }>(`/program/units/${unitId}/defaults`)
      .then((d) => {
        setValue('ageMin', s(d.ageMin));
        setValue('ageMax', s(d.ageMax));
        if (d.members) setValue('participants', String(d.members));
      })
      .catch(() => undefined);
    setValue('areaId', '');
    setCompetencyIds([]);
    const p = prefill.current;
    const u = units.data?.find((x) => x.id === unitId);
    if (p && u && (!p.branch || u.branch === p.branch)) {
      if (p.areaId) setValue('areaId', p.areaId);
      if (p.competencyId) setCompetencyIds([p.competencyId]);
      prefill.current = null;
    }
  }, [unitId, isEdit, setValue, units.data]);

  // Las áreas llegan después de dibujar el desplegable: re-aplicar la elegida para que se vea
  useEffect(() => {
    if (areas.data) setValue('areaId', getValues('areaId'));
  }, [areas.data, getValues, setValue]);

  /** Copia el contenido de otra ficha al formulario. Unidad y fecha quedan las de esta; área y competencias, solo si es la misma rama. */
  const applyClone = (x: Sheet) => {
    const sameBranch = !!branch && x.unit?.branch === branch;
    const keep = getValues();
    reset({
      unitId: keep.unitId,
      name: keep.name.trim() && params.get('nombre') ? keep.name : x.name,
      date: keep.date,
      place: s(x.place),
      durationMin: keep.durationMin && params.get('min') ? keep.durationMin : s(x.durationMin),
      opportunityType: x.opportunityType,
      scope: x.scope,
      nights: s(x.nights),
      cycleId: keep.cycleId,
      areaId: sameBranch ? s(x.areaId) : '',
      ageMin: sameBranch ? s(x.ageMin) : keep.ageMin,
      ageMax: sameBranch ? s(x.ageMax) : keep.ageMax,
      participants: keep.participants,
      responsibleAdultId: s(x.responsibleAdultId),
      objectivesText: x.objectives.join('\n'),
      exploration: s(x.exploration),
      description: s(x.description),
      closing: s(x.closing),
      otherEducators: s(x.otherEducators),
      materialsText: x.materials.join('\n'),
      outside: x.outside,
      safety: s(x.safety),
    });
    setCompetencyIds(sameBranch ? x.competencies.map((c) => c.id) : []);
    toast.ok(sameBranch ? 'Ficha copiada: cambiá lo que necesites' : 'Ficha copiada. Es de otra rama: elegí el área y las competencias de nuevo.');
  };

  const type = watch('opportunityType');
  const outside = watch('outside');
  const adultOptions = useMemo(() => (adults.data ?? []).filter((a) => a.status !== 'baja').sort((a, b) => a.lastName.localeCompare(b.lastName)), [adults.data]);

  if (isEdit && existing.isLoading) return <Loading />;
  if (isEdit && existing.error) return <ErrorBox error={existing.error} />;

  const onSubmit = handleSubmit(async (v) => {
    const payload = {
      unitId: v.unitId,
      name: v.name,
      date: v.date,
      place: v.place,
      durationMin: v.durationMin,
      opportunityType: v.opportunityType,
      scope: v.scope,
      nights: v.opportunityType === 'campamento' ? v.nights : '',
      cycleId: v.cycleId,
      areaId: v.areaId,
      ageMin: v.ageMin,
      ageMax: v.ageMax,
      participants: v.participants,
      responsibleAdultId: v.responsibleAdultId,
      objectives: toLines(v.objectivesText),
      competencyIds,
      exploration: v.exploration,
      description: v.description,
      closing: v.closing,
      otherEducators: v.otherEducators,
      materials: toLines(v.materialsText),
      outside: v.outside,
      safety: v.safety,
    };
    // Validación en el navegador con el mismo esquema que usa la API
    const check = sheetSchema.safeParse(payload);
    const fieldOf = (k: string) => (k === 'objectives' ? 'objectivesText' : k === 'materials' ? 'materialsText' : k) as keyof FormValues;
    if (!check.success) {
      for (const issue of check.error.issues) setError(fieldOf(String(issue.path[0])), { message: issue.message });
      toast.error('Revisá los campos marcados');
      return;
    }
    try {
      if (isEdit) {
        const r = await api.put<{ ok: boolean; reverted: boolean }>(`/program/sheets/${id}`, payload);
        if (r.reverted) toast.info('La ficha volvió a Borrador: como cambió, hay que aprobarla de nuevo.');
        else toast.ok('Ficha guardada');
        await qc.invalidateQueries({ queryKey: ['program-sheet', id] });
        await qc.invalidateQueries({ queryKey: ['program-sheets'] });
        navigate(`/programa/fichas/${id}`);
      } else {
        const created = await api.post<{ id: string; code: string }>('/program/sheets', payload);
        toast.ok(`Ficha ${created.code} creada`);
        await qc.invalidateQueries({ queryKey: ['program-sheets'] });
        // Se creó desde un momento del programa del sábado: vuelve ahí y queda vinculada a ese momento
        if (params.get('volver') === 'sabado' && params.get('date')) {
          navigate(`/programa/sabado${qs({ unitId: v.unitId, date: params.get('date')!, vincular: created.id, fila: params.get('fila') ?? '' })}`, { replace: true });
          return;
        }
        navigate(`/programa/fichas/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        for (const [k, msg] of Object.entries(err.details)) setError(fieldOf(k), { message: msg });
      }
      toast.error(errorMessage(err));
    }
  });

  const title = isEdit && existing.data ? `Editar: ${existing.data.name}` : 'Nueva ficha de actividad';
  return (
    <>
      <PageHeader
        title={title}
        crumbs={[
          { to: '/programa', label: 'Fichas de actividad' },
          ...(isEdit && existing.data ? [{ to: `/programa/fichas/${id}`, label: existing.data.code }] : []),
        ]}
        sub={isEdit && existing.data && ['en_revision', 'aprobada'].includes(existing.data.status) ? 'Ojo: si la cambiás, vuelve a Borrador y hay que aprobarla de nuevo.' : undefined}
      />
      {!isEdit && params.get('volver') === 'sabado' ? (
        <div className="alert alert-info">Al guardar, la ficha queda vinculada al momento del programa del sábado y volvés ahí.</div>
      ) : null}
      <form onSubmit={onSubmit} noValidate>
        <div className="stack">
          {!isEdit ? <CloneSheetPicker unitId={unitId} onPick={applyClone} /> : null}
          <Card title="La actividad">
            <div className="form-grid">
              <Field label="Unidad" required error={e.unitId?.message}>
                <Select {...register('unitId')} disabled={isEdit} invalid={!!e.unitId}>
                  <option value="">Elegí la unidad</option>
                  {(isEdit ? units.data ?? [] : unitOptions).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nombre de la actividad" required error={e.name?.message}>
                <Input {...register('name')} invalid={!!e.name} autoFocus={!isEdit} placeholder="Ej: Morse en la noche" />
              </Field>
              <Field label="Fecha" error={e.date?.message}>
                <Input type="date" {...register('date')} />
              </Field>
              <Field label="Lugar" error={e.place?.message}>
                <Input {...register('place')} placeholder="Sede, plaza, predio…" />
              </Field>
              <Field label="Duración (minutos)" error={e.durationMin?.message}>
                <Input type="number" min={0} {...register('durationMin')} />
              </Field>
              <Field label="Responsable de la actividad" error={e.responsibleAdultId?.message}>
                <Select {...register('responsibleAdultId')}>
                  <option value="">Sin asignar</option>
                  {adultOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.lastName}, {a.firstName}
                      {a.totem ? ` «${a.totem}»` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo de oportunidad de aprendizaje" hint="Según la guía de SAAC">
                <Select {...register('opportunityType')}>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {OPPORTUNITY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Alcance">
                <Select {...register('scope')}>
                  {SHEET_SCOPES.map((t) => (
                    <option key={t} value={t}>
                      {SHEET_SCOPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              {type === 'campamento' ? (
                <Field label="Noches de campamento" error={e.nights?.message} hint="Cuenta para los estándares anuales de la unidad">
                  <Input type="number" min={0} {...register('nights')} />
                </Field>
              ) : null}
              <Field label="Ciclo de programa" error={e.cycleId?.message}>
                <Select {...register('cycleId')} disabled={!unitId}>
                  <option value="">Sin ciclo</option>
                  {cycles.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Destinatarios y propósito">
            <div className="form-grid">
              <Field label="Área de desarrollo" error={e.areaId?.message}>
                <Select {...register('areaId')} disabled={!unitId}>
                  <option value="">Elegí el área</option>
                  {areas.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Participantes" error={e.participants?.message} hint="Se propone con los protagonistas activos de la unidad">
                <Input type="number" min={0} {...register('participants')} />
              </Field>
              <Field label="Edad desde" error={e.ageMin?.message}>
                <Input type="number" min={3} max={30} {...register('ageMin')} />
              </Field>
              <Field label="Edad hasta" error={e.ageMax?.message}>
                <Input type="number" min={3} max={30} {...register('ageMax')} />
              </Field>
              <Field label={`Objetivos · ${objectivesHeader(branch)}`} error={e.objectivesText?.message} hint="Uno por línea" full>
                <Textarea rows={4} {...register('objectivesText')} placeholder={'Reconocer las letras en Morse\nTrabajar en equipo con su patrulla'} />
              </Field>
              <div className="field full">
                <label>Propósito: competencias de la rama</label>
                <CompetencyPicker branch={branch} value={competencyIds} onChange={setCompetencyIds} />
                {/* competencyIds no es un campo del formulario (vive en estado aparte), pero la validación puede marcarlo */}
                {(e as Record<string, { message?: string } | undefined>).competencyIds?.message ? (
                  <span className="error">{(e as Record<string, { message?: string } | undefined>).competencyIds?.message}</span>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="Desarrollo">
            <div className="form-grid">
              <Field label={explorationLabel(branch)} error={e.exploration?.message} full>
                <Textarea rows={3} {...register('exploration')} />
              </Field>
              <Field label="Descripción de la actividad" error={e.description?.message} full>
                <Textarea rows={8} {...register('description')} />
              </Field>
              <Field label="Recupero" hint="La reflexión o el cierre con los protagonistas" error={e.closing?.message} full>
                <Textarea rows={3} {...register('closing')} />
              </Field>
              <Field label="Función de los demás educadores" error={e.otherEducators?.message} full>
                <Textarea rows={3} {...register('otherEducators')} />
              </Field>
              <Field label="Materiales" hint="Uno por línea" error={e.materialsText?.message} full>
                <Textarea rows={4} {...register('materialsText')} placeholder={'Linternas\nPlanillas con el alfabeto Morse'} />
              </Field>
            </div>
          </Card>

          <Card title="Seguridad">
            <div className="stack">
              <Checkbox label="Es fuera de la sede" {...register('outside')} />
              {outside ? (
                <Field label="Riesgos y medidas" required error={e.safety?.message} hint="Obligatorio cuando la actividad es fuera de la sede">
                  <Textarea rows={4} {...register('safety')} invalid={!!e.safety} />
                </Field>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Si la actividad es fuera de la sede, tildá la casilla y completá los riesgos y las medidas.
                </p>
              )}
            </div>
          </Card>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={formState.isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear ficha'}
          </Button>
        </div>
      </form>
    </>
  );
}

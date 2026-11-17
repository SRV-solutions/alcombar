import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ClipboardPaste, Pencil, Plus, Trash2 } from 'lucide-react';
import { BRANCHES, BRANCH_INFO, parseCompetencyLines, type Branch } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea } from '../../components/ui';
import { useAreas, useCompetencies, useProgramUnit } from '../program/common';
import type { Area, CompetencyItem } from '../program/types';
import { FormDialog, toLines, type FieldDef, type FormValue } from './FormDialog';
import type { Scheme, SchemesResponse, Specialty, Stage } from './types';
import './progression.css';

type TabKey = 'competencias' | 'areas' | 'etapas' | 'especialidades';
type Dialog = { title: string; fields: FieldDef[]; initial: Record<string, FormValue>; onSave: (v: Record<string, FormValue>) => Promise<unknown>; intro?: React.ReactNode; wide?: boolean };

const branchLabel = (b: string) => BRANCH_INFO[b as Branch]?.label ?? b;

// ---------------------------------------------------------------- Competencias
function BulkDialog({ branch, areas, onClose, onDone }: { branch: string; areas: Area[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [areaId, setAreaId] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => parseCompetencyLines(text), [text]);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ created: number; skipped: number }>('/program/competencies/bulk', { branch, areaId, text });
      toast.ok(`Se cargaron ${r.created} competencias${r.skipped ? ` · ${r.skipped} ya estaban y se saltearon` : ''}`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title={`Importar competencias · ${branchLabel(branch)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!rows.length}>
            <ClipboardPaste /> Importar {rows.length || ''} competencias
          </Button>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0 }}>
          Pegá la lista del cuadernillo de la rama, <strong>una competencia por línea</strong>. Si la línea empieza con un número («12. Cuido mi cuerpo…» o «12) …»), se guarda como su
          número. Las que ya existen (mismo número o mismo nombre) se saltean.
        </p>
        <Field label="Área de estas competencias" hint="Si la lista mezcla áreas, importalas por partes o asignales el área después">
          <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Sin área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lista">
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. Nombre de la competencia\n2. Otra competencia\n…'} autoFocus />
        </Field>
        {rows.length ? (
          <div className="bulk-preview" aria-label="Vista previa">
            {rows.map((r, i) => (
              <div key={i}>
                {r.number ? <strong>{r.number}. </strong> : null}
                {r.name}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function CompetenciesTab({ branch, canEdit, openDialog }: { branch: string; canEdit: boolean; openDialog: (d: Dialog) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const areas = useAreas(branch);
  const comps = useCompetencies(branch, true);
  const [bulk, setBulk] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['program-competencies'] });
  const areaOptions = [{ value: '', label: 'Sin área' }, ...(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))];
  const edit = (c?: CompetencyItem) =>
    openDialog({
      title: c ? 'Editar competencia' : `Nueva competencia · ${branchLabel(branch)}`,
      wide: true,
      fields: [
        { key: 'number', label: 'Número', type: 'number', hint: 'El del cuadernillo (opcional)' },
        { key: 'areaId', label: 'Área', type: 'select', options: areaOptions },
        { key: 'name', label: 'Competencia', required: true, full: true },
        { key: 'description', label: 'Descripción', type: 'textarea' },
        { key: 'requiredChallenges', label: 'Desafíos obligatorios', type: 'textarea', hint: 'Uno por línea' },
        { key: 'optionalChallenges', label: 'Desafíos opcionales', type: 'textarea', hint: 'Uno por línea' },
        { key: 'active', label: 'Activa (se puede elegir)', type: 'checkbox' },
      ],
      initial: {
        number: c?.number?.toString() ?? '',
        areaId: c?.areaId ?? '',
        name: c?.name ?? '',
        description: c?.description ?? '',
        requiredChallenges: (c?.requiredChallenges ?? []).join('\n'),
        optionalChallenges: (c?.optionalChallenges ?? []).join('\n'),
        active: c?.active ?? true,
      },
      onSave: async (v) => {
        const body = { ...v, branch, requiredChallenges: toLines(v.requiredChallenges), optionalChallenges: toLines(v.optionalChallenges) };
        if (c) await api.put(`/program/competencies/${c.id}`, body);
        else await api.post('/program/competencies', body);
        toast.ok(c ? 'Competencia guardada' : 'Competencia creada');
        refresh();
      },
    });

  if (comps.isLoading || areas.isLoading) return <Loading />;
  if (comps.error) return <ErrorBox error={comps.error} />;
  const list = comps.data ?? [];
  const groups = [...(areas.data ?? []).map((a) => ({ id: a.id as string | null, name: a.name })), { id: null, name: 'Sin área' }];
  return (
    <Card
      title={`Competencias de ${branchLabel(branch)} (${list.length})`}
      actions={
        canEdit ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulk(true)} className="comp-import">
              <ClipboardPaste /> Importar lista
            </Button>
            <Button size="sm" onClick={() => edit()} className="comp-new">
              <Plus /> Nueva competencia
            </Button>
          </>
        ) : null
      }
    >
      {!list.length ? (
        <Empty>
          Todavía no hay competencias cargadas para {branchLabel(branch)}.{canEdit ? ' Usá «Importar lista» para pegarlas del cuadernillo de la rama.' : ''}
        </Empty>
      ) : (
        groups.map((g) => {
          const items = list.filter((c) => (c.areaId ?? null) === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id ?? 'none'} className="comp-list mb">
              <div className="area-title">
                {g.name} ({items.length})
              </div>
              {items.map((c) => (
                <div key={c.id} className="item-row">
                  <div className="body">
                    {c.number ? <strong>{c.number}. </strong> : null}
                    {c.name} {!c.active ? <Badge tone="neutral">Inactiva</Badge> : null}
                    {c.description ? <p className="muted">{c.description}</p> : null}
                    {c.requiredChallenges.length || c.optionalChallenges.length ? (
                      <p className="muted">
                        {c.requiredChallenges.length} desafíos obligatorios · {c.optionalChallenges.length} opcionales
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="row-actions">
                      <Button variant="ghost" size="sm" className="btn-icon" onClick={() => edit(c)} aria-label="Editar" title="Editar">
                        <Pencil />
                      </Button>
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        title="Eliminar competencia"
                        message="Si algún protagonista ya la eligió o hay fichas que la usan, se desactiva en lugar de borrarse."
                        confirmLabel="Eliminar"
                        onConfirm={async () => {
                          try {
                            const r = await api.del<{ deactivated?: boolean }>(`/program/competencies/${c.id}`);
                            toast.ok(r.deactivated ? 'Estaba en uso: quedó desactivada' : 'Competencia eliminada');
                            refresh();
                          } catch (e) {
                            toast.error(e);
                          }
                        }}
                      >
                        <Trash2 />
                      </ConfirmButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          );
        })
      )}
      {bulk ? <BulkDialog branch={branch} areas={areas.data ?? []} onClose={() => setBulk(false)} onDone={refresh} /> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- Áreas
function AreasTab({ branch, canEdit, openDialog }: { branch: string; canEdit: boolean; openDialog: (d: Dialog) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const areas = useAreas(branch);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['program-areas'] });
  const edit = (a?: Area) =>
    openDialog({
      title: a ? 'Editar área' : `Nueva área · ${branchLabel(branch)}`,
      fields: [
        { key: 'name', label: 'Nombre', required: true },
        { key: 'sortOrder', label: 'Orden', type: 'number' },
      ],
      initial: { name: a?.name ?? '', sortOrder: String(a?.sortOrder ?? (areas.data?.length ?? 0) + 1) },
      onSave: async (v) => {
        if (a) await api.put(`/program/areas/${a.id}`, { ...v, branch });
        else await api.post('/program/areas', { ...v, branch });
        toast.ok('Área guardada');
        refresh();
      },
    });
  if (areas.isLoading) return <Loading />;
  if (areas.error) return <ErrorBox error={areas.error} />;
  return (
    <Card
      title={`Áreas de desarrollo · ${branchLabel(branch)}`}
      actions={
        canEdit ? (
          <Button size="sm" onClick={() => edit()}>
            <Plus /> Nueva área
          </Button>
        ) : null
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Las competencias se agrupan por área y el tablero muestra el balance de cada protagonista entre ellas.
      </p>
      {!areas.data?.length ? (
        <Empty>No hay áreas para esta rama.</Empty>
      ) : (
        areas.data.map((a) => (
          <div key={a.id} className="item-row">
            <div className="body">
              <span className="muted">{a.sortOrder}.</span> <strong>{a.name}</strong>
            </div>
            {canEdit ? (
              <div className="row-actions">
                <Button variant="ghost" size="sm" className="btn-icon" onClick={() => edit(a)} aria-label="Editar" title="Editar">
                  <Pencil />
                </Button>
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  title="Eliminar área"
                  message={`¿Eliminar el área «${a.name}»? Solo se puede si no tiene competencias.`}
                  confirmLabel="Eliminar"
                  onConfirm={async () => {
                    try {
                      await api.del(`/program/areas/${a.id}`);
                      toast.ok('Área eliminada');
                      refresh();
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  <Trash2 />
                </ConfirmButton>
              </div>
            ) : null}
          </div>
        ))
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Etapas
function StagesTab({ branch, schemes, canEdit, openDialog }: { branch: string; schemes: Scheme[]; canEdit: boolean; openDialog: (d: Dialog) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [newStage, setNewStage] = useState<Record<string, string>>({});
  const refresh = () => void qc.invalidateQueries({ queryKey: ['progression-schemes'] });
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.ok(ok);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const editScheme = (s?: Scheme) =>
    openDialog({
      title: s ? 'Editar esquema' : `Nuevo esquema · ${branchLabel(branch)}`,
      intro: (
        <p className="muted" style={{ margin: 0 }}>
          Se usa el esquema <strong>activo</strong> de versión más alta. Si cambia el esquema de la rama, creá una versión nueva: la historia de cada protagonista queda con el esquema
          que tenía.
        </p>
      ),
      fields: [
        { key: 'name', label: 'Nombre', required: true, placeholder: 'Ej: Rumbo Sur' },
        { key: 'version', label: 'Versión', type: 'number' },
        { key: 'active', label: 'Activo', type: 'checkbox' },
      ],
      initial: { name: s?.name ?? '', version: String(s?.version ?? Math.max(0, ...schemes.map((x) => x.version)) + 1), active: s?.active ?? true },
      onSave: async (v) => {
        if (s) await api.put(`/progression/schemes/${s.id}`, { ...v, branch });
        else await api.post('/progression/schemes', { ...v, branch });
        toast.ok('Esquema guardado');
        refresh();
      },
    });
  const editStage = (st: Stage) =>
    openDialog({
      title: 'Editar etapa',
      fields: [
        { key: 'name', label: 'Nombre', required: true },
        { key: 'description', label: 'Descripción', type: 'textarea' },
      ],
      initial: { name: st.name, description: st.description ?? '' },
      onSave: async (v) => {
        await api.put(`/progression/stages/${st.id}`, v);
        toast.ok('Etapa guardada');
        refresh();
      },
    });

  return (
    <div className="stack" style={{ gap: 16 }}>
      {canEdit ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => editScheme()}>
            <Plus /> Nuevo esquema
          </Button>
        </div>
      ) : null}
      {!schemes.length ? <Empty>No hay esquemas de progresión para {branchLabel(branch)}.</Empty> : null}
      {schemes.map((s) => (
        <Card
          key={s.id}
          title={
            <h2>
              {s.name} · v{s.version} {s.active ? <Badge tone="ok">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
            </h2>
          }
          actions={
            canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => editScheme(s)}>
                <Pencil /> Editar esquema
              </Button>
            ) : null
          }
        >
          {!s.stages.length ? (
            <p className="muted" style={{ marginTop: 0 }}>
              Sin etapas: el esquema está a definir.
            </p>
          ) : (
            s.stages.map((st, i) => (
              <div key={st.id} className="item-row">
                <div className="body">
                  <span className="muted">{i + 1}.</span> <strong>{st.name}</strong>
                  {st.description ? <p className="muted">{st.description}</p> : null}
                </div>
                {canEdit ? (
                  <div className="row-actions">
                    <Button variant="ghost" size="sm" className="btn-icon" disabled={i === 0} onClick={() => run(() => api.post(`/progression/stages/${st.id}/move`, { direction: 'up' }))} aria-label="Subir" title="Subir">
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="btn-icon"
                      disabled={i === s.stages.length - 1}
                      onClick={() => run(() => api.post(`/progression/stages/${st.id}/move`, { direction: 'down' }))}
                      aria-label="Bajar"
                      title="Bajar"
                    >
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="sm" className="btn-icon" onClick={() => editStage(st)} aria-label="Editar" title="Editar">
                      <Pencil />
                    </Button>
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      title="Eliminar etapa"
                      message={`¿Eliminar la etapa «${st.name}»? No se puede si algún protagonista la tiene en su historia.`}
                      confirmLabel="Eliminar"
                      onConfirm={() => run(() => api.del(`/progression/stages/${st.id}`), 'Etapa eliminada')}
                    >
                      <Trash2 />
                    </ConfirmButton>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {canEdit ? (
            <form
              className="row mt"
              style={{ gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                const name = (newStage[s.id] ?? '').trim();
                if (!name) return;
                void run(async () => {
                  await api.post(`/progression/schemes/${s.id}/stages`, { name });
                  setNewStage((p) => ({ ...p, [s.id]: '' }));
                }, 'Etapa agregada');
              }}
            >
              <Input placeholder="Nombre de la nueva etapa" value={newStage[s.id] ?? ''} onChange={(e) => setNewStage((p) => ({ ...p, [s.id]: e.target.value }))} style={{ maxWidth: 320 }} />
              <Button type="submit" variant="secondary" disabled={!(newStage[s.id] ?? '').trim()}>
                <Plus /> Agregar etapa
              </Button>
            </form>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Especialidades
function SpecialtiesTab({ canEdit, openDialog }: { canEdit: boolean; openDialog: (d: Dialog) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['progression-specialties', 'all'], queryFn: () => api.get<Specialty[]>('/progression/specialties?active=all') });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['progression-specialties'] });
  const edit = (s?: Specialty) =>
    openDialog({
      title: s ? 'Editar especialidad' : 'Nueva especialidad',
      fields: [
        { key: 'name', label: 'Nombre', required: true, full: true },
        { key: 'description', label: 'Descripción', type: 'textarea' },
        { key: 'active', label: 'Activa', type: 'checkbox' },
      ],
      initial: { name: s?.name ?? '', description: s?.description ?? '', active: s?.active ?? true },
      onSave: async (v) => {
        if (s) await api.put(`/progression/specialties/${s.id}`, v);
        else await api.post('/progression/specialties', v);
        toast.ok('Especialidad guardada');
        refresh();
      },
    });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  return (
    <Card
      title={`Especialidades (${q.data?.length ?? 0})`}
      actions={
        canEdit ? (
          <Button size="sm" onClick={() => edit()}>
            <Plus /> Nueva especialidad
          </Button>
        ) : null
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Catálogo común a todas las ramas. Después se registran en la progresión de cada protagonista.
      </p>
      {!q.data?.length ? (
        <Empty>Todavía no hay especialidades cargadas.</Empty>
      ) : (
        q.data.map((s) => (
          <div key={s.id} className="item-row">
            <div className="body">
              <strong>{s.name}</strong> {!s.active ? <Badge tone="neutral">Inactiva</Badge> : null}
              {s.description ? <p className="muted">{s.description}</p> : null}
            </div>
            {canEdit ? (
              <div className="row-actions">
                <Button variant="ghost" size="sm" className="btn-icon" onClick={() => edit(s)} aria-label="Editar" title="Editar">
                  <Pencil />
                </Button>
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  title="Eliminar especialidad"
                  message="Si algún protagonista ya la tiene, se desactiva en lugar de borrarse."
                  confirmLabel="Eliminar"
                  onConfirm={async () => {
                    try {
                      const r = await api.del<{ deactivated?: boolean }>(`/progression/specialties/${s.id}`);
                      toast.ok(r.deactivated ? 'Estaba en uso: quedó desactivada' : 'Especialidad eliminada');
                      refresh();
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  <Trash2 />
                </ConfirmButton>
              </div>
            ) : null}
          </div>
        ))
      )}
    </Card>
  );
}

/** Progresión → Esquemas y catálogos: competencias, áreas, etapas y especialidades de cada rama. */
export function SchemesPage() {
  const [params, setParams] = useSearchParams();
  const { unit } = useProgramUnit('view', 'progression');
  const branch = params.get('branch') || unit?.branch || 'scouts';
  const tab = (params.get('tab') as TabKey) || 'competencias';
  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    n.set(k, v);
    setParams(n, { replace: true });
  };
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const schemes = useQuery({ queryKey: ['progression-schemes', branch], queryFn: () => api.get<SchemesResponse>(`/progression/schemes?branch=${branch}`) });
  const canEdit = !!schemes.data?.canEdit;
  return (
    <>
      <PageHeader
        crumbs={[{ to: '/progresion', label: 'Progresión' }]}
        title="Esquemas y catálogos"
        sub="Lo que comparten las fichas y la progresión de cada rama: áreas, competencias, etapas y especialidades."
      />
      <div className="toolbar">
        <Select value={branch} onChange={(e) => setParam('branch', e.target.value)} aria-label="Rama" style={{ width: 'auto' }}>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {BRANCH_INFO[b].label}
            </option>
          ))}
        </Select>
        {!schemes.isLoading && !canEdit ? <span className="muted">Solo lectura: los catálogos los editan Jefatura de Grupo y el equipo de Programa.</span> : null}
      </div>
      <Tabs<TabKey>
        tabs={[
          { key: 'competencias', label: 'Competencias' },
          { key: 'areas', label: 'Áreas' },
          { key: 'etapas', label: 'Etapas' },
          { key: 'especialidades', label: 'Especialidades' },
        ]}
        value={tab}
        onChange={(k) => setParam('tab', k)}
      />
      <div className="mt">
        {tab === 'competencias' ? <CompetenciesTab branch={branch} canEdit={canEdit} openDialog={setDialog} /> : null}
        {tab === 'areas' ? <AreasTab branch={branch} canEdit={canEdit} openDialog={setDialog} /> : null}
        {tab === 'etapas' ? (
          schemes.isLoading ? (
            <Loading />
          ) : schemes.error ? (
            <ErrorBox error={schemes.error} />
          ) : (
            <StagesTab branch={branch} schemes={schemes.data?.schemes ?? []} canEdit={canEdit} openDialog={setDialog} />
          )
        ) : null}
        {tab === 'especialidades' ? <SpecialtiesTab canEdit={canEdit} openDialog={setDialog} /> : null}
      </div>
      {dialog ? <FormDialog {...dialog} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

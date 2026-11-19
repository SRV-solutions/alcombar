import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  adultExperienceSchema,
  adultHabilitationSchema,
  BRANCHES,
  BRANCH_INFO,
  CERTIFICATE_MAX_BYTES,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
  EXPERIENCE_STATUSES,
  EXPERIENCE_STATUS_LABELS,
  formatDate,
  HABILITATION_LEVELS,
  HABILITATION_LEVEL_LABELS,
  HABILITATION_STATUSES,
  HABILITATION_STATUS_LABELS,
  type AdultExperienceInput,
  type AdultHabilitationInput,
  type Branch,
  type ExperienceKind,
  type ExperienceStatus,
  type HabilitationLevel,
  type HabilitationStatus,
} from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import type { AdultExperience, AdultHabilitation } from '../../lib/types';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Input, Modal, Select, Textarea } from '../../components/ui';

const dash = <span className="muted">—</span>;
const branchLabel = (b: string | null) => (b ? BRANCH_INFO[b as Branch]?.label ?? b : null);
const LEVEL_ORDER: Record<string, number> = { avanzada: 0, intermedia: 1, basica: 2 };

function BranchSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Select {...props}>
      <option value="">— Sin rama —</option>
      {BRANCHES.map((b) => (
        <option key={b} value={b}>
          {BRANCH_INFO[b].label}
        </option>
      ))}
    </Select>
  );
}

function useRefreshAdult(adultId: string) {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['adult', adultId] }), qc.invalidateQueries({ queryKey: ['adults'] })]);
}

// ---------------- Habilitaciones ----------------
function HabilitationModal({ adultId, item, onClose }: { adultId: string; item?: AdultHabilitation; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshAdult(adultId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdultHabilitationInput>({
    resolver: zodResolver(adultHabilitationSchema),
    defaultValues: item
      ? {
          level: item.level as HabilitationLevel,
          branch: (item.branch as Branch | null) ?? '',
          actDate: item.actDate ?? '',
          book: item.book ?? '',
          folio: item.folio ?? '',
          status: item.status as HabilitationStatus,
          notes: item.notes ?? '',
        }
      : { level: 'basica', branch: '', actDate: '', book: '', folio: '', status: 'autorizada', notes: '' },
  });
  const onSubmit = async (values: AdultHabilitationInput) => {
    try {
      if (item) await api.put(`/adults/habilitations/${item.id}`, values);
      else await api.post(`/adults/${adultId}/habilitations`, values);
      await refresh();
      toast.ok(item ? 'Habilitación actualizada' : 'Habilitación registrada');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      title={item ? 'Editar habilitación' : 'Registrar habilitación'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="habilitation-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="habilitation-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Etapa" required error={errors.level?.message}>
          <Select {...register('level')} invalid={!!errors.level}>
            {HABILITATION_LEVELS.map((l) => (
              <option key={l} value={l}>
                {HABILITATION_LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rama" error={errors.branch?.message}>
          <BranchSelect {...register('branch')} />
        </Field>
        <Field label="Fecha del acta" error={errors.actDate?.message}>
          <Input type="date" {...register('actDate')} invalid={!!errors.actDate} />
        </Field>
        <Field label="Estado" error={errors.status?.message}>
          <Select {...register('status')}>
            {HABILITATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {HABILITATION_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Libro" error={errors.book?.message} hint="Del libro de actas, como figura en Mi Rincón">
          <Input {...register('book')} invalid={!!errors.book} />
        </Field>
        <Field label="Folio" error={errors.folio?.message}>
          <Input {...register('folio')} invalid={!!errors.folio} />
        </Field>
        <Field label="Notas" error={errors.notes?.message} full>
          <Textarea {...register('notes')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

export function HabilitationsCard({ adultId, items }: { adultId: string; items: AdultHabilitation[] }) {
  const { can } = useAuth();
  const toast = useToast();
  const refresh = useRefreshAdult(adultId);
  const [editing, setEditing] = useState<AdultHabilitation | 'new' | null>(null);
  const list = [...items].sort(
    (a, b) => (a.branch ?? '').localeCompare(b.branch ?? '') || (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || (b.actDate ?? '').localeCompare(a.actDate ?? ''),
  );
  const actions = can('training', 'edit') || can('training', 'delete');
  const remove = async (h: AdultHabilitation) => {
    try {
      await api.del(`/adults/habilitations/${h.id}`);
      await refresh();
      toast.ok('Habilitación eliminada');
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Card
      title="Habilitaciones"
      bodyClass=""
      actions={
        can('training', 'create') ? (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Registrar habilitación
          </Button>
        ) : null
      }
    >
      {!list.length ? (
        <Empty>Sin habilitaciones registradas. Son las etapas (básica, intermedia, avanzada) que figuran en Mi Rincón.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Rama</th>
                <th>Fecha del acta</th>
                <th>Acta</th>
                <th>Estado</th>
                {actions ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id}>
                  <td>{HABILITATION_LEVEL_LABELS[h.level as HabilitationLevel] ?? h.level}</td>
                  <td>{branchLabel(h.branch) ?? dash}</td>
                  <td className="nowrap">{h.actDate ? formatDate(h.actDate) : dash}</td>
                  <td>{h.book || h.folio ? [h.book ? `Libro ${h.book}` : null, h.folio ? `Folio ${h.folio}` : null].filter(Boolean).join(' · ') : dash}</td>
                  <td>
                    <Badge tone={h.status === 'autorizada' ? 'ok' : 'warn'}>{HABILITATION_STATUS_LABELS[h.status as HabilitationStatus] ?? h.status}</Badge>
                  </td>
                  {actions ? (
                    <td className="num nowrap">
                      {can('training', 'edit') ? (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(h)} aria-label="Editar habilitación">
                          <Pencil />
                        </Button>
                      ) : null}
                      {can('training', 'delete') ? (
                        <ConfirmButton
                          size="sm"
                          title="Eliminar habilitación"
                          message={<p>¿Eliminar la habilitación de «{HABILITATION_LEVEL_LABELS[h.level as HabilitationLevel] ?? h.level}»?</p>}
                          confirmLabel="Eliminar"
                          onConfirm={() => remove(h)}
                        >
                          <Trash2 />
                        </ConfirmButton>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <HabilitationModal adultId={adultId} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

// ---------------- Experiencias de formación ----------------
function ExperienceModal({ adultId, item, onClose }: { adultId: string; item?: AdultExperience; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshAdult(adultId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdultExperienceInput>({
    resolver: zodResolver(adultExperienceSchema),
    defaultValues: item
      ? {
          name: item.name,
          kind: item.kind as ExperienceKind,
          organism: item.organism ?? '',
          branch: (item.branch as Branch | null) ?? '',
          date: item.date ?? '',
          status: item.status as ExperienceStatus,
          notes: item.notes ?? '',
        }
      : { name: '', kind: 'formacion', organism: '', branch: '', date: '', status: 'acreditada', notes: '' },
  });
  const onSubmit = async (values: AdultExperienceInput) => {
    try {
      if (item) await api.put(`/adults/experiences/${item.id}`, values);
      else await api.post(`/adults/${adultId}/experiences`, values);
      await refresh();
      toast.ok(item ? 'Experiencia actualizada' : 'Experiencia registrada');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      title={item ? 'Editar experiencia' : 'Registrar experiencia de formación'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="experience-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="experience-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Experiencia" required error={errors.name?.message} full hint="El nombre como figura en Mi Rincón">
          <Input {...register('name')} invalid={!!errors.name} placeholder="El Clima Educativo en la rama Scouts" />
        </Field>
        <Field label="Tipo" error={errors.kind?.message}>
          <Select {...register('kind')}>
            {EXPERIENCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {EXPERIENCE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha cursada" error={errors.date?.message}>
          <Input type="date" {...register('date')} invalid={!!errors.date} />
        </Field>
        <Field label="Quién la dictó" error={errors.organism?.message} hint="Zona, distrito o nivel nacional. Por ejemplo: Z1">
          <Input {...register('organism')} invalid={!!errors.organism} />
        </Field>
        <Field label="Rama" error={errors.branch?.message}>
          <BranchSelect {...register('branch')} />
        </Field>
        <Field label="Estado" error={errors.status?.message}>
          <Select {...register('status')}>
            {EXPERIENCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EXPERIENCE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notas" error={errors.notes?.message} full hint={item ? undefined : 'El certificado en PDF se adjunta después, desde la lista'}>
          <Textarea {...register('notes')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });

export function ExperiencesCard({ adultId, items }: { adultId: string; items: AdultExperience[] }) {
  const { can } = useAuth();
  const toast = useToast();
  const refresh = useRefreshAdult(adultId);
  const [editing, setEditing] = useState<AdultExperience | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<AdultExperience | null>(null);
  const list = [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.name.localeCompare(b.name, 'es'));
  const canEdit = can('training', 'edit');
  const actions = canEdit || can('training', 'delete');

  const remove = async (x: AdultExperience) => {
    try {
      await api.del(`/adults/experiences/${x.id}`);
      await refresh();
      toast.ok('Experiencia eliminada');
    } catch (e) {
      toast.error(e);
    }
  };
  const pickFile = (x: AdultExperience) => {
    target.current = x;
    fileInput.current?.click();
  };
  const upload = async (file: File | undefined) => {
    const x = target.current;
    if (fileInput.current) fileInput.current.value = '';
    if (!file || !x) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return toast.error(new Error('El certificado tiene que ser un PDF'));
    if (file.size > CERTIFICATE_MAX_BYTES) return toast.error(new Error('El PDF es muy pesado (máximo 3 MB)'));
    setBusy(x.id);
    try {
      await api.put(`/adults/experiences/${x.id}/certificate`, { name: file.name, data: await readAsBase64(file) });
      await refresh();
      toast.ok('Certificado adjuntado');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  const removeCertificate = async (x: AdultExperience) => {
    try {
      await api.del(`/adults/experiences/${x.id}/certificate`);
      await refresh();
      toast.ok('Certificado quitado');
    } catch (e) {
      toast.error(e);
    }
  };
  const view = async (x: AdultExperience) => {
    setBusy(x.id);
    try {
      await api.openFile(`/adults/experiences/${x.id}/certificate`);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title={`Experiencias de formación${list.length ? ` (${list.length})` : ''}`}
      bodyClass=""
      actions={
        can('training', 'create') ? (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Registrar experiencia
          </Button>
        ) : null
      }
    >
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} />
      {!list.length ? (
        <Empty>Sin experiencias registradas. Es el historial que cada adulto ve en Mi Rincón, en «Mi Formación».</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Experiencia</th>
                <th>Fecha</th>
                <th>Rama</th>
                <th>Estado</th>
                <th>Certificado</th>
                {actions ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td>
                    {x.organism ? <span className="muted">({x.organism}) </span> : null}
                    {x.name}
                    <div className="muted" style={{ fontSize: '0.85em' }}>
                      {EXPERIENCE_KIND_LABELS[x.kind as ExperienceKind] ?? x.kind}
                      {x.notes ? ` · ${x.notes}` : ''}
                    </div>
                  </td>
                  <td className="nowrap">{x.date ? formatDate(x.date) : dash}</td>
                  <td>{branchLabel(x.branch) ?? dash}</td>
                  <td>
                    <Badge tone={x.status === 'acreditada' ? 'ok' : 'warn'}>{EXPERIENCE_STATUS_LABELS[x.status as ExperienceStatus] ?? x.status}</Badge>
                  </td>
                  <td className="nowrap">
                    {x.certificateName ? (
                      <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <Button variant="ghost" size="sm" loading={busy === x.id} onClick={() => void view(x)} title={x.certificateName}>
                          <FileText /> Ver PDF
                        </Button>
                        {canEdit ? (
                          <ConfirmButton
                            size="sm"
                            title="Quitar certificado"
                            message={<p>¿Quitar el certificado de «{x.name}»? La experiencia queda registrada.</p>}
                            confirmLabel="Quitar"
                            onConfirm={() => removeCertificate(x)}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        ) : null}
                      </div>
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" loading={busy === x.id} onClick={() => pickFile(x)}>
                        <Paperclip /> Adjuntar PDF
                      </Button>
                    ) : (
                      dash
                    )}
                  </td>
                  {actions ? (
                    <td className="num nowrap">
                      {canEdit ? (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(x)} aria-label="Editar experiencia">
                          <Pencil />
                        </Button>
                      ) : null}
                      {can('training', 'delete') ? (
                        <ConfirmButton
                          size="sm"
                          title="Eliminar experiencia"
                          message={<p>¿Eliminar «{x.name}» del historial? También se borra su certificado.</p>}
                          confirmLabel="Eliminar"
                          onConfirm={() => remove(x)}
                        >
                          <Trash2 />
                        </ConfirmButton>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <ExperienceModal adultId={adultId} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CAMP_STATUS_LABELS, campSiteSchema, formatDate, type CampSiteInput, type CampStatus } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Textarea, UnitBadge } from '../../components/ui';
import type { UnitRef } from '../../lib/types';
import { useCampSites } from './CampsPage';
import type { CampSiteRow } from './types';
import '../accounting/accounting.css';
import './camps.css';

/** Estrellas de 1 a 5 (solo lectura o editable). */
export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const v = Math.round(value);
  return (
    <span className="stars" aria-label={`${value || 0} de 5`}>
      {[1, 2, 3, 4, 5].map((i) =>
        onChange ? (
          <button key={i} type="button" className={i <= v ? '' : 'off'} onClick={() => onChange(i)} aria-label={`${i} estrellas`}>
            ★
          </button>
        ) : (
          <span key={i} className={i <= v ? '' : 'off'}>
            ★
          </span>
        ),
      )}
    </span>
  );
}

interface SiteHistory extends CampSiteRow {
  history: { id: string; name: string; type: string; startDate: string; endDate: string; status: CampStatus; siteRating: number | null; siteReview: string | null; ownerUnit: UnitRef | null }[];
}

export function CampSitesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const sites = useCampSites();
  const [editing, setEditing] = useState<CampSiteRow | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Lugares de acampe"
        crumbs={[{ to: '/campamentos', label: 'Campamentos y salidas' }]}
        sub="Catálogo de predios y lugares con contacto, capacidad, servicios y la evaluación de cada campamento que se hizo ahí."
        actions={
          can('camps', 'create') ? (
            <Button onClick={() => setEditing('new')} id="btn-new-site">
              <Plus /> Nuevo lugar
            </Button>
          ) : null
        }
      />
      <Card bodyClass="table-wrap">
        {sites.isLoading ? (
          <Loading />
        ) : sites.error ? (
          <div className="card-body">
            <ErrorBox error={sites.error} />
          </div>
        ) : !sites.data?.length ? (
          <Empty>Todavía no hay lugares cargados.</Empty>
        ) : (
          <table className="table" id="camp-sites-table">
            <thead>
              <tr>
                <th>Lugar</th>
                <th>Contacto</th>
                <th className="num">Capacidad</th>
                <th>Evaluación</th>
                <th>Último uso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sites.data.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => setOpen(s.id)}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted">{[s.location, s.address].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td>{s.contact ?? <span className="muted">—</span>}</td>
                  <td className="num">{s.capacity ?? '—'}</td>
                  <td className="nowrap">
                    {s.rating ? (
                      <>
                        <Stars value={s.rating} /> <span className="muted">{s.rating.toString().replace('.', ',')}</span>
                      </>
                    ) : (
                      <span className="muted">Sin evaluar</span>
                    )}
                    <div className="muted">{s.camps ? `${s.camps} ${s.camps === 1 ? 'campamento' : 'campamentos'}` : 'Sin uso'}</div>
                  </td>
                  <td className="nowrap">{formatDate(s.lastUsed)}</td>
                  <td className="num nowrap" onClick={(e) => e.stopPropagation()}>
                    {s.link ? (
                      <a href={s.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" aria-label="Abrir enlace">
                        <ExternalLink />
                      </a>
                    ) : null}
                    {can('camps', 'edit') ? (
                      <Button variant="ghost" size="sm" aria-label="Editar lugar" onClick={() => setEditing(s)}>
                        <Pencil />
                      </Button>
                    ) : null}
                    {can('camps', 'delete') && !s.camps ? (
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        title="Eliminar lugar"
                        message={`¿Eliminar «${s.name}» del catálogo?`}
                        confirmLabel="Eliminar"
                        onConfirm={async () => {
                          try {
                            await api.del(`/camps/sites/${s.id}`);
                            await qc.invalidateQueries({ queryKey: ['camp-sites'] });
                          } catch (e) {
                            toast.error(e);
                          }
                        }}
                      >
                        <Trash2 />
                      </ConfirmButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing ? <SiteDialog site={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {open ? <SiteHistoryModal id={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function SiteHistoryModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['camp-sites', id], queryFn: () => api.get<SiteHistory>(`/camps/sites/${id}`) });
  const s = q.data;
  return (
    <Modal title={s?.name ?? 'Lugar'} onClose={onClose} wide>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : s ? (
        <div className="stack">
          <dl className="dl">
            <dt>Ubicación</dt>
            <dd>{[s.location, s.address].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Contacto</dt>
            <dd>{s.contact ?? '—'}</dd>
            <dt>Capacidad</dt>
            <dd>{s.capacity ?? '—'}</dd>
            <dt>Servicios</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{s.services ?? '—'}</dd>
            <dt>Notas</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{s.notes ?? '—'}</dd>
            {s.link ? (
              <>
                <dt>Enlace</dt>
                <dd>
                  <a href={s.link} target="_blank" rel="noreferrer">
                    {s.link}
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
          <h3 style={{ margin: 0 }}>Campamentos en este lugar</h3>
          {!s.history.length ? (
            <p className="muted">Todavía no se acampó acá.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {s.history.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link to={`/campamentos/${h.id}`}>{h.name}</Link>
                        <div className="muted">
                          {formatDate(h.startDate)} · {h.ownerUnit ? <UnitBadge unit={h.ownerUnit} short /> : 'Grupo'}
                        </div>
                      </td>
                      <td>
                        <Badge>{CAMP_STATUS_LABELS[h.status]}</Badge>
                      </td>
                      <td>
                        {h.siteRating ? <Stars value={h.siteRating} /> : <span className="muted">Sin evaluar</span>}
                        {h.siteReview ? <div className="muted">{h.siteReview}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function SiteDialog({ site, onClose }: { site?: CampSiteRow; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<CampSiteInput>({
    resolver: zodResolver(campSiteSchema),
    defaultValues: site
      ? {
          name: site.name,
          location: site.location ?? '',
          address: site.address ?? '',
          contact: site.contact ?? '',
          capacity: site.capacity ?? '',
          services: site.services ?? '',
          link: site.link ?? '',
          notes: site.notes ?? '',
        }
      : { name: '', location: '', address: '', contact: '', capacity: '', services: '', link: '', notes: '' },
  });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    try {
      if (site) await api.put(`/camps/sites/${site.id}`, v);
      else await api.post('/camps/sites', v);
      toast.ok('Lugar guardado');
      await qc.invalidateQueries({ queryKey: ['camp-sites'] });
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={site ? 'Editar lugar' : 'Nuevo lugar de acampe'}
      onClose={onClose}
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
      <form className="form-grid" onSubmit={onSubmit} noValidate id="camp-site-form">
        <Field label="Nombre" required full error={e.name?.message}>
          <Input {...register('name')} invalid={!!e.name} placeholder="Ej: Campo Scout San Jorge" />
        </Field>
        <Field label="Localidad">
          <Input {...register('location')} placeholder="Ej: General Rodríguez" />
        </Field>
        <Field label="Dirección">
          <Input {...register('address')} />
        </Field>
        <Field label="Contacto">
          <Input {...register('contact')} placeholder="Nombre y teléfono" />
        </Field>
        <Field label="Capacidad (personas)" error={e.capacity?.message}>
          <Input type="number" min="0" {...register('capacity')} />
        </Field>
        <Field label="Servicios" full>
          <Textarea rows={2} {...register('services')} placeholder="Ej: agua potable, baños, fogón, quincho" />
        </Field>
        <Field label="Enlace (web o mapa)" full error={e.link?.message}>
          <Input type="url" {...register('link')} placeholder="https://…" />
        </Field>
        <Field label="Notas" full>
          <Textarea rows={2} {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

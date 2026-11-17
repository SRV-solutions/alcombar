import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supportTeamSchema } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { SupportTeam } from '../../lib/types';
import { Badge, Button, Checkbox, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';

type TeamForm = z.input<typeof supportTeamSchema>;

function TeamModal({ team, onClose }: { team?: SupportTeam; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const adults = useAdults();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeamForm>({
    resolver: zodResolver(supportTeamSchema),
    defaultValues: team
      ? { name: team.name, description: team.description ?? '', leaderAdultId: team.leaderAdultId ?? '', receivesRegistryAlerts: team.receivesRegistryAlerts }
      : { name: '', description: '', leaderAdultId: '', receivesRegistryAlerts: false },
  });

  const onSubmit = async (values: TeamForm) => {
    try {
      if (team) await api.put(`/group/support-teams/${team.id}`, values);
      else await api.post('/group/support-teams', values);
      await qc.invalidateQueries({ queryKey: ['support-teams'] });
      toast.ok(team ? 'Equipo actualizado' : 'Equipo creado');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };

  return (
    <Modal
      title={team ? `Editar ${team.name}` : 'Nuevo equipo de apoyo'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="team-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="team-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Nombre" required error={errors.name?.message} full>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Equipo de Programa" autoFocus />
        </Field>
        <Field label="Responsable" error={errors.leaderAdultId?.message} full>
          <Select {...register('leaderAdultId')}>
            <option value="">— Sin responsable —</option>
            {(adults.data ?? [])
              .filter((a) => a.status !== 'baja')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.lastName}, {a.firstName}
                  {a.totem ? ` («${a.totem}»)` : ''}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Descripción" error={errors.description?.message} full>
          <Textarea {...register('description')} placeholder="Qué hace el equipo" />
        </Field>
        <Field label="Avisos" full hint="Todo el equipo (responsable e integrantes del año) recibe en la campanita y por mail cada alta o baja que hay que cargar en Cruz del Sur.">
          <Checkbox {...register('receivesRegistryAlerts')} label="Recibe los avisos de altas y bajas para Cruz del Sur" />
        </Field>
      </form>
    </Modal>
  );
}

export function SupportTeamsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const teams = useQuery({ queryKey: ['support-teams'], queryFn: () => api.get<SupportTeam[]>('/group/support-teams') });
  const [editing, setEditing] = useState<SupportTeam | 'new' | null>(null);

  const remove = async (t: SupportTeam) => {
    try {
      await api.del(`/group/support-teams/${t.id}`);
      await qc.invalidateQueries({ queryKey: ['support-teams'] });
      toast.ok('Equipo eliminado');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Equipos de apoyo"
        sub="Equipos del Comité Ejecutivo con su responsable. Los integrantes salen de los cargos del año de cada adulto."
        actions={
          can('group', 'create') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nuevo equipo
            </Button>
          ) : null
        }
      />
      {teams.isLoading ? (
        <Loading />
      ) : teams.error ? (
        <ErrorBox error={teams.error} />
      ) : !teams.data?.length ? (
        <Empty>Todavía no hay equipos de apoyo cargados.</Empty>
      ) : (
        <div className="grid grid-2">
          {teams.data.map((t) => (
            <section key={t.id} className="card">
              <div className="card-header">
                <h2>{t.name}</h2>
                <div className="row">
                  {can('group', 'edit') ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                      <Pencil /> Editar
                    </Button>
                  ) : null}
                  {can('group', 'delete') ? (
                    <ConfirmButton
                      size="sm"
                      title={`Eliminar ${t.name}`}
                      message={<p>¿Querés eliminar este equipo? Los cargos asociados de los adultos quedan sin equipo.</p>}
                      confirmLabel="Eliminar"
                      onConfirm={() => remove(t)}
                    >
                      <Trash2 />
                    </ConfirmButton>
                  ) : null}
                </div>
              </div>
              <div className="card-body">
                {t.description ? <p className="muted">{t.description}</p> : null}
                {t.receivesRegistryAlerts ? (
                  <p>
                    <Badge tone="gold">Recibe los avisos de altas y bajas para Cruz del Sur</Badge>
                  </p>
                ) : null}
                <dl className="dl">
                  <dt>Responsable</dt>
                  <dd>{t.leader ? <Link to={`/adultos/${t.leader.id}`}>{adultName(t.leader)}</Link> : <span className="muted">Sin asignar</span>}</dd>
                  <dt>Integrantes {new Date().getFullYear()}</dt>
                  <dd>
                    {t.members.length ? (
                      <ul className="list-plain">
                        {t.members.map((m) => (
                          <li key={`${m.id}-${m.position}`} className="row between">
                            <Link to={`/adultos/${m.id}`}>{adultName(m)}</Link>
                            <span className="muted">{m.position}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">Nadie con cargo en este equipo este año</span>
                    )}
                  </dd>
                </dl>
              </div>
            </section>
          ))}
        </div>
      )}
      {editing ? <TeamModal team={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

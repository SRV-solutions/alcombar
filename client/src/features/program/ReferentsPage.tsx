import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { BRANCH_INFO, type Branch } from '@shared';
import { api } from '../../lib/api';
import { adultName } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, ConfirmButton, ErrorBox, Loading, PageHeader, Select } from '../../components/ui';
import '../../components/notifications.css';

interface Referent {
  assignmentId: string;
  adultId: string;
  firstName: string;
  lastName: string;
  totem: string | null;
  email: string | null;
  phone: string | null;
  warning: string | null;
}
interface ReferentsData {
  year: number;
  team: { id: string; name: string; leader: { id: string; firstName: string; lastName: string; totem: string | null } | null } | null;
  canManage: boolean;
  branches: { branch: Branch; label: string; comingSoon: boolean; referents: Referent[] }[];
  candidates: { id: string; firstName: string; lastName: string; totem: string | null }[];
}

function AddReferent({ branch, data, onDone }: { branch: Branch; data: ReferentsData; onDone: () => void }) {
  const toast = useToast();
  const [adultId, setAdultId] = useState('');
  const [busy, setBusy] = useState(false);
  const taken = new Set(data.branches.find((b) => b.branch === branch)?.referents.map((r) => r.adultId));
  const add = async () => {
    if (!adultId) return;
    setBusy(true);
    try {
      await api.post('/referents', { branch, adultId });
      toast.ok('Referente agregado');
      setAdultId('');
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="referent-add">
      <Select value={adultId} onChange={(e) => setAdultId(e.target.value)} aria-label={`Sumar referente de ${BRANCH_INFO[branch].label}`}>
        <option value="">Sumar referente…</option>
        {data.candidates
          .filter((a) => !taken.has(a.id))
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.lastName}, {a.firstName}
              {a.totem ? ` («${a.totem}»)` : ''}
            </option>
          ))}
      </Select>
      <Button size="sm" onClick={() => void add()} loading={busy} disabled={!adultId}>
        <Plus /> Sumar
      </Button>
    </div>
  );
}

/** Referentes de Programa por rama: a quién consultar las cuestiones de cada rama. Reciben aviso de fichas y campamentos nuevos. */
export function ReferentsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['referents'], queryFn: () => api.get<ReferentsData>('/referents') });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['referents'] });

  const remove = async (r: Referent) => {
    try {
      await api.del(`/referents/${r.assignmentId}`);
      toast.ok('Referente quitado');
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  return (
    <>
      <PageHeader
        title="Referentes de rama"
        sub={
          <>
            Integrantes del equipo de {d.team?.name ?? 'Programa'}
            {d.team?.leader ? (
              <>
                {' '}
                (responsable: <strong>{adultName(d.team.leader)}</strong>)
              </>
            ) : null}{' '}
            a quienes consultar las cuestiones de cada rama. Son por rama, no por unidad: el mismo referente acompaña a todas las unidades de su rama.
          </>
        }
      />
      <div className="card registry-note">
        <div className="card-body">
          <p>
            Cuando una unidad carga una <strong>ficha de actividad</strong> o un <strong>campamento o salida</strong>, al referente de su rama le llega un aviso
            en la campanita y por mail.
          </p>
          <p className="muted">
            Los referentes quedan como cargo {d.year} en el equipo de Programa: también se ven en el organigrama y en la ficha de cada adulto.
          </p>
        </div>
      </div>
      {!d.team ? (
        <div className="card">
          <div className="card-body">Falta crear el equipo de Programa en Grupo → Equipos de apoyo.</div>
        </div>
      ) : (
        <div className="referents-grid">
          {d.branches.map((b) => (
            <section key={b.branch} className="card referent-branch" style={{ ['--branch-color' as string]: BRANCH_INFO[b.branch].color }}>
              <div className="card-header">
                <h2>{b.label}</h2>
                {b.comingSoon ? <Badge tone="neutral">Próximamente</Badge> : null}
              </div>
              <div className="card-body">
                {b.referents.length ? (
                  <ul className="referent-list">
                    {b.referents.map((r) => (
                      <li key={r.assignmentId}>
                        <div className="referent-person">
                          <div>
                            <div className="name">{adultName(r)}</div>
                            <div className="referent-contact">
                              {r.email ? (
                                <a href={`mailto:${r.email}`}>
                                  <Mail size={13} /> {r.email}
                                </a>
                              ) : null}
                              {r.phone ? (
                                <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>
                                  <Phone size={13} /> {r.phone}
                                </a>
                              ) : null}
                            </div>
                            {r.warning ? <div className="referent-warning">{r.warning}</div> : null}
                          </div>
                          {d.canManage ? (
                            <ConfirmButton
                              size="sm"
                              title="Quitar referente"
                              message={
                                <p>
                                  ¿Quitar a {adultName(r)} como referente de {b.label}? Deja de recibir los avisos de esta rama.
                                </p>
                              }
                              confirmLabel="Quitar"
                              onConfirm={() => remove(r)}
                            >
                              <Trash2 />
                            </ConfirmButton>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Sin referente cargado todavía.</p>
                )}
                {d.canManage ? <AddReferent branch={b.branch} data={d} onDone={refresh} /> : null}
              </div>
            </section>
          ))}
        </div>
      )}
      {d.canManage ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Para que un referente pueda abrir las fichas y campamentos de su rama, su usuario necesita el rol «Programa / APF». Lo podés revisar en{' '}
          <Link to="/admin/usuarios">Usuarios</Link>.
        </p>
      ) : null}
    </>
  );
}

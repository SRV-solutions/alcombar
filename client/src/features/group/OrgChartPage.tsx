import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BRANCH_INFO, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Empty, ErrorBox, Loading, PageHeader, Select } from '../../components/ui';
import './orgchart.css';

// ---- Respuesta de GET /group/organigrama ----
interface OrgPerson {
  id: string;
  /** "Apellido, Nombre" */
  name: string;
  totem: string | null;
  position: string;
}
interface OrgUnit {
  id: string;
  name: string;
  code: string;
  branch: string;
  jefes: OrgPerson[];
  subjefes: OrgPerson[];
  ayudantes: (OrgPerson & { note: string | null })[];
  adults: number;
  kids: number;
  minAdults: number;
  missing: number;
  status: 'ok' | 'faltan' | 'sin_chicos';
}
interface OrgChart {
  year: number;
  context: { title: string; detail: string }[];
  jefatura: { jefe: OrgPerson[]; subjefe: OrgPerson[] };
  comite: {
    teamId: string | null;
    director: OrgPerson | null;
    areas: { id: string; name: string; leader: OrgPerson | null; members: OrgPerson[] }[];
    others: OrgPerson[];
  };
  asesores: OrgPerson[];
  ramasMenores: { supervisor: OrgPerson | null; units: OrgUnit[] };
  ramasMayores: { supervisor: OrgPerson | null; units: OrgUnit[] };
  familia: { padres: OrgPerson[]; acompanantes: OrgPerson[]; sinUnidad: (OrgPerson & { branch: string; branchLabel: string })[] };
  otros: OrgPerson[];
}

/** Nombre de la persona: link a su ficha si quien mira puede ver adultos. */
function Who({ p, suffix }: { p: OrgPerson; suffix?: string | null }) {
  const { can } = useAuth();
  return (
    <span>
      {can('adults', 'view') ? <Link to={`/adultos/${p.id}`}>{p.name}</Link> : p.name}
      {suffix ? <span className="note"> ({suffix})</span> : null}
    </span>
  );
}

function Names({ people, empty = 'a definir' }: { people: OrgPerson[]; empty?: string }) {
  return (
    <div className="org-names">
      {people.length ? people.map((p) => <Who key={`${p.id}-${p.position}`} p={p} />) : <span className="tbd">{empty}</span>}
    </div>
  );
}

const statusText = (u: OrgUnit) =>
  u.status === 'sin_chicos' ? `${u.adults} adultos · Cargar chicos` : u.status === 'ok' ? `${u.adults} adultos · OK` : `${u.adults} adultos · Faltan ${u.missing}`;

function UnitCard({ u }: { u: OrgUnit }) {
  const { can } = useAuth();
  const color = BRANCH_INFO[u.branch as Branch]?.color ?? 'var(--border)';
  return (
    <section className="org-unit-card" style={{ borderTopColor: color }}>
      <div className="head">{can('group', 'view') ? <Link to={`/grupo/unidades/${u.id}`}>{u.name}</Link> : u.name}</div>
      <div className="body">
        <div className="role">
          <div className="org-label">Jefe/a de Unidad</div>
          <Names people={u.jefes} />
        </div>
        <div className="role">
          <div className="org-label">Subjefe/a de Unidad</div>
          <Names people={u.subjefes} />
        </div>
        <div className="role">
          <div className="org-label">Ayudantes y colaboradores</div>
          <div className="org-names">
            {u.ayudantes.length ? (
              u.ayudantes.map((p) => <Who key={`${p.id}-${p.position}`} p={p} suffix={p.note} />)
            ) : (
              <span className="tbd">a definir</span>
            )}
          </div>
        </div>
      </div>
      <div
        className={`org-status ${u.status}`}
        title={
          u.status === 'sin_chicos'
            ? 'La unidad todavía no tiene protagonistas cargados'
            : `${u.kids} protagonistas · mínimo ${u.minAdults} adultos (1 cada 6, o el mínimo cargado en la unidad)`
        }
      >
        {statusText(u)}
      </div>
    </section>
  );
}

function SectionTitle({ title, supervisor }: { title: string; supervisor: OrgPerson | null }) {
  return (
    <div className="org-section-title">
      <h2>{title}</h2>
      <span className="sup">· Supervisa: {supervisor ? <Who p={supervisor} /> : <em>a definir</em>}</span>
    </div>
  );
}

const Connector = () => (
  <div className="org-connector" aria-hidden="true">
    ▼
  </div>
);

export function OrgChartPage() {
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);
  const org = useQuery({
    queryKey: ['organigrama', year],
    queryFn: () => api.get<OrgChart>(`/group/organigrama${qs({ year })}`),
  });
  const years = Array.from({ length: 7 }, (_, i) => current + 1 - i);
  const d = org.data;
  const hasProgramaArea = !!d?.comite.areas.some((a) => /programa/i.test(a.name));

  return (
    <>
      <PageHeader
        title="Organigrama"
        sub="Se arma solo con los cargos del año de cada adulto. Para cambiarlo, editá el cargo o la unidad de la persona en Adultos."
        actions={
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año" style={{ width: 'auto' }}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      />
      {org.isLoading ? (
        <Loading />
      ) : org.error ? (
        <ErrorBox error={org.error} />
      ) : !d ? (
        <Empty>Sin datos.</Empty>
      ) : (
        <div className="org">
          {/* Contexto institucional */}
          <div className="org-context">
            {d.context.map((c) => (
              <div key={c.title} className="org-context-card">
                <div className="t">{c.title}</div>
                <div className="d">{c.detail}</div>
              </div>
            ))}
          </div>
          <Connector />

          {/* Jefatura */}
          <div className="org-jefatura">
            <div className="org-box lead">
              <div className="org-label">Jefe/a de Grupo</div>
              <Names people={d.jefatura.jefe} />
            </div>
            <div className="org-box lead">
              <div className="org-label">Subjefe/a de Grupo</div>
              <Names people={d.jefatura.subjefe} />
            </div>
          </div>
          <Connector />

          {/* Comité Ejecutivo */}
          <section className="org-box org-comite">
            <div className="org-section-title" style={{ margin: 0 }}>
              <h2>Comité Ejecutivo</h2>
              <span className="sup">· Director Ejecutivo: {d.comite.director ? <Who p={d.comite.director} /> : <em>a definir</em>}</span>
            </div>
            {d.comite.areas.length ? (
              <div className="org-areas">
                {d.comite.areas.map((a) => (
                  <div key={a.id} className="org-area">
                    <div className="name">{a.name}</div>
                    <div className="who">{a.leader ? <Who p={a.leader} /> : <span className="tbd">A confirmar</span>}</div>
                    {/programa/i.test(a.name) && d.asesores.length ? (
                      <div className="who" style={{ marginTop: 6 }}>
                        <div className="org-label" style={{ marginBottom: 0 }}>
                          Asesores Personales
                        </div>
                        <Names people={d.asesores} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {d.asesores.length && !hasProgramaArea ? (
              <div className="org-others">
                <b>Asesores Personales de Formación:</b>{' '}
                {d.asesores.map((p, i) => (
                  <span key={`${p.id}-${p.position}`}>
                    {i ? ' · ' : ''}
                    <Who p={p} />
                  </span>
                ))}
              </div>
            ) : null}
            <div className="org-others">
              <b>Otros adultos del equipo de apoyo:</b>{' '}
              {d.comite.others.length
                ? d.comite.others.map((p, i) => (
                    <span key={`${p.id}-${p.position}`}>
                      {i ? ' · ' : ''}
                      <Who p={p} suffix={p.position} />
                    </span>
                  ))
                : 'nadie todavía'}
            </div>
          </section>
          <Connector />

          {/* Ramas menores */}
          <SectionTitle title="Ramas menores" supervisor={d.ramasMenores.supervisor} />
          <div className="org-units">
            {d.ramasMenores.units.map((u) => (
              <UnitCard key={u.id} u={u} />
            ))}
          </div>

          {/* Ramas mayores + Familia scout y apoyo a adultos */}
          <div className="org-mayores" style={{ marginTop: 18 }}>
            <div>
              <SectionTitle title="Ramas mayores" supervisor={d.ramasMayores.supervisor} />
              <div className="org-units">
                {d.ramasMayores.units.map((u) => (
                  <UnitCard key={u.id} u={u} />
                ))}
              </div>
            </div>
            <div>
              <div className="org-section-title">
                <h2>Familia scout y apoyo a adultos</h2>
              </div>
              <div className="org-familia">
                <div className="org-box">
                  <div className="org-label">Familia scout</div>
                  <div className="hint">Padres representantes: uno por unidad en el Consejo</div>
                  <Names people={d.familia.padres} />
                </div>
                <div className="org-box">
                  <div className="org-label">Acompañantes de adultos</div>
                  <div className="hint">Período de prueba y Planes de Desempeño</div>
                  <Names people={d.familia.acompanantes} />
                </div>
                <div className="org-box">
                  <div className="org-label">Sin unidad asignada</div>
                  {d.familia.sinUnidad.length ? (
                    <>
                      <div className="hint">Cargos que vinieron de Mi Rincón solo con la rama: elegí la unidad en la ficha del adulto.</div>
                      <div className="org-names org-pending">
                        {d.familia.sinUnidad.map((p) => (
                          <span key={`${p.id}-${p.position}`}>
                            <Who p={p} /> <span className="branch">· {p.position}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="org-names">
                      <span className="tbd">nadie: todos tienen unidad</span>
                    </div>
                  )}
                </div>
                {d.otros.length ? (
                  <div className="org-box">
                    <div className="org-label">Otros cargos de Grupo</div>
                    <div className="org-names">
                      {d.otros.map((p) => (
                        <Who key={`${p.id}-${p.position}`} p={p} suffix={p.position} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="org-legend">
            <span>Colores:</span>
            {(['castores', 'lobatos', 'scouts', 'caminantes', 'rovers'] as Branch[]).map((b) => (
              <span key={b} className="item">
                <span className="unit-dot" style={{ background: BRANCH_INFO[b].color }} />
                {BRANCH_INFO[b].label}
              </span>
            ))}
            <span>· Las Unidades Scouts figuran en ramas menores.</span>
          </div>
        </div>
      )}
    </>
  );
}

import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Gavel } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Card, Empty, ErrorBox, LinkButton, Loading, PageHeader } from '../../components/ui';
import { fmtDay, useRoverHome, type CommunityData } from './types';
import { PlanPage } from './PlanPage';
import { ProjectNewPage, ProjectPage, ProjectsPage } from './ProjectsPage';
import { AssemblyPage } from './AssemblyPage';
import './rovers.css';

/** Comunidad Rover, para su equipo de educadores: cómo viene el Plan Personal de cada rover y si ya usa la app. */
function CommunityPage() {
  const q = useQuery({ queryKey: ['rover-community'], queryFn: () => api.get<CommunityData>('/rovers/community') });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  const withAccount = d.rovers.filter((r) => r.hasAccount).length;
  return (
    <>
      <PageHeader
        title={d.unit.name}
        sub={`${d.rovers.length} rovers · ${withAccount} con acceso a la app. El Plan Personal lo escribe cada rover; acá lo leés para acompañarlo.`}
        actions={
          <>
            <LinkButton to="/rover/proyectos" variant="secondary">
              <FolderKanban /> Proyectos y mingas
            </LinkButton>
            <LinkButton to="/rover/asamblea">
              <Gavel /> Asamblea
            </LinkButton>
          </>
        }
      />
      <Card title="Plan Personal de cada rover" bodyClass="">
        {d.rovers.length ? (
          <ul className="list-plain community">
            {d.rovers.map((r) => (
              <li key={r.id}>
                <div className="who">
                  {r.hasAccount ? <Link to={`/rover/plan/${r.id}`}>{r.name}</Link> : <span>{r.name}</span>}
                  {r.youthRep ? (
                    <>
                      {' '}
                      <Badge tone="bordo">Representante juvenil</Badge>
                    </>
                  ) : null}
                  <div className="muted">
                    {!r.hasAccount ? (
                      <>
                        Sin acceso a la app · <Link to={`/protagonistas/${r.id}`}>dárselo desde su ficha</Link>
                      </>
                    ) : !r.entered ? (
                      'Tiene acceso, todavía no entró'
                    ) : !r.plan?.goals && !r.plan?.hasVision ? (
                      'Todavía no empezó su Plan'
                    ) : (
                      [r.plan?.hasVision ? 'con visión' : 'sin visión', `${r.plan?.open ?? 0} metas en curso`, `${r.plan?.achieved ?? 0} logradas`, r.plan?.updatedAt ? `últ. cambio ${fmtDay(r.plan.updatedAt)}` : null].filter(Boolean).join(' · ')
                    )}
                  </div>
                </div>
                {r.hasAccount ? r.plan?.goals ? <Badge tone="ok">Con Plan</Badge> : <Badge tone="warn">Sin metas</Badge> : <Badge>Sin cuenta</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="card-body">
            <Empty>La Comunidad no tiene rovers activos.</Empty>
          </div>
        )}
      </Card>
    </>
  );
}

/** Rutas de la Comunidad Rover. La entrada depende de quién sos: rover (tu Plan), educador (la Comunidad) o colaborador (tus proyectos). */
export function RoverRoutes() {
  const home = useRoverHome();
  if (home.isLoading) return <Loading />;
  if (home.error) return <ErrorBox error={home.error} />;
  const h = home.data!;
  const inCommunity = h.units.length > 0;
  if (!inCommunity && !h.collaborator) return <Empty>Esta sección es de la Comunidad Rover.</Empty>;
  return (
    <Routes>
      <Route index element={h.rover ? <Navigate to="/rover/plan" replace /> : h.educator ? <CommunityPage /> : <Navigate to="/rover/proyectos" replace />} />
      <Route path="plan" element={<PlanPage />} />
      <Route path="plan/:memberId" element={<PlanPage />} />
      <Route path="proyectos" element={<ProjectsPage />} />
      <Route path="proyectos/nuevo" element={<ProjectNewPage />} />
      <Route path="proyectos/:id" element={<ProjectPage />} />
      <Route path="asamblea" element={inCommunity ? <AssemblyPage /> : <Empty>La Asamblea es de la Comunidad Rover.</Empty>} />
      <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
    </Routes>
  );
}

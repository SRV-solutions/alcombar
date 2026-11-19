import { Link } from 'react-router-dom';
import { BookOpen, Compass, FolderKanban, Gavel, Network, Route as RouteIcon, Tent } from 'lucide-react';
import { PROJECT_KIND_LABELS, PROJECT_STATUS_LABELS, type ProjectKind, type ProjectStatus } from '@shared';
import { useAuth } from '../../lib/auth';
import { Badge, Card, LinkButton, PageHeader } from '../../components/ui';
import { EmailVerifyCard } from '../auth/EmailVerifyCard';
import { fmtDay, STATUS_TONE, useRoverHome } from './types';
import './rovers.css';

/** Inicio de un rover: lo suyo primero (Asamblea abierta, su Plan, sus proyectos). Los números del Grupo son para los adultos. */
export function RoverHome() {
  const { me, can } = useAuth();
  const home = useRoverHome();
  if (!me) return null;
  const first = me.user.member?.firstName ?? me.user.name.split(' ')[0];
  const needsEmail = !me.user.email || me.user.emailVerified === false || !!me.user.pendingEmail;
  const r = home.data?.rover;
  const links = [
    { to: '/grupo/sobre', icon: <BookOpen />, title: 'Sobre el Grupo', text: 'Nuestra historia, los jefes y jefas, la tribu.' },
    can('group', 'view') ? { to: '/grupo/organigrama', icon: <Network />, title: 'Organigrama', text: 'Quiénes son los educadores y los equipos del Grupo.' } : null,
    can('calendar', 'view') ? { to: '/calendario', icon: <Compass />, title: 'Calendario', text: 'Lo que viene: actividades, campamentos y salidas.' } : null,
    can('group', 'view') ? { to: '/grupo/unidades', icon: <Tent />, title: 'Unidades', text: 'Las ramas y unidades del Grupo.' } : null,
  ].filter((l): l is NonNullable<typeof l> => !!l);

  return (
    <>
      <PageHeader title={`Hola, ${first}`} sub={me.roles.map((x) => (x.unit ? `${x.name} · ${x.unit.name}` : x.name)).join(' · ') || undefined} />
      {r?.youthRep ? (
        <div className="alert alert-info">
          <strong>Sos representante juvenil de tu Comunidad en el Consejo de Grupo.</strong> Cuando la Jefatura mande el temario de un Consejo te llega el aviso en la campanita.
        </div>
      ) : null}
      {home.data?.assembly ? (
        <Link to="/rover/asamblea" className="alert alert-ok assembly-live as-link">
          <span>
            <Gavel size={16} style={{ verticalAlign: '-3px' }} /> <strong>Hay Asamblea abierta.</strong> Entrá para dar el presente, postular y votar.
          </span>
          <span className="btn btn-secondary btn-sm">Ir a la Asamblea</span>
        </Link>
      ) : null}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {r ? (
          <Card
            title="Mi Plan Personal"
            actions={
              <LinkButton to="/rover/plan" size="sm" variant="secondary">
                <RouteIcon /> Abrir
              </LinkButton>
            }
          >
            {r.goals.total || r.hasVision ? (
              <>
                <div className="plan-nums">
                  <div>
                    <strong>{r.goals.open}</strong>
                    <span className="muted">{r.goals.open === 1 ? 'meta en curso' : 'metas en curso'}</span>
                  </div>
                  <div>
                    <strong>{r.goals.achieved}</strong>
                    <span className="muted">{r.goals.achieved === 1 ? 'lograda' : 'logradas'}</span>
                  </div>
                </div>
                {r.nextGoal ? (
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Lo próximo: <strong style={{ color: 'var(--text)' }}>{r.nextGoal.title}</strong>, para el {fmtDay(r.nextGoal.dueDate)}.
                  </p>
                ) : !r.hasVision ? (
                  <p className="muted" style={{ marginBottom: 0 }}>Te falta escribir tu visión a futuro.</p>
                ) : null}
              </>
            ) : (
              <p style={{ margin: 0 }}>Tu carta de navegación: hacia dónde querés ir y qué vas a hacer para llegar. Empezá por tu visión a futuro y tu primera meta.</p>
            )}
          </Card>
        ) : null}
        {r ? (
          <Card
            title="Mis proyectos y mingas"
            actions={
              <LinkButton to="/rover/proyectos" size="sm" variant="secondary">
                <FolderKanban /> Ver todos
              </LinkButton>
            }
          >
            {r.projects.length ? (
              <ul className="list-plain">
                {r.projects.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link to={`/rover/proyectos/${p.id}`} className="proj-row">
                      <span className="proj-main">
                        <strong>{p.title}</strong>
                        <span className="muted">{PROJECT_KIND_LABELS[p.kind as ProjectKind] ?? p.kind}</span>
                      </span>
                      <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{PROJECT_STATUS_LABELS[p.status as ProjectStatus] ?? p.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0 }}>
                ¿Tenés una idea para la Comunidad? Armá una <Link to="/rover/proyectos/nuevo?tipo=minga">minga</Link> o un <Link to="/rover/proyectos/nuevo?tipo=proyecto">proyecto</Link> y postulalo en la próxima Asamblea.
              </p>
            )}
          </Card>
        ) : null}
        {needsEmail ? <EmailVerifyCard /> : null}
        <Card title="El Grupo">
          <ul className="list-plain rover-links">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="rover-link">
                  {l.icon}
                  <span>
                    <strong>{l.title}</strong>
                    <span className="muted">{l.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

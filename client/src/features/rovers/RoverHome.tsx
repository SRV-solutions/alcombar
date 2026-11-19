import { Link } from 'react-router-dom';
import { Compass, Network, Tent } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Card, PageHeader } from '../../components/ui';
import { EmailVerifyCard } from '../auth/EmailVerifyCard';

/** Inicio de un rover: lo suyo primero. Los números del Grupo son para los adultos. */
export function RoverHome() {
  const { me, can } = useAuth();
  if (!me) return null;
  const first = me.user.member?.firstName ?? me.user.name.split(' ')[0];
  const needsEmail = !me.user.email || me.user.emailVerified === false || !!me.user.pendingEmail;
  const links = [
    can('group', 'view') ? { to: '/grupo/organigrama', icon: <Network />, title: 'Organigrama', text: 'Quiénes son los educadores y los equipos del Grupo.' } : null,
    can('calendar', 'view') ? { to: '/calendario', icon: <Compass />, title: 'Calendario', text: 'Lo que viene: actividades, campamentos y salidas.' } : null,
    can('group', 'view') ? { to: '/grupo/unidades', icon: <Tent />, title: 'Unidades', text: 'Las ramas y unidades del Grupo.' } : null,
  ].filter((l): l is NonNullable<typeof l> => !!l);

  return (
    <>
      <PageHeader title={`Hola, ${first}`} sub={me.roles.map((r) => (r.unit ? `${r.name} · ${r.unit.name}` : r.name)).join(' · ') || undefined} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
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

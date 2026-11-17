import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  BookOpenCheck,
  Bug,
  Boxes,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Coins,
  Compass,
  FileText,
  Landmark,
  Library,
  Mountain,
  PartyPopper,
  Route as RouteIcon,
  CircleHelp,
  CircleUserRound,
  ClipboardList,
  FileCheck2,
  Home,
  LogOut,
  Menu,
  Network,
  ScrollText,
  Settings2,
  ShieldCheck,
  Tent,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Action, ModuleKey } from '@shared';
import { useAuth } from '../lib/auth';
import { TutorialHost } from '../tutorials/TutorialHost';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ReportProblemButton } from './ReportProblem';
import { OpenOnPhoneButton } from './OpenOnPhone';
import { PoweredBySrv } from './PoweredBy';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import './layout-extra.css';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  perm?: [ModuleKey, Action];
  anyOf?: [ModuleKey, Action][];
  end?: boolean;
  /** Solo para superadmins. */
  superadmin?: boolean;
  /** Contador al lado del nombre (ej: reportes abiertos). */
  badgeKey?: 'support';
}

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', icon: <Home />, end: true }] },
  {
    title: 'Protagonistas',
    items: [
      { to: '/protagonistas', label: 'Padrón', icon: <Users />, perm: ['members', 'view'] },
      { to: '/pases', label: 'Pases de unidad', icon: <ArrowLeftRight />, perm: ['members', 'edit'] },
      { to: '/asistencia', label: 'Asistencia', icon: <CalendarCheck />, perm: ['attendance', 'view'] },
      { to: '/documentacion', label: 'Documentación', icon: <FileCheck2 />, perm: ['member_documents', 'view'] },
    ],
  },
  {
    title: 'Programa',
    items: [
      { to: '/programa', label: 'Fichas de actividad', icon: <FileText />, perm: ['activities', 'view'], end: true },
      { to: '/programa/ciclos', label: 'Ciclos de programa', icon: <CalendarRange />, perm: ['activities', 'view'] },
      { to: '/programa/sabado', label: 'Programa del sábado', icon: <CalendarDays />, perm: ['activities', 'view'] },
      { to: '/programa/banco', label: 'Banco de fichas', icon: <Library />, perm: ['activities', 'view'] },
      { to: '/progresion', label: 'Progresión', icon: <RouteIcon />, perm: ['progression', 'view'] },
    ],
  },
  {
    title: 'Tesorería',
    items: [
      { to: '/contabilidad', label: 'Contabilidad', icon: <Landmark />, perm: ['accounting', 'view'], end: true },
      { to: '/contabilidad/cuotas', label: 'Cuotas y pagos', icon: <Coins />, perm: ['fees', 'view'] },
      { to: '/eventos', label: 'Eventos', icon: <PartyPopper />, perm: ['events', 'view'] },
      { to: '/campamentos', label: 'Campamentos y salidas', icon: <Mountain />, perm: ['camps', 'view'] },
    ],
  },
  {
    title: 'Grupo',
    items: [
      { to: '/grupo/unidades', label: 'Unidades', icon: <Tent />, perm: ['group', 'view'] },
      { to: '/adultos', label: 'Adultos', icon: <UsersRound />, perm: ['adults', 'view'] },
      { to: '/grupo/equipos', label: 'Equipos de apoyo', icon: <ClipboardList />, perm: ['group', 'view'] },
      { to: '/grupo/organigrama', label: 'Organigrama', icon: <Network />, perm: ['group', 'view'] },
      { to: '/calendario', label: 'Calendario', icon: <Compass />, perm: ['calendar', 'view'] },
      { to: '/actas', label: 'Actas y documentos', icon: <BookOpenCheck />, perm: ['documents', 'view'] },
      { to: '/inventario', label: 'Inventario', icon: <Boxes />, perm: ['inventory', 'view'] },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: <UserCog />, perm: ['users', 'view'] },
      { to: '/admin/roles', label: 'Roles y permisos', icon: <ShieldCheck />, perm: ['roles', 'view'] },
      {
        to: '/admin/catalogos',
        label: 'Catálogos',
        icon: <Settings2 />,
        anyOf: [
          ['group', 'edit'],
          ['training', 'create'],
          ['training', 'edit'],
        ],
      },
      { to: '/admin/auditoria', label: 'Auditoría', icon: <ScrollText />, perm: ['audit', 'view'] },
      { to: '/admin/reportes', label: 'Reportes', icon: <Bug />, superadmin: true, badgeKey: 'support' },
    ],
  },
  { title: 'Ayuda', items: [{ to: '/ayuda', label: 'Ayuda e índice', icon: <CircleHelp /> }] },
];

export function Layout() {
  const { me, can, logout } = useAuth();
  const supportCount = useQuery({
    queryKey: ['support-count'],
    queryFn: () => api.get<{ open: number }>('/support/reports/count'),
    enabled: !!me?.isSuperadmin,
    refetchInterval: 5 * 60_000,
  });
  const badges: Record<string, number> = { support: supportCount.data?.open ?? 0 };
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  return (
    <div className="app">
      {open ? <div className="backdrop" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <Logo className="brand-logo" />
          <div>
            <div className="brand-name">ALCOMBAR</div>
            <div className="brand-sub">Grupo Scout 155 · Gestión</div>
          </div>
        </div>
        <nav className="nav">
          {SECTIONS.map((s, i) => {
            const items = s.items.filter((it) => {
              if (it.superadmin) return !!me?.isSuperadmin;
              const perms = it.anyOf ?? (it.perm ? [it.perm] : []);
              return !perms.length || perms.some(([m, a]) => can(m, a));
            });
            if (!items.length) return null;
            return (
              <div key={i} style={{ display: 'contents' }}>
                {s.title ? <div className="nav-section">{s.title}</div> : null}
                {items.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end}>
                    {it.icon}
                    {it.label}
                    {it.badgeKey && badges[it.badgeKey] ? <span className="nav-badge">{badges[it.badgeKey]}</span> : null}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="who">{me?.user.name}</div>
          <div className="roles">{me?.roles.map((r) => (r.unit ? `${r.name} (${r.unit.code})` : r.name)).join(' · ')}</div>
          <div className="footer-actions">
            <NavLink to="/perfil" className="btn btn-ghost btn-sm">
              <CircleUserRound /> Mi perfil
            </NavLink>
            <ThemeToggle compact />
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
              <LogOut /> Salir
            </button>
          </div>
          <OpenOnPhoneButton />
          <ReportProblemButton />
          <PoweredBySrv />
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--sidebar-text)' }} onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu />
          </button>
          <Logo className="brand-logo" />
          <span className="brand-name">ALCOMBAR</span>
          <GlobalSearch compact />
        </header>
        <div className="appbar">
          <GlobalSearch />
          <Link to="/ayuda" className="btn btn-ghost btn-sm appbar-help">
            <CircleHelp /> Ayuda
          </Link>
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <TutorialHost />
    </div>
  );
}

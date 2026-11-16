import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  CalendarCheck,
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
import './layout-extra.css';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  perm?: [ModuleKey, Action];
  anyOf?: [ModuleKey, Action][];
  end?: boolean;
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
    title: 'Grupo',
    items: [
      { to: '/grupo/unidades', label: 'Unidades', icon: <Tent />, perm: ['group', 'view'] },
      { to: '/adultos', label: 'Adultos', icon: <UsersRound />, perm: ['adults', 'view'] },
      { to: '/grupo/equipos', label: 'Equipos de apoyo', icon: <ClipboardList />, perm: ['group', 'view'] },
      { to: '/grupo/organigrama', label: 'Organigrama', icon: <Network />, perm: ['group', 'view'] },
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
    ],
  },
  { title: 'Ayuda', items: [{ to: '/ayuda', label: 'Ayuda e índice', icon: <CircleHelp /> }] },
];

export function Layout() {
  const { me, can, logout } = useAuth();
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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  Backpack,
  BookOpenCheck,
  ChevronDown,
  Flag,
  Map as MapIcon,
  Signpost,
  Wallet,
  Wrench,
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
  FileSignature,
  Home,
  LogOut,
  Menu,
  Network,
  ScrollText,
  Settings2,
  ShieldCheck,
  Tent,
  Contact,
  Repeat,
  UserCog,
  UserRoundCheck,
  Users,
  UsersRound,
  FolderKanban,
  Gavel,
  BookOpen,
} from 'lucide-react';
import type { Action, ModuleKey } from '@shared';
import { useAuth } from '../lib/auth';
import { useRoverHome } from '../features/rovers/types';
import { TutorialHost } from '../tutorials/TutorialHost';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ReportProblemButton } from './ReportProblem';
import { OpenOnPhoneButton } from './OpenOnPhone';
import { PoweredBySrv } from './PoweredBy';
import { NotificationBell } from './NotificationBell';
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
  badgeKey?: 'support' | 'registry' | 'assembly';
  /** Se muestra solo si el servidor dice que esta persona lo puede ver. */
  visibleKey?: 'registry' | 'roverSelf' | 'roverEdu' | 'roverAny' | 'roverCommunity';
  /** Se esconde a quien tiene este permiso (ya lo encuentra en otra pantalla). */
  unless?: [ModuleKey, Action];
}

/** Con pocas pantallas el menú se muestra entero; con más, cada sección se pliega y queda abierta solo la que se está usando. */
const FLAT_MENU_MAX = 9;
const inSection = (it: NavItem, pathname: string) => (it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(`${it.to}/`));

const SECTIONS: { title?: string; icon?: ReactNode; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', icon: <Home />, end: true }] },
  {
    title: 'Comunidad Rover',
    icon: <Signpost />,
    items: [
      { to: '/rover/plan', label: 'Mi Plan Personal', icon: <RouteIcon />, visibleKey: 'roverSelf' },
      { to: '/rover', label: 'La Comunidad', icon: <UsersRound />, visibleKey: 'roverEdu', end: true },
      { to: '/rover/proyectos', label: 'Proyectos y mingas', icon: <FolderKanban />, visibleKey: 'roverAny' },
      { to: '/rover/asamblea', label: 'Asamblea', icon: <Gavel />, visibleKey: 'roverCommunity', badgeKey: 'assembly' },
    ],
  },
  {
    title: 'Protagonistas',
    icon: <Backpack />,
    items: [
      { to: '/protagonistas', label: 'Padrón', icon: <Users />, perm: ['members', 'view'] },
      { to: '/pases', label: 'Pases de unidad', icon: <ArrowLeftRight />, perm: ['members', 'edit'] },
      { to: '/asistencia', label: 'Asistencia', icon: <CalendarCheck />, perm: ['attendance', 'view'] },
      { to: '/documentacion', label: 'Documentación', icon: <FileCheck2 />, perm: ['member_documents', 'view'] },
      { to: '/autorizaciones', label: 'Autorizaciones', icon: <FileSignature />, perm: ['member_documents', 'view'] },
      { to: '/cruz-del-sur', label: 'Altas y bajas · Cruz del Sur', icon: <UserRoundCheck />, visibleKey: 'registry', badgeKey: 'registry' },
    ],
  },
  {
    title: 'Programa',
    icon: <MapIcon />,
    items: [
      { to: '/programa', label: 'Fichas de actividad', icon: <FileText />, perm: ['activities', 'view'], end: true },
      { to: '/programa/ciclos', label: 'Ciclos de programa', icon: <CalendarRange />, perm: ['activities', 'view'] },
      { to: '/programa/sabado', label: 'Programa del sábado', icon: <CalendarDays />, perm: ['activities', 'view'] },
      { to: '/programa/banco', label: 'Banco de fichas', icon: <Library />, perm: ['activities', 'view'] },
      { to: '/programa/referentes', label: 'Referentes de rama', icon: <Contact />, perm: ['activities', 'view'] },
      { to: '/progresion', label: 'Progresión', icon: <RouteIcon />, perm: ['progression', 'view'] },
    ],
  },
  {
    title: 'Tesorería',
    icon: <Wallet />,
    items: [
      { to: '/contabilidad', label: 'Contabilidad', icon: <Landmark />, perm: ['accounting', 'view'], end: true },
      { to: '/contabilidad/cuotas', label: 'Cuotas y pagos', icon: <Coins />, perm: ['fees', 'view'] },
      { to: '/eventos', label: 'Eventos', icon: <PartyPopper />, perm: ['events', 'view'] },
      { to: '/campamentos', label: 'Campamentos y salidas', icon: <Mountain />, perm: ['camps', 'view'] },
    ],
  },
  {
    title: 'Grupo',
    icon: <Flag />,
    items: [
      { to: '/grupo/sobre', label: 'Sobre el Grupo', icon: <BookOpen /> },
      { to: '/grupo/unidades', label: 'Unidades', icon: <Tent />, perm: ['group', 'view'] },
      { to: '/adultos', label: 'Adultos', icon: <UsersRound />, perm: ['adults', 'view'] },
      { to: '/asistencia-educadores', label: 'Asistencia de educadores', icon: <CalendarCheck />, perm: ['adult_attendance', 'view'] },
      { to: '/grupo/equipos', label: 'Equipos de apoyo', icon: <ClipboardList />, perm: ['group', 'view'] },
      { to: '/grupo/organigrama', label: 'Organigrama', icon: <Network />, perm: ['group', 'view'] },
      { to: '/calendario', label: 'Calendario', icon: <Compass />, perm: ['calendar', 'view'], end: true },
      { to: '/calendario/sabados', label: 'Sábados y servicio', icon: <Repeat />, perm: ['calendar', 'view'] },
      { to: '/actas', label: 'Actas y documentos', icon: <BookOpenCheck />, perm: ['documents', 'view'] },
      { to: '/inventario', label: 'Inventario', icon: <Boxes />, perm: ['inventory', 'view'] },
    ],
  },
  {
    title: 'Administración',
    icon: <Wrench />,
    items: [
      // Los accesos se manejan desde Adultos; esta pantalla queda para quien administra usuarios sin ver adultos
      { to: '/admin/usuarios', label: 'Usuarios', icon: <UserCog />, perm: ['users', 'view'], unless: ['adults', 'view'] },
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
  const registry = useQuery({
    queryKey: ['registry-summary'],
    queryFn: () => api.get<{ canSee: boolean; pending: number }>('/registry/summary'),
    enabled: !!me,
    refetchInterval: 5 * 60_000,
  });
  // Comunidad Rover: qué le toca a esta cuenta (rover, educador de la Comunidad o colaborador de un proyecto)
  const rover = useRoverHome().data;
  const inCommunity = !!rover?.units.length;
  const badges: Record<string, number> = { support: supportCount.data?.open ?? 0, registry: registry.data?.pending ?? 0, assembly: rover?.assembly ? 1 : 0 };
  const visible: Record<string, boolean> = {
    registry: !!registry.data?.canSee,
    roverSelf: !!rover?.rover,
    roverEdu: inCommunity && !rover?.rover && !!rover?.educator,
    roverAny: inCommunity || !!rover?.collaborator,
    roverCommunity: inCommunity,
  };
  const [open, setOpen] = useState(false);
  const location = useLocation();
  // Uso de la app: se anota qué pantalla abrió (sin datos de lo que hace adentro). Si falla, no molesta.
  useEffect(() => {
    void api.post('/audit/view', { path: location.pathname }).catch(() => undefined);
  }, [location.pathname]);
  // Qué ve esta cuenta en el menú, sección por sección
  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((it) => {
      if (it.superadmin) return !!me?.isSuperadmin;
      if (it.unless && can(it.unless[0], it.unless[1])) return false;
      if (it.visibleKey) return visible[it.visibleKey];
      const perms = it.anyOf ?? (it.perm ? [it.perm] : []);
      return !perms.length || perms.some(([m, a]) => can(m, a));
    }),
  })).filter((s) => s.items.length);
  const collapsible = sections.reduce((n, s) => n + s.items.length, 0) > FLAT_MENU_MAX;
  // La sección de la pantalla actual: la del ítem que mejor coincide con la dirección
  const current =
    sections
      .flatMap((s) => s.items.filter((it) => inSection(it, location.pathname)).map((it) => ({ title: s.title, len: it.to.length })))
      .sort((a, b) => b.len - a.len)[0]?.title ?? null;
  const [group, setGroup] = useState<string | null>(current);
  const navRef = useRef<HTMLElement>(null);
  const toggleGroup = (title: string) => {
    const opening = group !== title;
    setGroup(opening ? title : null);
    // Al desplegar una sección de abajo, que sus ítems queden a la vista
    if (opening) setTimeout(() => navRef.current?.querySelector(`[data-group="${title}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 240);
  };
  // Los tutoriales señalan ítems del menú: si están en una sección plegada, la abren
  useEffect(() => {
    const onOpen = (e: Event) => setGroup((e as CustomEvent<string>).detail);
    window.addEventListener('alc:nav-open', onOpen);
    return () => window.removeEventListener('alc:nav-open', onOpen);
  }, []);
  // Los permisos del menú llegan de a poco: cuando recién se sabe cuál es la sección actual, se abre
  const [lastCurrent, setLastCurrent] = useState(current);
  if (lastCurrent !== current) {
    setLastCurrent(current);
    if (current) setGroup(current);
  }
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
    // Al cambiar de pantalla queda abierta su sección (y solo esa)
    if (current) setGroup(current);
  }
  const navLink = (it: NavItem) => (
    <NavLink key={it.to} to={it.to} end={it.end}>
      {it.icon}
      {it.label}
      {it.badgeKey && badges[it.badgeKey] ? <span className="nav-badge">{badges[it.badgeKey]}</span> : null}
    </NavLink>
  );

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
        <nav className="nav" ref={navRef} aria-label="Menú principal">
          {sections.map((s, i) => {
            // Una sección de un solo ítem no se pliega: es un enlace más
            if (!s.title || s.items.length === 1 || !collapsible) {
              return (
                <div key={i} style={{ display: 'contents' }}>
                  {s.title && !collapsible ? <div className="nav-section">{s.title}</div> : null}
                  {s.items.map(navLink)}
                </div>
              );
            }
            const isOpen = group === s.title;
            const pending = s.items.reduce((n, it) => n + (it.badgeKey ? (badges[it.badgeKey] ?? 0) : 0), 0);
            return (
              <div key={i} className={`nav-group ${isOpen ? 'open' : ''} ${current === s.title ? 'current' : ''}`} data-group={s.title}>
                <button type="button" className="nav-group-head" aria-expanded={isOpen} aria-controls={`nav-group-${i}`} onClick={() => toggleGroup(s.title!)}>
                  {s.icon}
                  <span className="nav-group-title">{s.title}</span>
                  {!isOpen && pending ? <span className="nav-badge">{pending}</span> : null}
                  <ChevronDown className="nav-chevron" aria-hidden />
                </button>
                <div className="nav-group-items" id={`nav-group-${i}`}>
                  <div>{s.items.map(navLink)}</div>
                </div>
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
          <NotificationBell compact />
        </header>
        <div className="appbar">
          <GlobalSearch />
          <Link to="/ayuda" className="btn btn-ghost btn-sm appbar-help">
            <CircleHelp /> Ayuda
          </Link>
          <NotificationBell />
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <TutorialHost />
    </div>
  );
}

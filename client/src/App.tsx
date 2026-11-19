import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Action, ModuleKey } from '@shared';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Empty, Loading } from './components/ui';
import { LoginPage } from './features/auth/LoginPage';
import { SetPasswordPage } from './features/auth/SetPasswordPage';
import { QrLoginPage } from './features/auth/QrLoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ProfilePage } from './features/auth/ProfilePage';
import { ChoosePasswordPage } from './features/auth/ChoosePasswordPage';
import { HelpPage } from './features/help/HelpPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { MembersPage } from './features/members/MembersPage';
import { MemberDetailPage } from './features/members/MemberDetailPage';
import { MemberFormPage } from './features/members/MemberFormPage';
import { MemberImportPage } from './features/members/MemberImportPage';
import { TransfersPage } from './features/members/TransfersPage';
import { ProgramRoutes } from './features/program/ProgramRoutes';
import { ProgressionRoutes } from './features/progression/ProgressionRoutes';
import { AccountingRoutes } from './features/accounting/AccountingRoutes';
import { EventsRoutes } from './features/events/EventsRoutes';
import { CampsRoutes } from './features/camps/CampsRoutes';
import { InventoryRoutes } from './features/inventory/InventoryRoutes';
import { CalendarRoutes } from './features/calendar/CalendarRoutes';
import { LibraryRoutes } from './features/library/LibraryRoutes';
import { AttendancePage } from './features/attendance/AttendancePage';
import { AdultAttendancePage } from './features/attendance/AdultAttendancePage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { AuthorizationsPage } from './features/authorizations/AuthorizationsPage';
import { AuthorizationDocPage } from './features/authorizations/AuthorizationDocPage';
import { SignPage } from './features/authorizations/SignPage';
import { RegistryPage } from './features/members/RegistryPage';
import { RoverRoutes } from './features/rovers/CommunityPage';
import { UnitsPage } from './features/group/UnitsPage';
import { UnitDetailPage } from './features/group/UnitDetailPage';
import { SupportTeamsPage } from './features/group/SupportTeamsPage';
import { OrgChartPage } from './features/group/OrgChartPage';
import { AdultsPage } from './features/adults/AdultsPage';
import { AdultDetailPage } from './features/adults/AdultDetailPage';
import { AdultFormPage } from './features/adults/AdultFormPage';
import { UsersPage } from './features/admin/UsersPage';
import { RolesPage } from './features/admin/RolesPage';
import { AuditPage } from './features/admin/AuditPage';
import { CatalogsPage } from './features/admin/CatalogsPage';
import { SupportReportsPage } from './features/admin/SupportReportsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  // Entró con una contraseña provisoria: antes de usar la app elige la suya
  if (me.user.mustChangePassword) return <ChoosePasswordPage />;
  return <>{children}</>;
}

function Guard({ perm, anyOf, children }: { perm?: [ModuleKey, Action]; anyOf?: [ModuleKey, Action][]; children: ReactNode }) {
  const { can } = useAuth();
  const perms = anyOf ?? (perm ? [perm] : []);
  if (!perms.some(([m, a]) => can(m, a))) return <Empty>No tenés permiso para ver esta sección.</Empty>;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/definir-clave" element={<SetPasswordPage />} />
      <Route path="/qr" element={<QrLoginPage />} />
      <Route path="/olvide-clave" element={<ForgotPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="mi-cuenta" element={<Navigate to="/perfil" replace />} />
        <Route path="ayuda" element={<HelpPage />} />

        <Route path="protagonistas" element={<Guard perm={['members', 'view']}><MembersPage /></Guard>} />
        <Route path="protagonistas/nuevo" element={<Guard perm={['members', 'create']}><MemberFormPage /></Guard>} />
        <Route path="protagonistas/importar" element={<Guard perm={['members', 'create']}><MemberImportPage /></Guard>} />
        <Route path="protagonistas/:id" element={<Guard perm={['members', 'view']}><MemberDetailPage /></Guard>} />
        <Route path="protagonistas/:id/editar" element={<Guard perm={['members', 'edit']}><MemberFormPage /></Guard>} />
        <Route path="pases" element={<Guard perm={['members', 'edit']}><TransfersPage /></Guard>} />
        <Route path="asistencia" element={<Guard perm={['attendance', 'view']}><AttendancePage /></Guard>} />
        <Route path="asistencia-educadores" element={<Guard perm={['adult_attendance', 'view']}><AdultAttendancePage /></Guard>} />
        <Route path="documentacion" element={<Guard perm={['member_documents', 'view']}><DocumentsPage /></Guard>} />
        <Route path="autorizaciones" element={<Guard perm={['member_documents', 'view']}><AuthorizationsPage /></Guard>} />
        <Route path="autorizaciones/firmar" element={<Guard perm={['member_documents', 'edit']}><SignPage /></Guard>} />
        <Route path="autorizaciones/:id" element={<Guard perm={['member_documents', 'view']}><AuthorizationDocPage /></Guard>} />
        <Route path="cruz-del-sur" element={<RegistryPage />} />

        {/* Etapas 3 a 8: cada módulo maneja sus rutas internas */}
        <Route path="programa/*" element={<Guard perm={['activities', 'view']}><ProgramRoutes /></Guard>} />
        <Route path="progresion/*" element={<Guard perm={['progression', 'view']}><ProgressionRoutes /></Guard>} />
        <Route path="contabilidad/*" element={<Guard anyOf={[['accounting', 'view'], ['fees', 'view']]}><AccountingRoutes /></Guard>} />
        <Route path="eventos/*" element={<Guard perm={['events', 'view']}><EventsRoutes /></Guard>} />
        <Route path="campamentos/*" element={<Guard perm={['camps', 'view']}><CampsRoutes /></Guard>} />
        <Route path="inventario/*" element={<Guard perm={['inventory', 'view']}><InventoryRoutes /></Guard>} />
        <Route path="calendario/*" element={<Guard perm={['calendar', 'view']}><CalendarRoutes /></Guard>} />
        <Route path="actas/*" element={<Guard perm={['documents', 'view']}><LibraryRoutes /></Guard>} />

        {/* Comunidad Rover: el propio módulo decide qué ve cada uno (rover, educador o colaborador) */}
        <Route path="rover/*" element={<RoverRoutes />} />

        <Route path="grupo/unidades" element={<Guard perm={['group', 'view']}><UnitsPage /></Guard>} />
        <Route path="grupo/unidades/:id" element={<Guard perm={['group', 'view']}><UnitDetailPage /></Guard>} />
        <Route path="grupo/equipos" element={<Guard perm={['group', 'view']}><SupportTeamsPage /></Guard>} />
        <Route path="grupo/organigrama" element={<Guard perm={['group', 'view']}><OrgChartPage /></Guard>} />

        <Route path="adultos" element={<Guard perm={['adults', 'view']}><AdultsPage /></Guard>} />
        <Route path="adultos/nuevo" element={<Guard perm={['adults', 'create']}><AdultFormPage /></Guard>} />
        <Route path="adultos/:id" element={<Guard perm={['adults', 'view']}><AdultDetailPage /></Guard>} />
        <Route path="adultos/:id/editar" element={<Guard perm={['adults', 'edit']}><AdultFormPage /></Guard>} />

        <Route path="admin/usuarios" element={<Guard perm={['users', 'view']}><UsersPage /></Guard>} />
        <Route path="admin/roles" element={<Guard perm={['roles', 'view']}><RolesPage /></Guard>} />
        <Route path="admin/auditoria" element={<Guard perm={['audit', 'view']}><AuditPage /></Guard>} />
        <Route path="admin/catalogos" element={<Guard anyOf={[['group', 'edit'], ['training', 'create'], ['training', 'edit']]}><CatalogsPage /></Guard>} />

        <Route path="admin/reportes" element={<SupportReportsPage />} />
        <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
      </Route>
    </Routes>
  );
}

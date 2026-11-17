import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Empty, PageHeader } from '../../components/ui';
import { AccountingHome } from './AccountingHome';
import { FeesPage } from './FeesPage';
import { ReceiptPage } from './ReceiptPage';
import './accounting.css';

function NoAccess() {
  return (
    <>
      <PageHeader title="Sin acceso" />
      <Empty>No tenés permiso para ver esta sección.</Empty>
    </>
  );
}

/** Contabilidad: rutas internas del módulo (se monta en App.tsx en /contabilidad/*). */
export function AccountingRoutes() {
  const { can } = useAuth();
  const accounting = can('accounting', 'view');
  const fees = can('fees', 'view');
  return (
    <Routes>
      <Route index element={accounting ? <AccountingHome /> : <Navigate to="cuotas" replace />} />
      <Route path="cuotas" element={fees ? <FeesPage /> : <NoAccess />} />
      <Route path="recibos/:id" element={fees ? <ReceiptPage /> : <NoAccess />} />
      <Route path="*" element={<Navigate to="/contabilidad" replace />} />
    </Routes>
  );
}

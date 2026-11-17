import { Route, Routes } from 'react-router-dom';
import { Empty } from '../../components/ui';
import { ItemDetailPage } from './ItemDetailPage';
import { ItemsPage } from './ItemsPage';
import { LoanDetailPage } from './LoanDetailPage';
import { LoansPage } from './LoansPage';

/** Inventario: rutas internas del módulo (se monta en App.tsx en /inventario/*). */
export function InventoryRoutes() {
  return (
    <Routes>
      <Route index element={<ItemsPage />} />
      <Route path="bienes/:id" element={<ItemDetailPage />} />
      <Route path="prestamos" element={<LoansPage />} />
      <Route path="prestamos/:id" element={<LoanDetailPage />} />
      <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
    </Routes>
  );
}

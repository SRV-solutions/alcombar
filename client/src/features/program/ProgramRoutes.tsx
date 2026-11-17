import { Route, Routes } from 'react-router-dom';
import { Empty, LinkButton } from '../../components/ui';
import { BankPage } from './BankPage';
import { CycleDetailPage, CyclesPage } from './CyclesPage';
import { MeetingPage } from './MeetingPage';
import { SheetDetailPage } from './SheetDetailPage';
import { SheetFormPage } from './SheetFormPage';
import { SheetPrintPage } from './SheetPrintPage';
import { SheetsPage } from './SheetsPage';

/** Programa: rutas internas del módulo (se monta en App.tsx como programa/*). */
export function ProgramRoutes() {
  return (
    <Routes>
      <Route index element={<SheetsPage />} />
      <Route path="fichas/nueva" element={<SheetFormPage />} />
      <Route path="fichas/:id" element={<SheetDetailPage />} />
      <Route path="fichas/:id/editar" element={<SheetFormPage />} />
      <Route path="fichas/:id/imprimir" element={<SheetPrintPage />} />
      <Route path="banco" element={<BankPage />} />
      <Route path="ciclos" element={<CyclesPage />} />
      <Route path="ciclos/:id" element={<CycleDetailPage />} />
      <Route path="sabado" element={<MeetingPage />} />
      <Route
        path="*"
        element={
          <Empty>
            Esa página de Programa no existe. <LinkButton to="/programa">Ir a las fichas</LinkButton>
          </Empty>
        }
      />
    </Routes>
  );
}

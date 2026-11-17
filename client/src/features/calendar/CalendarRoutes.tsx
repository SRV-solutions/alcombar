import { Route, Routes } from 'react-router-dom';
import { Empty } from '../../components/ui';
import { CalendarPage } from './CalendarPage';
import { SaturdaysPage } from './SaturdaysPage';

/** Calendario: rutas internas del módulo (se monta en App.tsx en /calendario/*). */
export function CalendarRoutes() {
  return (
    <Routes>
      <Route index element={<CalendarPage />} />
      <Route path="sabados" element={<SaturdaysPage />} />
      <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
    </Routes>
  );
}

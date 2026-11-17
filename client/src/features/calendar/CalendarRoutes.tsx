import { Route, Routes } from 'react-router-dom';
import { Empty } from '../../components/ui';
import { CalendarPage } from './CalendarPage';

/** Calendario: rutas internas del módulo (se monta en App.tsx en /calendario/*). */
export function CalendarRoutes() {
  return (
    <Routes>
      <Route index element={<CalendarPage />} />
      <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
    </Routes>
  );
}

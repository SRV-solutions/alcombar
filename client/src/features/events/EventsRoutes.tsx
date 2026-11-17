import { Navigate, Route, Routes } from 'react-router-dom';
import { EventsPage } from './EventsPage';
import { EventDetailPage } from './EventDetailPage';

/** Eventos: rutas internas del módulo (se monta en App.tsx en /eventos/*). */
export function EventsRoutes() {
  return (
    <Routes>
      <Route index element={<EventsPage />} />
      <Route path=":id" element={<EventDetailPage />} />
      <Route path="*" element={<Navigate to="/eventos" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { CampsPage } from './CampsPage';
import { CampDetailPage } from './CampDetailPage';
import { CampSitesPage } from './CampSitesPage';

/** Campamentos y salidas: rutas internas del módulo (se monta en App.tsx en /campamentos/*). */
export function CampsRoutes() {
  return (
    <Routes>
      <Route index element={<CampsPage />} />
      <Route path="lugares" element={<CampSitesPage />} />
      <Route path=":id" element={<CampDetailPage />} />
      <Route path="*" element={<Navigate to="/campamentos" replace />} />
    </Routes>
  );
}

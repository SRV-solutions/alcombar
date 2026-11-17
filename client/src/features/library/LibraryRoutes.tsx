import { Route, Routes } from 'react-router-dom';
import { Empty } from '../../components/ui';
import { LibraryPage } from './LibraryPage';
import { MinuteDetailPage } from './MinuteDetailPage';

/** Actas y documentos: rutas internas del módulo (se monta en App.tsx en /actas/*). */
export function LibraryRoutes() {
  return (
    <Routes>
      <Route index element={<LibraryPage />} />
      <Route path=":id" element={<MinuteDetailPage />} />
      <Route path="*" element={<Empty>Página no encontrada.</Empty>} />
    </Routes>
  );
}

import { Route, Routes } from 'react-router-dom';
import { BoardPage } from './BoardPage';
import { MemberProgressPage } from './MemberProgressPage';
import { SchemesPage } from './SchemesPage';

/** Progresión: rutas internas del módulo (se monta en App.tsx como progresion/*). */
export function ProgressionRoutes() {
  return (
    <Routes>
      <Route index element={<BoardPage />} />
      <Route path="esquemas" element={<SchemesPage />} />
      <Route path=":memberId" element={<MemberProgressPage />} />
    </Routes>
  );
}

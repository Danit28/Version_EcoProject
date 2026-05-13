import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { MateriasPrimasPage } from './pages/MateriasPrimasPage.jsx';
import { ProductosPage } from './pages/ProductosPage.jsx';
import { SedesPage } from './pages/SedesPage.jsx';
import { InventarioPage } from './pages/InventarioPage.jsx';
import { ProduccionPage } from './pages/ProduccionPage.jsx';
import { DistribucionPage } from './pages/DistribucionPage.jsx';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/materias-primas" element={<MateriasPrimasPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/sedes" element={<SedesPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/distribucion" element={<DistribucionPage />} />
        <Route path="/produccion" element={<ProduccionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import InventoryPage from './pages/InventoryPage';
import CatalogoCotizacionesPage from './pages/CatalogoCotizacionesPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import CalendarPage from './pages/CalendarPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-gray-900">
        <Navbar />
        <main className="p-6 md:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/cotizaciones" element={<CatalogoCotizacionesPage />} />
            <Route path="/colaboradores" element={<ColaboradoresPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import InventoryPage from './pages/InventoryPage';
import CotizacionesPage from './pages/CotizacionesPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import CalendarPage from './pages/CalendarPage';
import AuthPage from './pages/AuthPage';
import RutaPrivada from './components/RutaPrivada';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context.js';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider><Contenido /></AuthProvider>
    </BrowserRouter>
  );
}

function Contenido() {
  const { cargando, error, reintentar } = useAuth();
  if (cargando) return <p role="status" className="p-8 text-center text-slate-600">Comprobando sesión…</p>;
  if (error) return <div className="mx-auto max-w-md space-y-4 p-8 text-center">
    <p role="alert">{error}</p>
    <button onClick={reintentar} className="rounded-xl bg-indigo-600 px-4 py-2 text-white">Reintentar conexión</button>
  </div>;
  return (
      <div className="min-h-screen bg-slate-50 text-gray-900">
        <Navbar />
        <main className="p-6 md:p-8">
          <Routes>
            <Route path="/login" element={<AuthPage key="login" />} />
            <Route path="/registro" element={<AuthPage key="registro" registro />} />
            <Route element={<RutaPrivada />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/inventario" element={<InventoryPage />} />
              <Route path="/cotizaciones" element={<CotizacionesPage />} />
              <Route path="/colaboradores" element={<ColaboradoresPage />} />
              <Route path="/calendario" element={<CalendarPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
  );
}

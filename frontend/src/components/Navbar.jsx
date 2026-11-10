import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';

export default function Navbar() {
  const location = useLocation();
  const { usuario, salir } = useAuth();
  const esGestor = ['Administrador', 'Gestor_Eventos'].includes(usuario?.rol);
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState('');

  async function cerrar() {
    setSaliendo(true);
    setError('');
    try { await salir(); }
    catch (err) { setError(err.message); }
    finally { setSaliendo(false); }
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
        
        <Link
          to="/"
          className="text-xl font-black text-indigo-600 tracking-wider"
        >
          NES <span className="text-gray-800">EVENTOS</span>
        </Link>

        {usuario ? <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Inicio
          </Link>
          
          {esGestor && <Link
            to="/calendario"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/calendario')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Calendario
          </Link>}

          <Link
            to="/inventario"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/inventario')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Inventario
          </Link>

          {esGestor && <Link
            to="/cotizaciones"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/cotizaciones')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Cotizaciones
          </Link>}

          <Link
            to="/colaboradores"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/colaboradores')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Colaboradores
          </Link>

          <span className="px-2 text-sm text-slate-600">{usuario.nombre} · {usuario.rol.replaceAll('_', ' ')}</span>
          <button onClick={cerrar} disabled={saliendo} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
          {error && <p role="alert" className="w-full text-right text-sm text-red-700">{error}</p>}
        </div> : <Link to="/login" className="text-sm font-bold text-indigo-600">Iniciar sesión</Link>}
      </div>
    </nav>
  );
}

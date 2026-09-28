import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

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

        <div className="flex flex-wrap gap-4">
          <Link
            to="/calendario"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/calendario')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Calendario
          </Link>
          
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

          <Link
            to="/cotizaciones"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isActive('/cotizaciones')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Catálogo y cotizaciones
          </Link>

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

        </div>
      </div>
    </nav>
  );
}

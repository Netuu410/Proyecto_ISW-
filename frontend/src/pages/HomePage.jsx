import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-8">
      {/* Banner de Bienvenida */}
      <div className="bg-indigo-600 text-white rounded-3xl p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 max-w-xl">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Sistema de Gestión NES Eventos
          </h1>
          <p className="text-indigo-100 text-base md:text-lg">
            Control de equipos, insumos y logística para la producción de eventos.
          </p>
          <div className="pt-2">
            <Link 
              to="/inventario" 
              className="inline-block px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-md hover:bg-indigo-50 transition-all"
            >
              Explorar Inventario &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-3xl">📦</span>
          <h3 className="text-lg font-bold text-gray-800">Inventario Total</h3>
          <p className="text-sm text-gray-500">Visualiza y gestiona todos los insumos disponibles.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-3xl">📅</span>
          <h3 className="text-lg font-bold text-gray-800">Eventos Activos</h3>
          <p className="text-sm text-gray-500">Revisa la asignación de equipos por evento.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-3xl">🔧</span>
          <h3 className="text-lg font-bold text-gray-800">Mantenimiento</h3>
          <p className="text-sm text-gray-500">Equipos en revisión técnica o reparación.</p>
        </div>
      </div>
    </div>
  );
}
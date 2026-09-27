import React from 'react';

export default function ColaboradoresPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">
      <header className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Directorio de Colaboradores
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          Gestión del personal eventual y proveedores de la productora.
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-500">
          Aquí se mostrarán los fotógrafos, animadores y proveedores de banquetería.
        </p>
      </div>
    </div>
  );
}
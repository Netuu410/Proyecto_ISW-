import { obtenerColaboradores } from '../api/colaboradores.js';
import React, { useEffect, useState } from 'react';

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    obtenerColaboradores({ signal: controller.signal })
      .then(datos => { if (!controller.signal.aborted) setColaboradores(datos); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

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

      {cargando && (
        <div className="text-center py-12 text-gray-500">
          Cargando colaboradores...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          {error}
        </div>
      )}

      {!cargando && !error && colaboradores.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-500">
            No hay colaboradores registrados.
          </p>
        </div>
      )}

      {!cargando && !error && colaboradores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colaboradores.map((colaborador) => (
            <div
              key={colaborador.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
            >
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {colaborador.tipo}
                </span>

                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {colaborador.nombre}
                </h2>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-yellow-500 text-xl">
                  {'★'.repeat(
                    Math.round(colaborador.promedioEstrellas)
                  )}
                  {'☆'.repeat(
                    5 - Math.round(colaborador.promedioEstrellas)
                  )}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Promedio:{' '}
                  <span className="font-bold text-gray-800">
                    {colaborador.promedioEstrellas.toFixed(1)}
                  </span>
                </p>

                <p className="text-sm text-gray-500">
                  {colaborador.totalEvaluaciones} evaluaciones
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

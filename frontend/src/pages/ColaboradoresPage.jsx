
import React, { useEffect, useState } from 'react';
import {
  obtenerColaboradores,
  crearColaborador
} from '../api/colaboradores.js';

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevoColaborador, setNuevoColaborador] = useState({
    nombre: '',
    tipo: ''
  });

  // Cargar colaboradores al abrir la página
  useEffect(() => {
    const controller = new AbortController();

    obtenerColaboradores({ signal: controller.signal })
      .then((datos) => {
        if (!controller.signal.aborted) {
          setColaboradores(datos);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Guardar nuevo colaborador
  const guardarColaborador = async (e) => {
    e.preventDefault();

    if (guardando) return;

    if (!nuevoColaborador.nombre.trim() || !nuevoColaborador.tipo) {
      setError('Debes completar todos los campos');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      await crearColaborador({
        nombre: nuevoColaborador.nombre.trim(),
        tipo: nuevoColaborador.tipo
      });

      // Actualizar la lista desde PostgreSQL
      const datos = await obtenerColaboradores();
      setColaboradores(datos);

      // Limpiar formulario
      setNuevoColaborador({
        nombre: '',
        tipo: ''
      });

      setMostrarFormulario(false);
      setMensaje('Colaborador registrado correctamente');

    } catch (error) {
      console.error('Error al guardar colaborador:', error);
      setError(error.message || 'No se pudo guardar el colaborador');

    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">

      {/* ENCABEZADO */}
      <header className="border-b border-gray-200 pb-5 flex flex-wrap justify-between items-center gap-4">

        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Directorio de Colaboradores
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Gestión del personal eventual y proveedores de la productora.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            setError('');
            setMensaje('');
          }}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700"
        >
          + Agregar colaborador
        </button>
      </header>

      {/* MENSAJES */}
      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">

          <h2 className="text-xl font-bold mb-4">
            Nuevo colaborador
          </h2>

          <form onSubmit={guardarColaborador} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold mb-2">
                Nombre del colaborador
              </label>

              <input
                type="text"
                required
                maxLength={100}
                value={nuevoColaborador.nombre}
                onChange={(e) =>
                  setNuevoColaborador({
                    ...nuevoColaborador,
                    nombre: e.target.value
                  })
                }
                className="w-full border rounded-xl p-3"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Tipo de colaborador
              </label>

              <select
                required
                value={nuevoColaborador.tipo}
                onChange={(e) =>
                  setNuevoColaborador({
                    ...nuevoColaborador,
                    tipo: e.target.value
                  })
                }
                className="w-full border rounded-xl p-3"
              >
                <option value="">Seleccionar tipo</option>
                <option value="FOTOGRAFO">Fotógrafo</option>
                <option value="ANIMADOR">Animador</option>
                <option value="GARZON">Garzón</option>
                <option value="CAMARERO">Camarero</option>
                <option value="BANQUETERIA">Proveedor de banquetería</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar colaborador'}
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => setMostrarFormulario(false)}
                className="bg-gray-100 px-6 py-3 rounded-xl hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CARGANDO */}
      {cargando && (
        <div className="text-center py-12 text-gray-500">
          Cargando colaboradores...
        </div>
      )}

      {/* SIN COLABORADORES */}
      {!cargando && !error && colaboradores.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-500">
            No hay colaboradores registrados.
          </p>
        </div>
      )}

      {/* DIRECTORIO */}
      {!cargando && colaboradores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {colaboradores.map((colaborador) => {
            const promedio = Number(colaborador.promedioEstrellas ?? 0);
            const estrellas = Math.max(0, Math.min(5, Math.round(promedio)));

            return (
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
                    {'★'.repeat(estrellas)}
                    {'☆'.repeat(5 - estrellas)}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Promedio:{' '}
                    <span className="font-bold text-gray-800">
                      {promedio.toFixed(1)}
                    </span>
                  </p>

                  <p className="text-sm text-gray-500">
                    {colaborador.totalEvaluaciones ?? 0} evaluaciones
                  </p>

                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

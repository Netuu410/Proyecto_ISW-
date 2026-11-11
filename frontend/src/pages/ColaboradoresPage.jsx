
import React, { useEffect, useState } from 'react';

import {
  obtenerColaboradores,
  crearColaborador
} from '../api/colaboradores.js';

import {
  crearEvaluacion,
  obtenerHistorial,
  obtenerEventosFinalizados
} from '../api/evaluaciones.js';

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

  // Estados de evaluaciones
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [guardandoEvaluacion, setGuardandoEvaluacion] = useState(false);
  const [errorFicha, setErrorFicha] = useState('');
  const [mensajeFicha, setMensajeFicha] = useState('');

  const [nuevaEvaluacion, setNuevaEvaluacion] = useState({
    eventoId: '',
    estrellas: 0,
    notaInterna: ''
  });

  // Cargar colaboradores
  useEffect(() => {
    const controller = new AbortController();

    obtenerColaboradores({ signal: controller.signal })
      .then(datos => {
        if (!controller.signal.aborted) {
          setColaboradores(datos);
        }
      })
      .catch(error => {
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

  // Actualizar directorio
  const actualizarColaboradores = async () => {
    const datos = await obtenerColaboradores();
    setColaboradores(datos);
    return datos;
  };

  // Crear colaborador
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

      await actualizarColaboradores();

      setNuevoColaborador({ nombre: '', tipo: '' });
      setMostrarFormulario(false);
      setMensaje('Colaborador registrado correctamente');

    } catch (error) {
      setError(error.message || 'No se pudo registrar el colaborador');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir ficha de colaborador
  const abrirFicha = async (colaborador) => {
    setColaboradorSeleccionado(colaborador);
    setHistorial([]);
    setEventos([]);
    setCargandoFicha(true);
    setErrorFicha('');
    setMensajeFicha('');

    setNuevaEvaluacion({
      eventoId: '',
      estrellas: 0,
      notaInterna: ''
    });

    try {
      const [datosHistorial, datosEventos] = await Promise.all([
        obtenerHistorial(colaborador.id),
        obtenerEventosFinalizados()
      ]);

      setHistorial(datosHistorial);
      setEventos(datosEventos);

    } catch (error) {
      setErrorFicha(error.message || 'No se pudo cargar la ficha');
    } finally {
      setCargandoFicha(false);
    }
  };

  // Guardar evaluación
  const guardarEvaluacion = async (e) => {
    e.preventDefault();

    if (guardandoEvaluacion || !colaboradorSeleccionado) return;

    if (!nuevaEvaluacion.eventoId) {
      setErrorFicha('Debes seleccionar un evento finalizado');
      return;
    }

    if (nuevaEvaluacion.estrellas < 1 || nuevaEvaluacion.estrellas > 5) {
      setErrorFicha('Selecciona una calificación de 1 a 5 estrellas');
      return;
    }

    if (!nuevaEvaluacion.notaInterna.trim()) {
      setErrorFicha('Debes escribir una nota interna');
      return;
    }

    setGuardandoEvaluacion(true);
    setErrorFicha('');
    setMensajeFicha('');

    try {
      await crearEvaluacion({
        eventoId: Number(nuevaEvaluacion.eventoId),
        colaboradorId: colaboradorSeleccionado.id,
        estrellas: nuevaEvaluacion.estrellas,
        notaInterna: nuevaEvaluacion.notaInterna.trim()
      });

      const [datosHistorial, datosColaboradores] = await Promise.all([
        obtenerHistorial(colaboradorSeleccionado.id),
        actualizarColaboradores()
      ]);

      setHistorial(datosHistorial);

      const actualizado = datosColaboradores.find(
        c => c.id === colaboradorSeleccionado.id
      );

      if (actualizado) setColaboradorSeleccionado(actualizado);

      setNuevaEvaluacion({
        eventoId: '',
        estrellas: 0,
        notaInterna: ''
      });

      setMensajeFicha('Evaluación registrada correctamente');

    } catch (error) {
      setErrorFicha(error.message || 'No se pudo guardar la evaluación');
    } finally {
      setGuardandoEvaluacion(false);
    }
  };

  const mostrarEstrellas = (promedio) => {
    const valor = Number(promedio ?? 0);
    const cantidad = Math.max(0, Math.min(5, Math.round(valor)));

    return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">

      {/* ENCABEZADO */}
      <header className="border-b border-gray-200 pb-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
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

      {/* REGISTRO DE COLABORADORES */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Nuevo colaborador</h2>

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
                onChange={e => setNuevoColaborador({
                  ...nuevoColaborador,
                  nombre: e.target.value
                })}
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
                onChange={e => setNuevoColaborador({
                  ...nuevoColaborador,
                  tipo: e.target.value
                })}
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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar colaborador'}
              </button>

              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                disabled={guardando}
                className="bg-gray-100 px-6 py-3 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO */}
      {cargando && (
        <p className="text-center text-gray-500 py-12">
          Cargando colaboradores...
        </p>
      )}

      {!cargando && colaboradores.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center">
          No hay colaboradores registrados.
        </div>
      )}

      {!cargando && colaboradores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colaboradores.map(colaborador => (
            <div
              key={colaborador.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
            >
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">
                  {colaborador.tipo}
                </span>

                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {colaborador.nombre}
                </h2>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-yellow-500 text-xl">
                  {mostrarEstrellas(colaborador.promedioEstrellas)}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Promedio:{' '}
                  <span className="font-bold text-gray-800">
                    {Number(colaborador.promedioEstrellas ?? 0).toFixed(1)}
                  </span>
                </p>

                <p className="text-sm text-gray-500">
                  {colaborador.totalEvaluaciones ?? 0} evaluaciones
                </p>
              </div>

              <button
                type="button"
                onClick={() => abrirFicha(colaborador)}
                className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100"
              >
                Ver ficha / Evaluar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FICHA DEL COLABORADOR */}
      {colaboradorSeleccionado && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-6">

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Ficha de {colaboradorSeleccionado.nombre}
              </h2>
              <p className="text-gray-500">
                {colaboradorSeleccionado.tipo}
              </p>
              <p className="text-yellow-500 text-xl mt-2">
                {mostrarEstrellas(colaboradorSeleccionado.promedioEstrellas)}
                <span className="text-gray-700 text-sm ml-2">
                  {Number(colaboradorSeleccionado.promedioEstrellas ?? 0).toFixed(1)} / 5
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setColaboradorSeleccionado(null)}
              className="bg-gray-100 px-4 py-2 rounded-xl"
            >
              Cerrar ficha
            </button>
          </div>

          {errorFicha && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl">
              {errorFicha}
            </div>
          )}

          {mensajeFicha && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl">
              {mensajeFicha}
            </div>
          )}

          {cargandoFicha ? (
            <p className="text-gray-500">Cargando ficha...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* FORMULARIO DE EVALUACIÓN */}
              <div>
                <h3 className="text-xl font-bold mb-4">
                  Nueva evaluación
                </h3>

                <form onSubmit={guardarEvaluacion} className="space-y-4">

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Evento finalizado
                    </label>

                    <select
                      required
                      value={nuevaEvaluacion.eventoId}
                      onChange={e => setNuevaEvaluacion({
                        ...nuevaEvaluacion,
                        eventoId: e.target.value
                      })}
                      className="w-full border rounded-xl p-3"
                    >
                      <option value="">Seleccionar evento</option>
                      {eventos.map(evento => (
                        <option key={evento.id} value={evento.id}>
                          {evento.nombre} - {new Date(evento.fecha).toLocaleDateString('es-CL')}
                        </option>
                      ))}
                    </select>

                    {eventos.length === 0 && (
                      <p className="text-sm text-amber-700 mt-2">
                        No hay eventos finalizados disponibles.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Calificación
                    </label>

                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(numero => (
                        <button
                          key={numero}
                          type="button"
                          onClick={() => setNuevaEvaluacion({
                            ...nuevaEvaluacion,
                            estrellas: numero
                          })}
                          className={
                            'text-4xl transition ' +
                            (numero <= nuevaEvaluacion.estrellas
                              ? 'text-yellow-400'
                              : 'text-gray-300')
                          }
                          aria-label={`${numero} estrellas`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Nota interna
                    </label>

                    <textarea
                      required
                      rows={4}
                      value={nuevaEvaluacion.notaInterna}
                      onChange={e => setNuevaEvaluacion({
                        ...nuevaEvaluacion,
                        notaInterna: e.target.value
                      })}
                      className="w-full border rounded-xl p-3"
                      placeholder="Describe el desempeño del colaborador..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={guardandoEvaluacion || eventos.length === 0}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    {guardandoEvaluacion
                      ? 'Guardando evaluación...'
                      : 'Guardar evaluación'}
                  </button>

                </form>
              </div>

              {/* HISTORIAL */}
              <div>
                <h3 className="text-xl font-bold mb-4">
                  Historial de evaluaciones
                </h3>

                {historial.length === 0 ? (
                  <p className="text-gray-500">
                    Este colaborador todavía no tiene evaluaciones.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {historial.map(evaluacion => (
                      <div
                        key={evaluacion.id}
                        className="border border-gray-200 rounded-xl p-4"
                      >
                        <p className="font-bold text-gray-900">
                          {evaluacion.evento?.nombre || 'Evento'}
                        </p>

                        <p className="text-yellow-500 text-lg">
                          {mostrarEstrellas(evaluacion.estrellas)}
                        </p>

                        <p className="text-sm text-gray-600 mt-2">
                          {evaluacion.notaInterna || 'Sin observación'}
                        </p>

                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(evaluacion.fecha).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}

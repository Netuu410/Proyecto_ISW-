import { reportarAveriaEquipo, registrarReparacionEquipo } from '../api/equipos.js';
import React, { useState, useEffect, useCallback } from 'react';

export default function InventoryCard({ item, onEquipoActualizado }) {
  const [showModal, setShowModal] = useState(false);
  const [accion, setAccion] = useState('detalle');
  const [imagenFallida, setImagenFallida] = useState(false);
  const puedeReportar = item.estado === 'Disponible' && item.unidadesEnUso === 0 && item.stockDisponible > 0;
  const puedeReparar = item.stockAveriado > 0 && ['Disponible', 'Mantenimiento'].includes(item.estado);
  const motivoBloqueo = item.unidadesEnUso > 0
    ? 'Hay unidades en uso. La avería se puede registrar al finalizar la actividad.'
    : 'No hay unidades operativas habilitadas para reportar una avería.';
  const tituloModal = accion === 'averia' ? 'Reportar avería' : accion === 'reparacion' ? 'Registrar reparación' : 'Detalle del equipo';
  const abrirModal = nuevaAccion => { setAccion(nuevaAccion); setError(''); setShowModal(true); };
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [cantidadReparada, setCantidadReparada] = useState(1);
  const [notaReparacion, setNotaReparacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cerrarModal = useCallback(() => {
    setShowModal(false);
    setDescripcion('');
    setCantidad(1);
    setCantidadReparada(1);
    setNotaReparacion('');
    setError('');
  }, [setShowModal, setDescripcion, setCantidad, setCantidadReparada, setNotaReparacion, setError]);

  // Escucha Escape mientras el modal permite cerrar y retira la escucha al salir.
  useEffect(() => {
    if (!showModal || guardando) return;

    const manejarTecla = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cerrarModal();
      }
    };

    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [showModal, guardando, cerrarModal]);

  const reportarAveria = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const data = await reportarAveriaEquipo(item.id, { descripcion, cantidad: Number(cantidad) });
      // Avisa a la página para mostrar el equipo confirmado por el backend.
      onEquipoActualizado(data.equipo);
      cerrarModal();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const registrarReparacion = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const data = await registrarReparacionEquipo(item.id, {
        cantidad: Number(cantidadReparada), descripcion: notaReparacion,
      });
      onEquipoActualizado(data.equipo);
      cerrarModal();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  // Mapeo de colores según el estado del insumo/equipo
  const statusStyles = {
    Disponible: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'En Uso': 'bg-amber-100 text-amber-800 border-amber-300',
    Mantenimiento: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  const situaciones = [
    { nombre: 'Disponible', cantidad: item.unidadesDisponiblesAhora, texto: 'disponibles' },
    { nombre: 'En Uso', cantidad: item.unidadesEnUso, texto: 'en uso' },
    { nombre: 'Mantenimiento', cantidad: item.stockAveriado, texto: 'en mantenimiento' },
  ];

  return (
    <>
      <article className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {item.imagenUrl && !imagenFallida ? <img src={item.imagenUrl} alt={item.nombre} onError={() => setImagenFallida(true)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-500 text-center">Sin imagen</span>}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-indigo-600 uppercase">{item.categoria}</p>
            <h3 className="text-lg font-bold text-gray-900 break-words">{item.nombre}</h3>
            <p className="text-sm text-gray-500">{item.origen} · {item.stock} unidades totales</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {situaciones.map(situacion => <div key={situacion.nombre} className={`rounded-xl border p-2 ${statusStyles[situacion.nombre]}`}>
            <dt className="text-xs">{situacion.texto}</dt>
            <dd className="text-2xl font-bold mt-1">{situacion.cantidad}</dd>
          </div>)}
        </dl>
        <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
          <span className="text-gray-500">Tarifa: ${item.precio?.toLocaleString('es-CL')} /día</span>
          <button type="button" onClick={() => abrirModal('detalle')} className="font-semibold text-indigo-700 py-2">Ver detalle</button>
        </div>
        <div className="mt-auto border-t pt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!puedeReportar} onClick={() => abrirModal('averia')} className="text-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">Reportar avería</button>
          {puedeReparar && <button type="button" onClick={() => abrirModal('reparacion')} className="text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2">Registrar reparación</button>}
        </div>
        {!puedeReportar && <p className="text-xs text-gray-500">{motivoBloqueo}</p>}
      </article>
      {/* MODAL CON DETALLE COMPLETO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label={tituloModal}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl transition-all">
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <span className="font-semibold text-gray-800">{tituloModal}</span>
              <button type="button" onClick={cerrarModal} disabled={guardando}
                autoFocus
                aria-label="Cerrar detalle del equipo"
                className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center font-bold disabled:opacity-50">
                ✕
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto">
            {accion === 'detalle' && item.imagenUrl && !imagenFallida && <div className="relative h-32 bg-gray-100">
              <img
                src={item.imagenUrl || undefined}
                alt={item.nombre}
                onError={() => setImagenFallida(true)}
                className="w-full h-full object-contain"
              />
            </div>}

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{item.categoria}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{item.nombre}</h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {situaciones.map(situacion => <span key={situacion.nombre}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyles[situacion.nombre]}`}>
                    {situacion.cantidad} {situacion.texto}
                  </span>)}
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                {item.descripcion || 'Sin descripción adicional registrada para este equipo.'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Disponibles ahora</span>
                  <span className="text-base font-bold text-gray-800">{item.unidadesDisponiblesAhora} unidades</span>
                  <span className="text-xs text-gray-500 block">En uso: {item.unidadesEnUso}</span>
                  <span className="text-xs text-gray-500 block">Total: {item.stock} · En mantenimiento: {item.stockAveriado}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Precio de arriendo</span>
                  <span className="text-base font-bold text-indigo-600">${item.precio?.toLocaleString('es-CL')} /día</span>
                </div>
              </div>

              <p className="text-sm text-gray-600">Origen: {item.origen}</p>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {accion === 'reparacion' && puedeReparar && (
                <form onSubmit={registrarReparacion} className="space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h3 className="font-bold text-emerald-900">Sacar de mantenimiento</h3>
                  <p className="text-sm text-gray-600">Registra las unidades reparadas y listas para volver a utilizarse.</p>
                  <label htmlFor={`reparadas-${item.id}`} className="block text-sm font-semibold">Unidades reparadas</label>
                  <input id={`reparadas-${item.id}`} type="number" min="1" max={item.stockAveriado}
                    step="1" required value={cantidadReparada} disabled={guardando}
                    onChange={e => setCantidadReparada(e.target.value)} className="w-full border rounded-lg p-2" />
                  <label htmlFor={`nota-reparacion-${item.id}`} className="block text-sm font-semibold">Detalle de la reparación (opcional)</label>
                  <textarea id={`nota-reparacion-${item.id}`} value={notaReparacion} maxLength={2000}
                    disabled={guardando} onChange={e => setNotaReparacion(e.target.value)}
                    className="w-full border rounded-lg p-2" />
                  <button type="submit" disabled={guardando}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                    {guardando ? 'Guardando…' : 'Devolver a disponibles'}
                  </button>
                </form>
              )}
              {accion === 'averia' && (puedeReportar ? (
                <form onSubmit={reportarAveria} className="space-y-2">
                  <label htmlFor={`cantidad-averia-${item.id}`} className="block text-sm font-semibold">Unidades averiadas</label>
                  <input id={`cantidad-averia-${item.id}`} type="number" required min="1"
                    max={item.stockDisponible} step="1" value={cantidad}
                    onChange={e => setCantidad(e.target.value)} disabled={guardando}
                    className="w-full border rounded-lg p-2" />
                  <label htmlFor={`averia-${item.id}`} className="block text-sm font-semibold">Descripción de la avería</label>
                  <textarea id={`averia-${item.id}`} value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    required minLength={10} maxLength={2000} disabled={guardando} className="w-full border rounded-lg p-2" />
                  <p className="text-xs text-gray-500">Solo las unidades indicadas pasarán a mantenimiento. Las demás seguirán operativas.</p>
                  <button disabled={guardando} className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                    {guardando ? 'Guardando…' : 'Reportar avería'}
                  </button>
                </form>
              ) : <p className="text-sm text-rose-700">{motivoBloqueo}</p>)}
              {accion === 'reparacion' && !puedeReparar && <p role="status">Ya no hay unidades habilitadas para reparar. Revisa la disponibilidad actual.</p>}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect, useCallback } from 'react';

export default function InventoryCard({ item, onEquipoActualizado }) {
  const [showModal, setShowModal] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cerrarModal = useCallback(() => {
    setShowModal(false);
    setDescripcion('');
    setError('');
  }, []);

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
      const res = await fetch(`http://localhost:3000/api/equipos/${item.id}/averias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errores?.[0]?.message || data.error || 'No se pudo reportar la avería');
      onEquipoActualizado(data.equipo);
      setDescripcion('');
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  // Mapeo de colores según el estado del insumo/equipo
  const statusStyles = {
    Disponible: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'En Uso': 'bg-amber-100 text-amber-800 border-amber-300',
    Mantenimiento: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <>
      {/* TARJETA DE INVENTARIO */}
      <div
        onClick={() => setShowModal(true)}
        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col justify-between group"
      >
        <div>
          {/* Contenedor de Imagen + Badge */}
          <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
            <img
              src={item.imagenUrl || 'https://via.placeholder.com/400x300?text=Sin+Imagen'}
              alt={item.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full border shadow-sm ${statusStyles[item.estado] || 'bg-gray-100 text-gray-800'}`}>
              {item.estado}
            </span>
          </div>

          {/* Información del Producto */}
          <div className="p-5">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
              {item.categoria}
            </span>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {item.nombre}
            </h3>
          </div>
        </div>

        {/* Footer con Tarifa y Acción */}
        <div className="p-5 pt-0 flex items-center justify-between border-t border-gray-50 mt-2">
          <div>
            <span className="text-xs text-gray-400 block font-medium">Tarifa diaria</span>
            <span className="text-lg font-black text-gray-900">
              ${item.precio?.toLocaleString('es-CL')}
            </span>
          </div>
          <span className="text-sm font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Ver más &rarr;
          </span>
        </div>
      </div>

      {/* MODAL CON DETALLE COMPLETO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="Detalle del equipo"
            className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl transition-all">
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <span className="font-semibold text-gray-800">Detalle del equipo</span>
              <button type="button" onClick={cerrarModal} disabled={guardando}
                aria-label="Cerrar detalle del equipo"
                className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center font-bold disabled:opacity-50">
                ✕
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto">
            <div className="relative h-64 bg-gray-100">
              <img
                src={item.imagenUrl || undefined}
                alt={item.nombre}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{item.categoria}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{item.nombre}</h2>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyles[item.estado]}`}>
                  {item.estado}
                </span>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                {item.descripcion || 'Sin descripción adicional registrada para este equipo.'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Stock disponible</span>
                  <span className="text-base font-bold text-gray-800">{item.estado === 'Disponible' ? item.stock : 0} unidades</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Precio arriendo</span>
                  <span className="text-base font-bold text-indigo-600">${item.precio?.toLocaleString('es-CL')} /día</span>
                </div>
              </div>

              <p className="text-sm text-gray-600">Origen: {item.origen}</p>
              {item.estado === 'Disponible' ? (
                <form onSubmit={reportarAveria} className="space-y-2">
                  <label htmlFor={`averia-${item.id}`} className="block text-sm font-semibold">Descripción de la avería</label>
                  <textarea id={`averia-${item.id}`} value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    required minLength={10} maxLength={2000} className="w-full border rounded-lg p-2" />
                  <p className="text-xs text-gray-500">El reporte enviará todo este registro de inventario a mantenimiento.</p>
                  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                  <button disabled={guardando} className="bg-rose-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                    {guardando ? 'Guardando…' : 'Reportar avería'}
                  </button>
                </form>
              ) : <p className="text-sm text-rose-700">No se puede reportar una avería mientras el equipo está {item.estado?.toLowerCase()}.</p>}
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

import React, { useState } from 'react';

export default function InventoryCard({ item }) {
  const [showModal, setShowModal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const image = item.imagenUrl || item.imagen;

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
        role="button"
        tabIndex={0}
        aria-label={`Ver ${item.nombre}, código ${item.codigo}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setShowModal(true);
          }
        }}
        onClick={() => setShowModal(true)}
        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col justify-between group"
      >
        <div>
          {/* Contenedor de Imagen + Badge */}
          <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
            {image && !imageFailed ? <img
              src={image}
              onError={() => setImageFailed(true)}
              alt={item.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            /> : <div className="h-full flex items-center justify-center text-gray-500">Sin imagen</div>}
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
            <p className="text-sm text-gray-600 break-all mt-2">Código: {item.codigo}</p>
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
          <div role="dialog" aria-modal="true" aria-label={`Detalle de ${item.nombre}`} className="bg-white rounded-2xl max-w-lg w-full overflow-y-auto max-h-[90vh] shadow-2xl transition-all">
            <div className="relative h-64 bg-gray-100">
              {image && !imageFailed ? <img
                src={image}
                onError={() => setImageFailed(true)}
                alt={item.nombre} 
                className="w-full h-full object-cover"
              /> : <div className="h-full flex items-center justify-center text-gray-500">Sin imagen</div>}
              <button 
                onClick={() => setShowModal(false)}
                aria-label="Cerrar detalle"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 rounded-full w-9 h-9 flex items-center justify-center font-bold shadow-md transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{item.categoria}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{item.nombre}</h2>
                  <p className="text-sm text-gray-600 break-all mt-2">Código: {item.codigo}</p>
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
                  <span className="text-xs text-gray-400 block font-medium">Unidad física</span>
                  <span className="text-sm text-gray-600">Disponibilidad por fechas pendiente de integración.</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Precio arriendo</span>
                  <span className="text-base font-bold text-indigo-600">${item.precio?.toLocaleString('es-CL')} /día</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

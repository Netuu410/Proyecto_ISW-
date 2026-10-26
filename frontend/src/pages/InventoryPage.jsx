import { obtenerEquipos, obtenerAlertas } from '../api/equipos.js';
import React, { useState, useEffect } from 'react';
import { resumirInventario, filtrarInventario } from '../lib/inventario.js';
import InventoryCard from '../components/InventoryCard';
import CreateEquipoModal from '../components/CreateEquipoModal';

export default function InventoryPage() {
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [errorAlertas, setErrorAlertas] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [version, setVersion] = useState(0);
  const resumen = resumirInventario(equipos);
  const visibles = filtrarInventario(equipos, filtro);
  const filtros = [
    { id: 'todos', nombre: 'Todos', estilo: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
    { id: 'disponibles', nombre: 'Disponibles', estilo: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    { id: 'enUso', nombre: 'En uso', estilo: 'bg-amber-50 border-amber-200 text-amber-900' },
    { id: 'mantenimiento', nombre: 'En mantenimiento', estilo: 'bg-rose-50 border-rose-200 text-rose-900' },
  ];

  // Reconsulta para incluir la ocupación actual del calendario tras cada cambio.
  const cargarEquipos = () => setVersion(actual => actual + 1);

  useEffect(() => {
    const controller = new AbortController();
    let ultimaPeticion = 0;
    const actualizar = async () => {
      const peticion = ++ultimaPeticion;
      try {
        const datos = await obtenerEquipos({ signal: controller.signal });
        if (controller.signal.aborted || peticion !== ultimaPeticion) return;
        setEquipos(Array.isArray(datos) ? datos : []);
        setErrorApi(null);
      } catch (error) {
        if (controller.signal.aborted || peticion !== ultimaPeticion) return;
        setErrorApi(error.message);
        setEquipos([]);
      } finally {
        if (!controller.signal.aborted && peticion === ultimaPeticion) setCargando(false);
      }
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 30000);
    window.addEventListener('focus', actualizar);
    obtenerAlertas({ signal: controller.signal })
      .then(datos => {
        if (!controller.signal.aborted) { setAlertas(datos); setErrorAlertas(''); }
      })
      .catch(error => { if (!controller.signal.aborted) setErrorAlertas(error.message); });
    return () => {
      controller.abort();
      window.clearInterval(intervalo);
      window.removeEventListener('focus', actualizar);
    };
  }, [version]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">
      <header className="border-b border-gray-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo de Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">Disponibilidad actual según el calendario. Se actualiza cada 30 segundos.</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm self-start md:self-auto"
        >
          <span className="text-lg">+</span> Crear Equipo
        </button>
      </header>

      <section aria-label="Filtrar inventario por situación actual" className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {filtros.map(opcion => (
            <button key={opcion.id} type="button" aria-pressed={filtro === opcion.id}
              disabled={cargando || !!errorApi} onClick={() => setFiltro(opcion.id)}
              className={`text-left rounded-2xl border p-5 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 ${opcion.estilo} ${filtro === opcion.id ? 'ring-2 ring-indigo-600 shadow-md' : 'hover:shadow-md'}`}>
              <span className="block text-sm font-semibold">{opcion.nombre}</span>
              <span className="block text-3xl font-bold mt-1">{cargando || errorApi ? '—' : resumen[opcion.id]}</span>
              <span className="text-xs">unidades{opcion.id === 'todos' ? ' totales' : ''}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">Un equipo puede aparecer en varios filtros si tiene unidades en distintas situaciones. Las reservas futuras se consultan en el calendario.</p>
      </section>

      {errorAlertas && <p role="alert" className="text-red-700">{errorAlertas}</p>}
      {alertas.length > 0 && (
        <section aria-label="Alertas de logística" className="p-4 bg-amber-50 rounded-xl space-y-2">
          <h2 className="font-bold">Historial de alertas de stock para logística</h2>
          {alertas.map(alerta => <p key={alerta.id} className="text-sm">{alerta.mensaje}</p>)}
        </section>
      )}
      {errorApi && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold">
          ⚠️ No se pudo cargar el inventario: {errorApi}. Revisa que la base de datos esté encendida.
        </div>
      )}

      {cargando ? (
        <div className="text-center py-16 text-gray-400 font-medium">
          Cargando inventario desde la base de datos...
        </div>
      ) : equipos.length === 0 && !errorApi ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 space-y-2">
          <p className="text-gray-600 font-bold">No hay equipos en la base de datos</p>
          <p className="text-xs text-gray-400">Haz clic en "+ Crear Equipo" para ingresar el primero.</p>
        </div>
      ) : !errorApi && visibles.length === 0 ? (
        <div role="status" className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p>No hay equipos en «{filtros.find(opcion => opcion.id === filtro).nombre}» ahora.</p>
          <button type="button" onClick={() => setFiltro('todos')} className="mt-3 text-indigo-700 font-semibold">Ver todos los equipos</button>
        </div>
      ) : !errorApi && (
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibles.map((item) => (
            <InventoryCard key={item.id} item={item} onEquipoActualizado={cargarEquipos} />
          ))}
        </main>
      )}

      {/* Modal para crear un nuevo registro */}
      <CreateEquipoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEquipoCreado={cargarEquipos}
      />
    </div>
  );
}

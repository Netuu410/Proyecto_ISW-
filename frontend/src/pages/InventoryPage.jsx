import { obtenerEquipos, obtenerAlertas } from '../api/equipos.js';
import React, { useState, useEffect, useRef } from 'react';
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
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const historialRef = useRef(null);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [version, setVersion] = useState(0);
  const resumen = resumirInventario(equipos);
  const visibles = filtrarInventario(equipos, filtro, busqueda, categoria);
  const categorias = [...new Set(equipos.map(equipo => equipo.categoria))].sort((a, b) => a.localeCompare(b, 'es'));
  const limpiarFiltros = () => { setFiltro('todos'); setBusqueda(''); setCategoria(''); };
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
      // Refresca las alertas junto al inventario, sin bloquearlo si fallan.
      obtenerAlertas({ signal: controller.signal })
        .then(datos => {
          if (controller.signal.aborted || peticion !== ultimaPeticion) return;
          setAlertas(datos);
          setErrorAlertas('');
        })
        .catch(error => {
          if (controller.signal.aborted || peticion !== ultimaPeticion) return;
          setErrorAlertas(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted && peticion === ultimaPeticion) setCargandoAlertas(false);
        });
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inventario de equipos</h1>
          <p className="text-gray-500 text-sm mt-1">Disponibilidad actual según el calendario. Se actualiza cada 30 segundos.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => historialRef.current.showModal()}
          className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm">
          Historial de alertas{!cargandoAlertas && !errorAlertas ? ` (${alertas.length})` : ''}
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm self-start md:self-auto"
        >
          <span className="text-lg">+</span> Crear Equipo
        </button>
        </div>
      </header>

      <section aria-label="Filtrar inventario por situación actual" className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {filtros.map(opcion => (
            <button key={opcion.id} type="button" aria-pressed={filtro === opcion.id}
              disabled={cargando || !!errorApi} onClick={() => setFiltro(opcion.id)}
              className={`text-left rounded-xl border px-3 py-3 flex items-center justify-between gap-2 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 ${opcion.estilo} ${filtro === opcion.id ? 'ring-2 ring-indigo-600 shadow-sm' : 'hover:shadow-sm'}`}>
              <span className="text-sm font-semibold">{opcion.nombre}</span>
              <span className="text-xl font-bold shrink-0">{cargando || errorApi ? '—' : resumen[opcion.id]}<span className="sr-only"> unidades{opcion.id === 'todos' ? ' totales' : ''}</span></span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Cantidades en unidades. Un equipo puede aparecer en varios filtros. Consulta las reservas futuras en Calendario.</p>
      </section>

      <section aria-label="Buscar equipos" className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 text-sm font-semibold">Buscar por nombre
            <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Ej.: luces, parlante…" className="mt-1 block w-full rounded-xl border border-gray-300 p-3 bg-white" />
          </label>
          <label className="text-sm font-semibold">Categoría
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 p-3 bg-white">
              <option value="">Todas las categorías</option>
              {categorias.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <button type="button" onClick={limpiarFiltros} className="p-3 text-indigo-700 font-semibold">Limpiar filtros</button>
        </div>
        {!cargando && !errorApi && <p role="status" className="text-sm text-gray-600">{visibles.length} de {equipos.length} tipos de equipo · Los totales superiores corresponden a todo el inventario.</p>}
      </section>

      {errorAlertas && <p role="alert" className="text-red-700">{errorAlertas}</p>}
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
          <p>No hay equipos que coincidan con la búsqueda y los filtros seleccionados.</p>
          <button type="button" onClick={limpiarFiltros} className="mt-3 text-indigo-700 font-semibold">Ver todos los equipos</button>
        </div>
      ) : !errorApi && (
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibles.map((item) => (
            <InventoryCard key={item.id} item={item} onEquipoActualizado={cargarEquipos} />
          ))}
        </main>
      )}

      {/* El diálogo nativo permite cerrar con Escape y mantiene el foco dentro. */}
      <dialog ref={historialRef} aria-labelledby="titulo-historial"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] rounded-2xl p-0 bg-white shadow-2xl backdrop:bg-black/50">
        <header className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between gap-4">
          <h2 id="titulo-historial" className="text-lg font-bold">Historial de alertas</h2>
          <form method="dialog"><button autoFocus aria-label="Cerrar historial" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200">✕</button></form>
        </header>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Estos avisos describen la situación al reportar la avería; no indican necesariamente un problema pendiente.</p>
          {errorAlertas && <p role="alert" className="text-red-700">{errorAlertas}</p>}
          {cargandoAlertas ? <p role="status">Cargando alertas…</p> : !errorAlertas && alertas.length === 0 && <p>No hay alertas registradas.</p>}
          {alertas.map(alerta => <p key={alerta.id} className="text-sm whitespace-pre-line break-words bg-amber-50 border border-amber-100 rounded-xl p-4">{alerta.mensaje}</p>)}
        </div>
      </dialog>

      {/* Modal para crear un nuevo registro */}
      <CreateEquipoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEquipoCreado={cargarEquipos}
      />
    </div>
  );
}

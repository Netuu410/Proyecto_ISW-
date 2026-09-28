import React, { useState, useEffect } from 'react';
import InventoryCard from '../components/InventoryCard';
import CreateEquipoModal from '../components/CreateEquipoModal';

export default function InventoryPage() {
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [errorAlertas, setErrorAlertas] = useState('');

  const cargarAlertas = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/equipos/alertas');
      if (!res.ok) throw new Error('No se pudieron cargar las alertas de logística');
      setAlertas(await res.json());
      setErrorAlertas('');
    } catch (error) { setErrorAlertas(error.message); }
  };
  const actualizarEquipo = (equipo) => {
    setEquipos(actuales => actuales.map(actual => actual.id === equipo.id ? equipo : actual));
    cargarAlertas();
  };

  // Obtener equipos reales del backend
  const cargarEquipos = async () => {
    setCargando(true);
    setErrorApi(null);
    try {
      const res = await fetch('http://localhost:3000/api/equipos');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en el servidor');
      }

      // Validar siempre que sea un arreglo
      setEquipos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      setErrorApi(error.message);
      setEquipos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEquipos();
    cargarAlertas();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">
      <header className="border-b border-gray-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo de Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión y disponibilidad de equipos e insumos en tiempo real.</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm self-start md:self-auto"
        >
          <span className="text-lg">+</span> Crear Equipo
        </button>
      </header>

      {errorAlertas && <p role="alert" className="text-red-700">{errorAlertas}</p>}
      {alertas.length > 0 && (
        <section aria-label="Alertas de logística" className="p-4 bg-amber-50 rounded-xl space-y-2">
          <h2 className="font-bold">Alertas de stock para logística</h2>
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
      ) : (
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipos.map((item) => (
            <InventoryCard key={item.id} item={item} onEquipoActualizado={actualizarEquipo} />
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

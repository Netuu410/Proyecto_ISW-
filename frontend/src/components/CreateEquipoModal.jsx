import React, { useState } from 'react';

export default function CreateEquipoModal({ isOpen, onClose, onEquipoCreado }) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    estado: 'Disponible',
    origen: 'Propio',
    precio: '',
    stock: 1,
    imagen: '',
    descripcion: ''
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('http://localhost:3000/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Los inputs entregan texto; precio y stock se envían como números al backend.
        body: JSON.stringify({
          ...formData,
          precio: Number(formData.precio),
          stock: Number(formData.stock)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.errores?.[0]?.message || data.error || 'Error al crear equipo');
      }

      // Limpiar el formulario
      setFormData({
        nombre: '',
        categoria: '',
        estado: 'Disponible',
        origen: 'Propio',
        precio: '',
        stock: 1,
        imagen: '',
        descripcion: ''
      });

      onEquipoCreado(); // Recarga la lista desde la BD
      onClose();        // Cierra el modal
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
        >
          ✕
        </button>

        <h2 className="text-xl font-black text-gray-900 mb-4">Crear Equipo</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del equipo</label>
            <input
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Consola Behringer 12 Ch"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoría</label>
              <input
                type="text"
                name="categoria"
                required
                value={formData.categoria}
                onChange={handleChange}
                placeholder="Ej: Audio"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Origen</label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="Propio">Propio</option>
                <option value="Arrendado">Arrendado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Precio diario ($)</label>
              <input
                type="number"
                name="precio"
                required
                min="0.01"
                step="any"
                value={formData.precio}
                onChange={handleChange}
                placeholder="Ej: 45000"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock inicial</label>
              <input
                type="number"
                name="stock"
                required
                min="1"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL de Imagen</label>
            <input
              type="url"
              name="imagen"
              value={formData.imagen}
              onChange={handleChange}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descripción</label>
            <textarea
              name="descripcion"
              rows="3"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Detalles y especificaciones técnicas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

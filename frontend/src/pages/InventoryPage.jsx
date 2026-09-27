import React from 'react';
import InventoryCard from '../components/InventoryCard';

const mockInventory = [
  {
    id: 1,
    nombre: 'Consola de Sonido Behringer 12 Ch',
    categoria: 'Audio',
    estado: 'Disponible',
    precio: 45000,
    stock: 3,
    imagen: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500',
    descripcion: 'Consola analógica de 12 canales con procesador de efectos integrado. Incluye estuche rígido de transporte.'
  },
  {
    id: 2,
    nombre: 'Foco LED Par 64 RGBW',
    categoria: 'Iluminación',
    estado: 'En Uso',
    precio: 15000,
    stock: 8,
    imagen: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500',
    descripcion: 'Proyector de luz LED para ambientación de escenarios con control DMX.'
  },
  {
    id: 3,
    nombre: 'Proyector Epson 4000 Lumens',
    categoria: 'Audiovisual',
    estado: 'Mantenimiento',
    precio: 35000,
    stock: 1,
    imagen: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500',
    descripcion: 'Proyector de alta definición en mantenimiento preventivo por cambio de filtro.'
  }
];

export default function InventoryPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-4">
      <header className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo de Inventario</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión y disponibilidad de equipos e insumos en tiempo real.</p>
      </header>

      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockInventory.map((item) => (
          <InventoryCard key={item.id} item={item} />
        ))}
      </main>
    </div>
  );
}
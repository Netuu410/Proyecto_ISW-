import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerEquiposService = async () => {
  return await prisma.equipo.findMany({
    orderBy: {
      id: 'desc',
    },
  });
};

export const crearEquipoService = async (data) => {
  return await prisma.equipo.create({
    data: {
      nombre: data.nombre,
      categoria: data.categoria || 'General',
      // Soporta 'imagenUrl', 'imagen' o 'imagen_url'
      imagenUrl: data.imagenUrl || data.imagen || data.imagen_url || null,
      descripcion: data.descripcion || null,
      estado: data.estado || 'Disponible',
      // Convierte el precio a número de forma segura
      precio: data.precio ? parseFloat(data.precio) : 0,
    },
  });
};
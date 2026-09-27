import { prisma } from '../database.js';

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
      codigo: data.codigo,
      nombre: data.nombre,
      categoria: data.categoria,
      imagenUrl: data.imagenUrl || data.imagen || null,
      descripcion: data.descripcion || null,
      estado: data.estado || 'Disponible',
      precio: data.precio,
    },
  });
};

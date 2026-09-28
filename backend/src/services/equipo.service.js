import { prisma } from '../database.js';

export class ErrorEquipo extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const obtenerEquiposService = () => prisma.equipo.findMany({ orderBy: { id: 'desc' } });
export const crearEquipoService = ({ imagen, ...data }) => prisma.equipo.create({
  data: { ...data, imagenUrl: imagen || null },
});

// La condición evita duplicados concurrentes. Estado, reporte y alerta son atómicos.
export const reportarAveriaService = (id, data, db = prisma) => db.$transaction(async tx => {
  const equipo = await tx.equipo.findUnique({ where: { id } });
  if (!equipo) throw new ErrorEquipo(404, 'El equipo no existe');
  if (equipo.estado === 'En Uso') {
    throw new ErrorEquipo(409, 'No se puede enviar a mantenimiento un equipo en uso');
  }
  if (equipo.estado !== 'Disponible') {
    throw new ErrorEquipo(409, 'El equipo no está disponible para reportar una avería');
  }
  const cambio = await tx.equipo.updateMany({
    where: { id, estado: 'Disponible' }, data: { estado: 'Mantenimiento' },
  });
  if (cambio.count !== 1) throw new ErrorEquipo(409, 'El estado cambió; actualiza el inventario');
  const reporte = await tx.reporteAveria.create({ data: { equipoId: id, descripcion: data.descripcion } });
  await tx.alertaStock.create({ data: {
    equipoId: id, reporteId: reporte.id,
    mensaje: equipo.nombre + ': enviado a mantenimiento. Revisar disponibilidad y compromisos futuros.',
  } });
  return { reporte, equipo: await tx.equipo.findUnique({ where: { id } }) };
});

export const obtenerAlertasService = () => prisma.alertaStock.findMany({
  orderBy: { id: 'desc' }, take: 100,
});

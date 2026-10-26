import { prisma } from '../database.js';
import { stockDisponible } from './disponibilidad.service.js';

export class ErrorEquipo extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const conDisponibilidad = equipo => ({ ...equipo, stockDisponible: stockDisponible(equipo) });
export const obtenerEquiposService = async (db = prisma, ahora = new Date()) => {
  const equipos = await db.equipo.findMany({
    orderBy: { id: 'desc' },
    include: { reservasAgenda: {
      where: { actividad: { estado: { not: 'Cancelado' }, inicio: { lte: ahora }, fin: { gt: ahora } } },
      select: { cantidad: true },
    } },
  });
  return equipos.map(({ reservasAgenda, ...equipo }) => {
    const asignadas = reservasAgenda.reduce((total, reserva) => total + reserva.cantidad, 0);
    // stockDisponible sigue siendo capacidad operativa para cotizar otras fechas.
    const unidadesEnUso = equipo.estado === 'En Uso'
      ? Math.max(asignadas, equipo.stock - equipo.stockAveriado) : asignadas;
    return { ...conDisponibilidad(equipo), unidadesEnUso,
      unidadesDisponiblesAhora: Math.max(0, stockDisponible(equipo) - unidadesEnUso) };
  });
};
export const crearEquipoService = ({ imagen, ...data }) => prisma.equipo.create({
  data: { ...data, imagenUrl: imagen || null },
});

// La transacción guarda estado, reporte y alerta juntos; si falla algo, revierte los cambios.
export const reportarAveriaService = (id, data, db = prisma) => db.$transaction(async tx => {
  // Comparte el bloqueo de Equipo con la agenda para no competir con una reserva.
  await tx.$queryRaw`SELECT id FROM "Equipo" WHERE id = ${id} FOR UPDATE`;
  const equipo = await tx.equipo.findUnique({ where: { id } });
  if (!equipo) throw new ErrorEquipo(404, 'El equipo no existe');
  if (equipo.estado === 'En Uso') {
    throw new ErrorEquipo(409, 'No se puede enviar a mantenimiento un equipo en uso');
  }
  if (equipo.estado !== 'Disponible') {
    throw new ErrorEquipo(409, 'El equipo no está disponible para reportar una avería');
  }
  const ahora = new Date();
  const enEventoActivo = await tx.reservaEquipo.count({
    where: { equipoId: id, actividad: {
      tipo: 'EVENTO', estado: { not: 'Cancelado' },
      inicio: { lte: ahora }, fin: { gt: ahora },
    } },
  });
  if (enEventoActivo) throw new ErrorEquipo(409, 'El equipo está asignado a un evento activo');
  const disponibles = stockDisponible(equipo);
  if (!Number.isInteger(data.cantidad) || data.cantidad < 1 || data.cantidad > disponibles) {
    throw new ErrorEquipo(409, `La cantidad averiada debe estar entre 1 y ${disponibles} unidades`);
  }
  const restantes = disponibles - data.cantidad;
  // Conserva el stock total y acumula solo las unidades dañadas.
  const cambio = await tx.equipo.updateMany({
    where: { id, estado: 'Disponible', stockAveriado: equipo.stockAveriado },
    data: { stockAveriado: { increment: data.cantidad },
      estado: restantes === 0 ? 'Mantenimiento' : 'Disponible' },
  });
  if (cambio.count !== 1) throw new ErrorEquipo(409, 'El estado cambió; actualiza el inventario');
  const reporte = await tx.reporteAveria.create({ data: {
    equipoId: id, descripcion: data.descripcion, cantidad: data.cantidad,
  } });
  await tx.alertaStock.create({ data: {
    equipoId: id, reporteId: reporte.id,
    mensaje: `${equipo.nombre}: ${data.cantidad} unidad(es) reportada(s) con avería. Quedan ${restantes} operativas. Revisar compromisos futuros.`,
  } });
  return { reporte, equipo: conDisponibilidad(await tx.equipo.findUnique({ where: { id } })) };
});

// Bloquea el mismo registro que averías y reservas; stock e historial se guardan juntos.
export const registrarReparacionService = (id, data, db = prisma) => db.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM "Equipo" WHERE id = ${id} FOR UPDATE`;
  const equipo = await tx.equipo.findUnique({ where: { id } });
  if (!equipo) throw new ErrorEquipo(404, 'El equipo no existe');
  if (!['Disponible', 'Mantenimiento'].includes(equipo.estado)) {
    throw new ErrorEquipo(409, 'No se puede registrar una reparación con el equipo en este estado');
  }
  if (!Number.isInteger(data.cantidad) || data.cantidad < 1 || data.cantidad > equipo.stockAveriado) {
    throw new ErrorEquipo(409, `Hay ${equipo.stockAveriado} unidades en mantenimiento; revisa la cantidad reparada`);
  }
  const cambio = await tx.equipo.updateMany({
    where: { id, estado: equipo.estado, stockAveriado: equipo.stockAveriado },
    data: { stockAveriado: { decrement: data.cantidad }, estado: 'Disponible' },
  });
  if (cambio.count !== 1) throw new ErrorEquipo(409, 'El equipo cambió; actualiza el inventario');
  const reparacion = await tx.reparacionEquipo.create({ data: {
    equipoId: id, cantidad: data.cantidad, descripcion: data.descripcion || null,
  } });
  return { reparacion, equipo: conDisponibilidad(await tx.equipo.findUnique({ where: { id } })) };
});

export const obtenerAlertasService = () => prisma.alertaStock.findMany({
  orderBy: { id: 'desc' }, take: 100,
});

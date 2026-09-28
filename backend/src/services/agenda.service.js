import { Prisma } from '@prisma/client';
import { prisma } from '../database.js';
import { bloquearRecursos, consultarDisponibilidad } from './disponibilidad.service.js';

export class ErrorAgenda extends Error {
  constructor(status, message, conflictos = []) {
    super(message);
    this.status = status;
    this.conflictos = conflictos;
  }
}

const detalle = { recinto: true, reservasEquipo: { include: { equipo: true } } };

export const listarActividades = ({ desde, hasta, tipo }, db = prisma) => db.actividadAgenda.findMany({
  where: { inicio: { lt: hasta }, fin: { gt: desde }, ...(tipo ? { tipo } : {}) },
  include: detalle,
  orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
});

export async function obtenerActividad(id, db = prisma) {
  const actividad = await db.actividadAgenda.findUnique({ where: { id }, include: detalle });
  if (!actividad) throw new ErrorAgenda(404, 'La actividad no existe');
  return actividad;
}

// Consulta orientativa; la confirmación vuelve a comprobar bajo bloqueo.
export const comprobarDisponibilidad = async (datos, db = prisma) => {
  const conflictos = await db.$transaction(tx => consultarDisponibilidad(tx, datos), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
  return { disponible: conflictos.length === 0, conflictos };
};

export async function crearActividad(datos, db = prisma) {
  try {
    return await db.$transaction(async tx => {
      // ReadCommitted es intencional: tras esperar el bloqueo se leen las
      // reservas recién confirmadas por la transacción anterior.
      await bloquearRecursos(tx, datos);
      const conflictos = await consultarDisponibilidad(tx, datos);
      if (conflictos.length) throw new ErrorAgenda(409, 'Hay recursos sin disponibilidad', conflictos);
      const evento = datos.tipo === 'EVENTO' ? await tx.evento.create({ data: {
        nombre: datos.nombre, fecha: datos.inicio, estado: 'Reservado',
      } }) : null;
      return tx.actividadAgenda.create({
        data: {
          tipo: datos.tipo, nombre: datos.nombre, clienteNombre: datos.clienteNombre,
          inicio: datos.inicio, fin: datos.fin, estado: 'Reservado', recintoId: datos.recintoId,
          eventoId: evento?.id,
          reservasEquipo: { create: datos.equipos.map(e => ({ equipoId: e.equipoId, cantidad: e.cantidad })) },
        },
        include: detalle,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 15000 });
  } catch (error) {
    if (error instanceof ErrorAgenda) throw error;
    // La exclusión protege también escrituras SQL ajenas a este servicio.
    if (String(error.message).includes('ActividadAgenda_recinto_sin_traslapes')) {
      const { conflictos } = await comprobarDisponibilidad(datos, db);
      throw new ErrorAgenda(409, 'El recinto acaba de ser reservado', conflictos);
    }
    if (['P2034', 'P2028'].includes(error.code)) {
      throw new ErrorAgenda(409, 'La disponibilidad cambió o los recursos están ocupados. Vuelve a confirmar.');
    }
    throw error;
  }
}

export const listarRecintos = (db = prisma) => db.recinto.findMany({ orderBy: { nombre: 'asc' } });

export async function crearRecinto(datos, db = prisma) {
  const nombre = datos.nombre.replace(/\s+/g, ' ');
  const direccion = datos.direccion.replace(/\s+/g, ' ');
  const clave = `${nombre}|${direccion}`.normalize('NFKC').toLocaleLowerCase('es-CL');
  try {
    return await db.recinto.create({ data: { nombre, direccion, clave } });
  } catch (error) {
    if (error.code === 'P2002') throw new ErrorAgenda(409, 'Este recinto ya está registrado; selecciónalo en la lista');
    throw error;
  }
}

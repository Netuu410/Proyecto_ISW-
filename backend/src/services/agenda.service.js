import { Prisma } from '@prisma/client';
import { prisma } from '../database.js';
import { bloquearRecursos, consultarDisponibilidad } from './disponibilidad.service.js';
import { detalleCotizacion } from './cotizacion.service.js';

export class ErrorAgenda extends Error {
  constructor(status, message, conflictos = []) {
    super(message);
    this.status = status;
    this.conflictos = conflictos;
  }
}

const detalle = { recinto: true, reservasEquipo: { include: { equipo: true } }, cotizacion: { include: detalleCotizacion } };

export function equiposDeCotizacion(cotizacion, adicionales = []) {
  const cantidades = new Map();
  for (const detalle of cotizacion.items) {
    if (detalle.equipoId) cantidades.set(detalle.equipoId, (cantidades.get(detalle.equipoId) || 0) + detalle.cantidad);
  }
  for (const equipo of adicionales) cantidades.set(equipo.equipoId, Math.max(cantidades.get(equipo.equipoId) || 0, equipo.cantidad));
  return [...cantidades].map(([equipoId, cantidad]) => ({ equipoId, cantidad }));
}

export const listarActividades = ({ desde, hasta, tipo }, db = prisma) => db.actividadAgenda.findMany({
  where: { inicio: { lt: hasta }, fin: { gt: desde }, estado: { not: 'Cancelado' }, ...(tipo ? { tipo } : {}) },
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
      let cotizacion;
      if (datos.cotizacionId) {
        if (datos.tipo !== 'EVENTO') throw new ErrorAgenda(400, 'La cotización se agenda como evento');
        await tx.$queryRaw`SELECT id FROM "Cotizacion" WHERE id = ${datos.cotizacionId} FOR UPDATE`;
        cotizacion = await tx.cotizacion.findUnique({ where: { id: datos.cotizacionId }, include: detalleCotizacion });
        if (!cotizacion) throw new ErrorAgenda(404, 'La cotización no existe');
        if (cotizacion.actividadAgenda || cotizacion.estado !== 'Preliminar') throw new ErrorAgenda(409, 'La cotización ya fue agendada o no está disponible');
        datos = { ...datos, clienteNombre: cotizacion.clienteNombre || datos.clienteNombre,
          equipos: equiposDeCotizacion(cotizacion, datos.equipos) };
      }
      // ReadCommitted es intencional: tras esperar el bloqueo se leen las
      // reservas recién confirmadas por la transacción anterior.
      await bloquearRecursos(tx, datos);
      const conflictos = await consultarDisponibilidad(tx, datos);
      if (conflictos.length) throw new ErrorAgenda(409, 'Hay recursos sin disponibilidad', conflictos);
      const evento = datos.tipo === 'EVENTO' ? await tx.evento.create({ data: {
        nombre: datos.nombre, fecha: datos.inicio, estado: 'Reservado',
      } }) : null;
      if (cotizacion) await tx.cotizacion.update({ where: { id: cotizacion.id }, data: { estado: 'Agendada' } });
      const actividad = await tx.actividadAgenda.create({
        data: {
          tipo: datos.tipo, nombre: datos.nombre, clienteNombre: datos.clienteNombre,
          inicio: datos.inicio, fin: datos.fin, estado: 'Reservado', recintoId: datos.recintoId,
          eventoId: evento?.id,
          cotizacionId: datos.cotizacionId,
          reservasEquipo: { create: datos.equipos.map(e => ({ equipoId: e.equipoId, cantidad: e.cantidad })) },
        },
        include: detalle,
      });
      return actividad;
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

export async function cancelarActividad( id, { motivo, comprobante = null }, db = prisma) {
  try {
    return await db.$transaction(async tx => {
      const referencia = await tx.actividadAgenda.findUnique({
        where: { id },
        select: {
          recintoId: true,
          cotizacionId: true,
          eventoId: true,
          reservasEquipo: {
            select: { equipoId: true, cantidad: true },
          },
        },
      });

      if (!referencia) {
        throw new ErrorAgenda(404, 'La actividad no existe');
      }

      if (referencia.cotizacionId) {
        await tx.$queryRaw`SELECT id FROM "Cotizacion"
          WHERE id = ${referencia.cotizacionId} FOR UPDATE`;
      }

      await bloquearRecursos(tx, {
        recintoId: referencia.recintoId,
        equipos: referencia.reservasEquipo,
      });

      await tx.$queryRaw`SELECT id FROM "ActividadAgenda"
        WHERE id = ${id} FOR UPDATE`;

      if (referencia.eventoId) {
        await tx.$queryRaw`SELECT id FROM "Evento"
          WHERE id = ${referencia.eventoId} FOR UPDATE`;
      }

      const actividad = await tx.actividadAgenda.findUnique({
        where: { id }, select: {
            id: true,
            tipo: true,
            nombre: true,
            clienteNombre: true,
            inicio: true,
            fin: true,
            estado: true,
            createdAt: true,
            recintoId: true,
            eventoId: true,
            cotizacionId: true,
            ...detalle,
            evento: { select: { estado: true } },
        },
      });

      if (!actividad) {
        throw new ErrorAgenda(404, 'La actividad no existe');
      }

      if (actividad.estado !== 'Reservado') {
        throw new ErrorAgenda(409, 'Solo se pueden cancelar actividades reservadas');
      }

      if (actividad.evento?.estado === 'Finalizado') {
        throw new ErrorAgenda(409, 'No se puede cancelar un evento finalizado');
      }

      const detalleCancelacion = JSON.parse(JSON.stringify(actividad));

      if (actividad.cotizacionId) {
        await tx.cotizacion.update({
          where: { id: actividad.cotizacionId },
          data: { estado: 'Cancelada' },
        });
      }

      if (actividad.eventoId) {
        await tx.evento.update({
          where: { id: actividad.eventoId },
          data: { estado: 'Cancelado' },
        });
      }

      return await tx.actividadAgenda.update({
        where: { id },
        data: {
          estado: 'Cancelado',
          canceladaAt: new Date(),
          motivoCancelacion: motivo,
          detalleCancelacion,
          comprobanteNombre: comprobante?.nombre ?? null,
          comprobanteTipo: comprobante?.tipo ?? null,
          comprobanteContenido: comprobante?.contenido ?? null,
        },
        select: { id: true, estado: true, canceladaAt: true },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    });
  } catch (error) {
    if (error instanceof ErrorAgenda) throw error;

    if (['P2034', 'P2028'].includes(error.code)) {
      throw new ErrorAgenda(
        409,
        'Los recursos están ocupados o la reserva cambió. Vuelve a intentarlo.'
      );
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

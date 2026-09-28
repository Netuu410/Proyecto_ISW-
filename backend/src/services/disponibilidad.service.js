import { Prisma } from '@prisma/client';

// Contrato compartido de reservas: cualquier confirmación debe llamar primero a
// bloquearRecursos dentro de SU MISMA transacción. No cambia estado ni stock.
export async function bloquearRecursos(tx, { recintoId, equipos }) {
  await tx.$queryRaw`SELECT id FROM "Recinto" WHERE id = ${recintoId} FOR UPDATE`;
  const ids = equipos.map(equipo => equipo.equipoId).sort((a, b) => a - b);
  if (ids.length) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Equipo"
      WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  }
}

// Se agrupan cambios en el mismo instante: [inicio, fin) permite consecutivas.
// Sumar todas las reservas que tocan el intervalo produciría falsos conflictos.
export function ocupacionMaxima(reservas, inicio, fin) {
  const cambios = new Map();
  for (const reserva of reservas) {
    const desde = Math.max(+new Date(reserva.inicio), +inicio);
    const hasta = Math.min(+new Date(reserva.fin), +fin);
    if (desde >= hasta) continue;
    cambios.set(desde, (cambios.get(desde) || 0) + reserva.cantidad);
    cambios.set(hasta, (cambios.get(hasta) || 0) - reserva.cantidad);
  }
  let ocupadas = 0;
  let maxima = 0;
  for (const [, delta] of [...cambios].sort(([a], [b]) => a - b)) {
    ocupadas += delta;
    maxima = Math.max(maxima, ocupadas);
  }
  return maxima;
}

export async function consultarDisponibilidad(tx, { inicio, fin, recintoId, equipos }) {
  const intervalo = { inicio: { lt: fin }, fin: { gt: inicio } };
  const recinto = await tx.recinto.findUnique({ where: { id: recintoId } });
  const conflictos = [];
  if (!recinto) {
    conflictos.push({ tipo: 'RECINTO', id: recintoId, nombre: 'Recinto inexistente', motivo: 'NO_EXISTE' });
  } else {
    const ocupaciones = await tx.actividadAgenda.findMany({
      where: { recintoId, ...intervalo },
      select: { id: true, nombre: true, inicio: true, fin: true },
      orderBy: { inicio: 'asc' },
    });
    if (ocupaciones.length) {
      conflictos.push({ tipo: 'RECINTO', id: recinto.id, nombre: recinto.nombre,
        motivo: 'RESERVADO', actividades: ocupaciones });
    }
  }
  if (!equipos.length) return conflictos;
  const registros = await tx.equipo.findMany({ where: { id: { in: equipos.map(e => e.equipoId) } } });
  const reservas = await tx.reservaEquipo.findMany({
    where: { equipoId: { in: equipos.map(e => e.equipoId) }, actividad: intervalo },
    include: { actividad: { select: { id: true, nombre: true, inicio: true, fin: true } } },
  });
  for (const pedido of equipos) {
    const equipo = registros.find(e => e.id === pedido.equipoId);
    if (!equipo) {
      conflictos.push({ tipo: 'EQUIPO', id: pedido.equipoId, nombre: 'Equipo inexistente', motivo: 'NO_EXISTE' });
      continue;
    }
    if (equipo.estado !== 'Disponible') {
      conflictos.push({ tipo: 'EQUIPO', id: equipo.id, nombre: equipo.nombre,
        motivo: 'NO_OPERATIVO', estado: equipo.estado });
      continue;
    }
    const asignadas = reservas.filter(reserva => reserva.equipoId === equipo.id);
    const ocupadas = ocupacionMaxima(asignadas.map(reserva => ({
      ...reserva.actividad, cantidad: reserva.cantidad,
    })), inicio, fin);
    const disponibles = Math.max(0, equipo.stock - ocupadas);
    if (pedido.cantidad > disponibles) {
      conflictos.push({ tipo: 'EQUIPO', id: equipo.id, nombre: equipo.nombre,
        motivo: 'STOCK_INSUFICIENTE', solicitadas: pedido.cantidad, disponibles,
        actividades: asignadas.map(reserva => ({ ...reserva.actividad, cantidad: reserva.cantidad })) });
    }
  }
  return conflictos;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEquiposService } from '../src/services/equipo.service.js';
import { prisma } from '../src/database.js';

test('consulta solo asignaciones actuales no canceladas, con fin exclusivo', async () => {
  const ahora = new Date('2026-10-25T15:00:00Z');
  let consulta;
  const db = { equipo: { findMany: async args => {
    consulta = args;
    return [{ id: 1, stock: 10, stockAveriado: 2, estado: 'Disponible',
      reservasAgenda: [{ cantidad: 2 }, { cantidad: 3 }] }];
  } } };
  const [equipo] = await obtenerEquiposService(db, ahora);
  assert.deepEqual(consulta.include.reservasAgenda.where.actividad, {
    estado: { not: 'Cancelado' }, inicio: { lte: ahora }, fin: { gt: ahora },
  });
  assert.equal(equipo.unidadesEnUso, 5);
  assert.equal(equipo.unidadesDisponiblesAhora, 3);
  assert.equal(equipo.stockDisponible, 8, 'Cotizaciones conserva la capacidad operativa, sin descontar reservas actuales');
  assert.equal(equipo.stockAveriado, 2);
  assert.equal('reservasAgenda' in equipo, false);
});

test('fin de ocupación libera el resumen sin escribir un estado en la base', async () => {
  const db = { equipo: { findMany: async () => [
    { id: 1, stock: 10, stockAveriado: 2, estado: 'Disponible', reservasAgenda: [] },
    { id: 2, stock: 4, stockAveriado: 4, estado: 'Mantenimiento', reservasAgenda: [] },
    { id: 3, stock: 3, stockAveriado: 0, estado: 'En Uso', reservasAgenda: [] },
  ] } };
  const [libre, mantenimiento, usoManual] = await obtenerEquiposService(db);
  assert.equal(libre.unidadesDisponiblesAhora, 8);
  assert.equal(libre.unidadesEnUso, 0);
  assert.equal(mantenimiento.unidadesDisponiblesAhora, 0);
  assert.equal(usoManual.unidadesEnUso, 3);
  assert.equal(usoManual.unidadesDisponiblesAhora, 0);
});

test('una asignación excesiva nunca produce disponibilidad negativa', async () => {
  const db = { equipo: { findMany: async () => [
    { stock: 5, stockAveriado: 2, estado: 'Disponible', reservasAgenda: [{ cantidad: 4 }] },
  ] } };
  const [equipo] = await obtenerEquiposService(db);
  assert.equal(equipo.unidadesDisponiblesAhora, 0);
  assert.equal(equipo.unidadesEnUso, 4);
});

test('PostgreSQL: calendario actual, futuro, cancelación y término', {
  skip: process.env.RUN_INVENTARIO_INTEGRATION !== '1',
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const revertir = new Error('REVERTIR_RESUMEN');
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      const equipo = await tx.equipo.create({ data: {
        nombre: 'Prueba resumen', categoria: 'Prueba', stock: 10, stockAveriado: 2,
      } });
      const recinto = await tx.recinto.create({ data: {
        nombre: 'Prueba resumen', direccion: 'Prueba', clave: `resumen-${Date.now()}`,
      } });
      const inicio = new Date('2090-01-01T12:00:00Z');
      const fin = new Date('2090-01-01T13:00:00Z');
      const siguiente = new Date('2090-01-01T14:00:00Z');
      const reservar = async (desde, hasta, cantidad, estado = 'Reservado') => {
        const evento = await tx.evento.create({ data: { nombre: 'Prueba', fecha: desde } });
        await tx.actividadAgenda.create({ data: {
          nombre: 'Prueba', clienteNombre: 'Prueba', tipo: 'EVENTO', estado,
          inicio: desde, fin: hasta, recintoId: recinto.id, eventoId: evento.id,
          reservasEquipo: { create: { equipoId: equipo.id, cantidad } },
        } });
      };
      await reservar(inicio, fin, 5);
      await reservar(fin, siguiente, 2);
      await reservar(inicio, fin, 3, 'Cancelado');
      const consultar = async ahora => (await obtenerEquiposService(tx, ahora)).find(e => e.id === equipo.id);
      const actual = await consultar(inicio);
      assert.equal(actual.unidadesEnUso, 5);
      assert.equal(actual.unidadesDisponiblesAhora, 3);
      const consecutivo = await consultar(fin);
      assert.equal(consecutivo.unidadesEnUso, 2);
      assert.equal(consecutivo.unidadesDisponiblesAhora, 6);
      const terminado = await consultar(siguiente);
      assert.equal(terminado.unidadesEnUso, 0);
      assert.equal(terminado.unidadesDisponiblesAhora, 8);
      throw revertir;
    }), error => error === revertir);
  } finally { await prisma.$disconnect(); }
});

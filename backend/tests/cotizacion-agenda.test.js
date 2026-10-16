import test from 'node:test';
import assert from 'node:assert/strict';
import { equiposDeCotizacion, crearActividad, ErrorAgenda } from '../src/services/agenda.service.js';
import { guardarCotizacion, ProductoNoCotizableError } from '../src/services/cotizacion.service.js';
import { cotizacionSchema } from '../src/validations/cotizacion.schema.js';
import { prisma } from '../src/database.js';

test('cotiza por nombre de cliente y rechaza productos duplicados', () => {
  assert.equal(cotizacionSchema.safeParse({ clienteNombre: 'Empresa', items: [{ equipoId: 1, cantidad: 2 }] }).success, true);
  assert.equal(cotizacionSchema.safeParse({ items: [{ equipoId: 1, cantidad: 2 }] }).success, false);
  assert.equal(cotizacionSchema.safeParse({ clienteNombre: 'Empresa', items: [{ equipoId: 1, cantidad: 2 }, { equipoId: 1, cantidad: 1 }] }).success, false);
});

test('agrupa equipos de varios productos, conserva mínimos cotizados y admite servicios', () => {
  const cotizacion = { items: [
    { equipoId: 7, cantidad: 2 }, { equipoId: 7, cantidad: 3 }, { equipoId: null, cantidad: 10 },
  ] };
  assert.deepEqual(equiposDeCotizacion(cotizacion, [{ equipoId: 7, cantidad: 1 }, { equipoId: 9, cantidad: 4 }]), [
    { equipoId: 7, cantidad: 5 }, { equipoId: 9, cantidad: 4 },
  ]);
  assert.deepEqual(equiposDeCotizacion(cotizacion, [{ equipoId: 7, cantidad: 6 }]), [{ equipoId: 7, cantidad: 6 }]);
});

test('la cotización conserva nombre y precio aunque cambie el inventario', async () => {
  const producto = { id: 1, nombre: 'Parlante', precio: 100, costoInterno: 20, stock: 5 };
  const resultado = await guardarCotizacion({ clienteNombre: 'Empresa', items: [{ equipoId: 1, cantidad: 2 }] }, {
    equipo: { findUnique: async () => producto },
    cotizacion: { create: async ({ data }) => ({ ...data, items: data.items.create }) },
  });
  producto.nombre = 'Otro nombre'; producto.precio = 500;
  assert.equal(resultado.items[0].equipoId, 1);
  assert.equal(resultado.items[0].nombreProducto, 'Parlante');
  assert.equal(resultado.items[0].precioCobrado, 100);
  assert.equal(resultado.totalVenta, 200);
});

test('rechaza cotización ya agendada antes de crear eventos o reservar recursos', async () => {
  let consultas = 0;
  const tx = {
    $queryRaw: async () => { consultas++; },
    cotizacion: { findUnique: async () => ({ estado: 'Agendada', actividadAgenda: { id: 4 } }) },
  };
  await assert.rejects(crearActividad({ tipo: 'EVENTO', cotizacionId: 1 }, { $transaction: callback => callback(tx) }),
    error => error instanceof ErrorAgenda && error.status === 409);
  assert.equal(consultas, 1);
});

test('un producto sin precio válido en inventario no genera cotización', async () => {
  for (const precio of [null, 0, -1]) {
    await assert.rejects(guardarCotizacion({ clienteNombre: 'Empresa', items: [{ equipoId: 1, cantidad: 1 }] }, {
      equipo: { findUnique: async () => ({ id: 1, nombre: 'Parlante', precio }) },
      cotizacion: { create: async () => assert.fail('No debe guardar') },
    }), error => error instanceof ProductoNoCotizableError);
  }
});

// Usa fixtures dentro de UNA transacción que siempre se revierte; no deja datos.
test('PostgreSQL: reserva cotizada, duplicado y conflicto sin perder cotización', { skip: process.env.RUN_AGENDA_INTEGRATION !== '1' }, async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Integración permitida solo en PostgreSQL local');
  const revertir = new Error('REVERTIR_FIXTURES');
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      const equipo = await tx.equipo.create({ data: { nombre: 'Prueba agenda', categoria: 'Prueba', stock: 5, precio: 100, costoInterno: 40 } });
      const recinto = await tx.recinto.create({ data: { nombre: 'Prueba recinto', direccion: 'Prueba', clave: `prueba-${Date.now()}` } });
      const cotizar = () => guardarCotizacion({ clienteNombre: 'Cliente de prueba', items: [{ equipoId: equipo.id, cantidad: 2 }] }, tx);
      const cotizacion = await cotizar();
      // Simula un cambio de nombre y precio posterior a la cotización.
      await tx.equipo.update({ where: { id: equipo.id }, data: { nombre: 'Nombre nuevo', precio: 300 } });
      const datos = { tipo: 'EVENTO', nombre: 'Prueba evento', clienteNombre: 'Otro nombre', cotizacionId: cotizacion.id,
        recintoId: recinto.id, inicio: new Date('2090-01-01T13:00:00Z'), fin: new Date('2090-01-01T14:00:00Z'), equipos: [] };
      const db = { $transaction: callback => callback(tx) };
      const actividad = await crearActividad(datos, db);
      assert.equal(actividad.clienteNombre, 'Cliente de prueba');
      assert.equal(actividad.cotizacion.items[0].nombreProducto, 'Prueba agenda');
      assert.equal(actividad.cotizacion.totalVenta, 200);
      assert.equal(actividad.cotizacionId, cotizacion.id);
      assert.equal(actividad.reservasEquipo[0].equipoId, equipo.id);
      assert.equal(actividad.reservasEquipo[0].cantidad, 2);
      assert.equal((await tx.cotizacion.findUnique({ where: { id: cotizacion.id } })).estado, 'Agendada');
      await assert.rejects(crearActividad(datos, db), error => error.status === 409);
      const pendiente = await cotizar();
      await assert.rejects(crearActividad({ ...datos, cotizacionId: pendiente.id }, db), error => error.status === 409);
      const intacta = await tx.cotizacion.findUnique({ where: { id: pendiente.id }, include: { actividadAgenda: true } });
      assert.equal(intacta.estado, 'Preliminar');
      assert.equal(intacta.actividadAgenda, null);
      throw revertir;
    }, { timeout: 20000 }), error => error === revertir);
  } finally { await prisma.$disconnect(); }
});

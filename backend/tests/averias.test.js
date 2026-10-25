import test from 'node:test';
import assert from 'node:assert/strict';
import { averiaSchema, reparacionSchema } from '../src/validations/equipo.schema.js';
import { reportarAveriaService, registrarReparacionService } from '../src/services/equipo.service.js';
import { consultarDisponibilidad, stockDisponible } from '../src/services/disponibilidad.service.js';
import { guardarCotizacion } from '../src/services/cotizacion.service.js';
import { prisma } from '../src/database.js';

const descripcion = 'El parlante no enciende';
const base = { id: 1, nombre: 'Parlante', estado: 'Disponible', stock: 5,
  stockAveriado: 0, precio: 100, costoInterno: 20 };

function simular({ equipo = base, activas = 0, fallaAlerta = false, fallaReparacion = false } = {}) {
  let estado = { equipo: equipo && { ...equipo }, reportes: [], alertas: [], reparaciones: [] };
  return {
    leer: () => estado,
    $transaction: async callback => {
      const anterior = structuredClone(estado);
      let bloqueado = false;
      try {
        return await callback({
          $queryRaw: async () => { bloqueado = true; },
          equipo: {
            findUnique: async () => {
              assert.ok(bloqueado, 'Debe bloquear antes de leer');
              return estado.equipo && { ...estado.equipo };
            },
            updateMany: async ({ where, data }) => {
              if (estado.equipo.estado !== where.estado || estado.equipo.stockAveriado !== where.stockAveriado) return { count: 0 };
              estado.equipo.stockAveriado += (data.stockAveriado.increment ?? 0) - (data.stockAveriado.decrement ?? 0);
              estado.equipo.estado = data.estado;
              return { count: 1 };
            },
          },
          reservaEquipo: { count: async ({ where }) => {
            assert.equal(where.actividad.estado.not, 'Cancelado');
            assert.equal(where.actividad.tipo, 'EVENTO');
            assert.ok(where.actividad.inicio.lte instanceof Date);
            assert.ok(where.actividad.fin.gt instanceof Date);
            return activas;
          } },
          reparacionEquipo: { create: async ({ data }) => {
            if (fallaReparacion) throw new Error('Fallo al guardar reparación');
            const reparacion = { id: estado.reparaciones.length + 1, ...data };
            estado.reparaciones.push(reparacion);
            return reparacion;
          } },
          reporteAveria: { create: async ({ data }) => {
            const reporte = { id: estado.reportes.length + 1, ...data };
            estado.reportes.push(reporte);
            return reporte;
          } },
          alertaStock: { create: async ({ data }) => {
            if (fallaAlerta) throw new Error('Fallo al guardar alerta');
            estado.alertas.push(data);
            return data;
          } },
        });
      } catch (error) { estado = anterior; throw error; }
    },
  };
}

test('valida cantidad obligatoria, entera y positiva, y descripción', () => {
  for (const cantidad of [undefined, 0, -1, 1.5, '1', null, 2147483648]) {
    assert.equal(averiaSchema.safeParse({ descripcion, cantidad }).success, false);
  }
  assert.equal(averiaSchema.safeParse({ descripcion: '  ', cantidad: 1 }).success, false);
  assert.equal(averiaSchema.safeParse({ descripcion, cantidad: 1 }).success, true);
});

test('avería parcial conserva total y deja cuatro unidades operativas', async () => {
  const db = simular();
  const resultado = await reportarAveriaService(1, { descripcion, cantidad: 1 }, db);
  assert.equal(resultado.equipo.stock, 5);
  assert.equal(resultado.equipo.stockAveriado, 1);
  assert.equal(resultado.equipo.stockDisponible, 4);
  assert.equal(resultado.equipo.estado, 'Disponible');
  assert.equal(resultado.reporte.cantidad, 1);
  assert.match(db.leer().alertas[0].mensaje, /Quedan 4 operativas/);
});

test('reportes sucesivos acumulan daño y solo el último bloquea todo el registro', async () => {
  const db = simular();
  await reportarAveriaService(1, { descripcion, cantidad: 2 }, db);
  const resultado = await reportarAveriaService(1, { descripcion, cantidad: 3 }, db);
  assert.equal(resultado.equipo.stockAveriado, 5);
  assert.equal(resultado.equipo.stockDisponible, 0);
  assert.equal(resultado.equipo.estado, 'Mantenimiento');
  await assert.rejects(reportarAveriaService(1, { descripcion, cantidad: 1 }, db), { status: 409 });
  assert.equal(db.leer().reportes.length, 2);
});

test('rechaza exceso sin cambiar stock ni guardar reportes', async () => {
  const db = simular({ equipo: { ...base, stockAveriado: 4 } });
  await assert.rejects(reportarAveriaService(1, { descripcion, cantidad: 2 }, db), { status: 409 });
  assert.equal(db.leer().equipo.stockAveriado, 4);
  assert.equal(db.leer().reportes.length, 0);
});

test('rechaza equipo inexistente, en uso y con evento activo', async () => {
  for (const [config, status] of [
    [{ equipo: null }, 404], [{ equipo: { ...base, estado: 'En Uso' } }, 409], [{ activas: 1 }, 409],
  ]) {
    const db = simular(config);
    await assert.rejects(reportarAveriaService(1, { descripcion, cantidad: 1 }, db), { status });
    assert.equal(db.leer().reportes.length, 0);
  }
});

test('propaga fallo de alerta para revertir toda la transacción', async () => {
  const db = simular({ fallaAlerta: true });
  await assert.rejects(reportarAveriaService(1, { descripcion, cantidad: 1 }, db), /Fallo al guardar alerta/);
  assert.equal(db.leer().equipo.stockAveriado, 0);
  assert.equal(db.leer().reportes.length, 0);
});

test('cotizador permite stock sano y rechaza unidades dañadas o mantenimiento', async () => {
  let equipo = { ...base, stockAveriado: 1 };
  const db = {
    equipo: { findUnique: async () => equipo },
    cotizacion: { create: async ({ data }) => data },
  };
  const cotizar = cantidad => guardarCotizacion({ clienteNombre: 'Prueba', items: [{ equipoId: 1, cantidad }] }, db);
  await cotizar(4);
  await assert.rejects(cotizar(5), /stock del inventario es 4/);
  equipo = { ...equipo, estado: 'Mantenimiento', stockAveriado: 5 };
  assert.equal(stockDisponible(equipo), 0);
  await assert.rejects(cotizar(1), /stock del inventario es 0/);
});

test('reservas descuentan unidades dañadas y ocupación del intervalo', async () => {
  const inicio = new Date('2090-01-01T12:00:00Z');
  const fin = new Date('2090-01-01T13:00:00Z');
  const tx = {
    recinto: { findUnique: async () => ({ id: 1 }) },
    actividadAgenda: { findMany: async () => [] },
    equipo: { findMany: async () => [{ ...base, stockAveriado: 1 }] },
    reservaEquipo: { findMany: async () => [{
      equipoId: 1, cantidad: 2, actividad: { id: 2, nombre: 'Evento', inicio, fin },
    }] },
  };
  const consultar = cantidad => consultarDisponibilidad(tx, { inicio, fin, recintoId: 1, equipos: [{ equipoId: 1, cantidad }] });
  assert.deepEqual(await consultar(2), []);
  const conflictos = await consultar(3);
  assert.equal(conflictos[0].disponibles, 2);
  assert.equal(conflictos[0].motivo, 'STOCK_INSUFICIENTE');
});

test('reparación valida cantidades y no acepta alterar el estado desde el cliente', () => {
  for (const cantidad of [undefined, 0, -1, 1.5, '2']) {
    assert.equal(reparacionSchema.safeParse({ cantidad }).success, false);
  }
  assert.equal(reparacionSchema.safeParse({ cantidad: 1, estado: 'Disponible' }).success, false);
  assert.equal(reparacionSchema.safeParse({ cantidad: 1 }).success, true);
});

test('reparación parcial y total devuelven solo las unidades reparadas', async () => {
  const db = simular({ equipo: { ...base, estado: 'Mantenimiento', stockAveriado: 5 } });
  const parcial = await registrarReparacionService(1, { cantidad: 2, descripcion: 'Cambio de cable' }, db);
  assert.equal(parcial.equipo.stockDisponible, 2);
  assert.equal(parcial.equipo.stockAveriado, 3);
  assert.equal(parcial.equipo.stock, 5);
  assert.equal(parcial.equipo.estado, 'Disponible');
  assert.equal(parcial.reparacion.descripcion, 'Cambio de cable');
  const total = await registrarReparacionService(1, { cantidad: 3 }, db);
  assert.equal(total.equipo.stockAveriado, 0);
  assert.equal(total.equipo.stockDisponible, 5);
  await assert.rejects(registrarReparacionService(1, { cantidad: 1 }, db), { status: 409 });
  assert.equal(db.leer().reparaciones.length, 2);
});

test('no repara unidades inexistentes ni equipos en uso ni excede las dañadas', async () => {
  for (const [equipo, status] of [
    [null, 404], [base, 409],
    [{ ...base, stockAveriado: 1 }, 409],
    [{ ...base, stockAveriado: 3, estado: 'En Uso' }, 409],
  ]) {
    const db = simular({ equipo });
    await assert.rejects(registrarReparacionService(1, { cantidad: 2 }, db), { status });
    assert.equal(db.leer().reparaciones.length, 0);
    assert.deepEqual(db.leer().equipo, equipo);
  }
});

test('un fallo al guardar la reparación revierte la devolución de stock', async () => {
  const db = simular({ equipo: { ...base, stockAveriado: 2 }, fallaReparacion: true });
  await assert.rejects(registrarReparacionService(1, { cantidad: 1 }, db), /Fallo al guardar reparación/);
  assert.equal(db.leer().equipo.stockAveriado, 2);
});

// Verificación optativa en PostgreSQL local; los registros se revierten al terminar.
test('PostgreSQL: guarda cantidades, alerta y estado dentro de una transacción', {
  skip: process.env.RUN_AVERIAS_INTEGRATION !== '1',
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const revertir = new Error('REVERTIR_PRUEBA');
  let id;
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      const equipo = await tx.equipo.create({ data: {
        nombre: 'Prueba avería', categoria: 'Prueba', stock: 5, precio: 100,
      } });
      id = equipo.id;
      const db = { $transaction: callback => callback(tx) };
      const parcial = await reportarAveriaService(id, { descripcion, cantidad: 1 }, db);
      assert.equal(parcial.equipo.stockDisponible, 4);
      assert.equal(parcial.equipo.stock, 5);
      assert.equal(await tx.alertaStock.count({ where: { equipoId: id } }), 1);
      const total = await reportarAveriaService(id, { descripcion, cantidad: 4 }, db);
      assert.equal(total.equipo.estado, 'Mantenimiento');
      const reparado = await registrarReparacionService(id, { cantidad: 2 }, db);
      assert.equal(reparado.equipo.stockDisponible, 2);
      assert.equal(reparado.equipo.stockAveriado, 3);
      assert.equal(reparado.equipo.estado, 'Disponible');
      await registrarReparacionService(id, { cantidad: 3 }, db);
      await assert.rejects(registrarReparacionService(id, { cantidad: 1 }, db), { status: 409 });
      assert.equal(await tx.reparacionEquipo.count({ where: { equipoId: id } }), 2);
      throw revertir;
    }), error => error === revertir);
    assert.equal(await prisma.equipo.findUnique({ where: { id } }), null);
  } finally { await prisma.$disconnect(); }
});

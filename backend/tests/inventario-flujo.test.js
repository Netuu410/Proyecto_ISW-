import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/database.js';
import { crearActividad } from '../src/services/agenda.service.js';
import { obtenerEquiposService, reportarAveriaService, registrarReparacionService } from '../src/services/equipo.service.js';

test('RF3 PostgreSQL: reserva futura, avería parcial, alerta, reparación y bloqueo en uso', {
  skip: process.env.RUN_INVENTARIO_INTEGRATION !== '1',
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const revertir = new Error('REVERTIR_FLUJO_RF3');
  let equipoId;
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      const equipo = await tx.equipo.create({ data: {
        nombre: 'Prueba RF3', categoria: 'Prueba', origen: 'Arrendado', stock: 5, precio: 100,
      } });
      equipoId = equipo.id;
      const recinto = await tx.recinto.create({ data: { nombre: 'Prueba RF3', direccion: 'Prueba', clave: randomUUID() } });
      const db = { $transaction: fn => fn(tx) };
      const datos = {
        tipo: 'EVENTO', nombre: 'Reserva futura RF3', clienteNombre: 'Prueba', recintoId: recinto.id,
        inicio: new Date('2090-02-01T12:00:00Z'), fin: new Date('2090-02-01T13:00:00Z'),
        equipos: [{ equipoId, cantidad: 5 }],
      };
      const reserva = await crearActividad(datos, db);
      const averiar = cantidad => reportarAveriaService(equipoId, { cantidad, descripcion: 'Dos unidades no encienden' }, db);
      const resultado = await averiar(2);
      assert.equal(resultado.equipo.stock, 5);
      assert.equal(resultado.equipo.stockAveriado, 2);
      assert.equal(resultado.equipo.stockDisponible, 3);
      const alerta = await tx.alertaStock.findFirst({ where: { equipoId } });
      assert.match(alerta.mensaje, /Reserva futura RF3/);
      assert.match(alerta.mensaje, /Faltan hasta 2 unidad/);
      assert.equal((await tx.reservaEquipo.findFirst({ where: { actividadId: reserva.id } })).cantidad, 5);
      for (const cantidad of [0, -1, 1.5, 4]) await assert.rejects(averiar(cantidad), { status: 409 });
      assert.equal(await tx.reporteAveria.count({ where: { equipoId } }), 1);

      const siguiente = { ...datos, inicio: new Date('2090-02-02T12:00:00Z'), fin: new Date('2090-02-02T13:00:00Z'), equipos: [{ equipoId, cantidad: 4 }] };
      await assert.rejects(crearActividad(siguiente, db), error => error.status === 409 && error.conflictos.some(c => c.motivo === 'STOCK_INSUFICIENTE' && c.disponibles === 3));
      await assert.rejects(registrarReparacionService(equipoId, { cantidad: 3 }, db), { status: 409 });
      await registrarReparacionService(equipoId, { cantidad: 1 }, db);
      // Reconsulta desde PostgreSQL, no usa el objeto devuelto al guardar.
      const actualizado = (await obtenerEquiposService(tx)).find(e => e.id === equipoId);
      assert.equal(actualizado.unidadesDisponiblesAhora, 4);
      assert.equal(actualizado.stockAveriado, 1);
      assert.equal(actualizado.stock, 5);
      await crearActividad(siguiente, db);

      for (const tipo of ['EVENTO', 'VISITA_TECNICA']) {
        const vigente = await crearActividad({ ...datos, tipo,
          inicio: new Date(Date.now() - 60000), fin: new Date(Date.now() + 3600000), equipos: [{ equipoId, cantidad: 1 }],
        }, db);
        await assert.rejects(averiar(1), error => error.status === 409 && /actividad vigente/.test(error.message));
        await tx.actividadAgenda.update({ where: { id: vigente.id }, data: { estado: 'Cancelado' } });
      }
      assert.equal(await tx.alertaStock.count({ where: { equipoId } }), 1);
      assert.equal(await tx.reparacionEquipo.count({ where: { equipoId } }), 1);
      throw revertir;
    }, { timeout: 20000 }), error => error === revertir);
    assert.equal(await prisma.equipo.findUnique({ where: { id: equipoId } }), null);
  } finally { await prisma.$disconnect(); }
});

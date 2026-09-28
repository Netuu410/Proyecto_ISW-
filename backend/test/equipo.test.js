import test from 'node:test';
import assert from 'node:assert/strict';
import { equipoSchema, equipoIdSchema, averiaSchema } from '../src/validations/equipo.schema.js';
import { reportarAveriaService } from '../src/services/equipo.service.js';
import { crearEquipo, reportarAveria } from '../src/controllers/equipo.controller.js';

const valido = { nombre: 'Parlante', categoria: 'Audio', precio: 1000, stock: 1 };
test('normaliza texto y aplica valores iniciales seguros', () => {
  const result = equipoSchema.parse({ ...valido, nombre: '  Parlante  ' });
  assert.equal(result.nombre, 'Parlante');
  assert.equal(result.estado, 'Disponible');
  assert.equal(result.origen, 'Propio');
});
for (const datos of [
  { nombre: '   ' }, { categoria: '  ' }, { precio: 0 }, { precio: -1 },
  { precio: '1000' }, { precio: Infinity }, { stock: 0 }, { stock: 1.5 },
  { estado: 'En Uso' }, { estado: 'Mantenimiento' }, { origen: 'Otro' },
  { imagen: 'javascript:alert(1)' }, { campoDesconocido: true },
]) {
  test('rechaza datos inválidos: ' + JSON.stringify(datos), () => {
    assert.equal(equipoSchema.safeParse({ ...valido, ...datos }).success, false);
  });
}
test('rechaza IDs y descripciones inválidos', () => {
  for (const id of ['0', '-1', '1.5', 'abc', '2147483648']) {
    assert.equal(equipoIdSchema.safeParse(id).success, false);
  }
  assert.equal(averiaSchema.safeParse({ descripcion: '          ' }).success, false);
  assert.equal(averiaSchema.safeParse({ descripcion: 'Cable roto', estado: 'Disponible' }).success, false);
});

// Dobles de persistencia: prueban reglas y llamadas, no aislamiento real de PostgreSQL.
function escenario(estado = 'Disponible', count = 1) {
  const llamadas = [];
  const equipo = estado === null ? null : { id: 1, nombre: 'Parlante', estado };
  const tx = {
    equipo: {
      findUnique: async () => equipo,
      updateMany: async args => {
        llamadas.push(['estado', args]);
        if (count) equipo.estado = args.data.estado;
        return { count };
      },
    },
    reporteAveria: { create: async args => { llamadas.push(['reporte', args]); return { id: 8, ...args.data }; } },
    alertaStock: { create: async args => { llamadas.push(['alerta', args]); return args.data; } },
  };
  return { llamadas, db: { $transaction: callback => callback(tx) } };
}
for (const [estado, status] of [[null, 404], ['En Uso', 409], ['Mantenimiento', 409]]) {
  test('impide reportar equipo ' + estado, async () => {
    const { llamadas, db } = escenario(estado);
    await assert.rejects(reportarAveriaService(1, { descripcion: 'No enciende el equipo' }, db), { status });
    assert.equal(llamadas.length, 0);
  });
}
test('crea reporte y alerta al cambiar a mantenimiento', async () => {
  const { llamadas, db } = escenario();
  const result = await reportarAveriaService(1, { descripcion: 'No enciende el equipo' }, db);
  assert.equal(result.equipo.estado, 'Mantenimiento');
  assert.deepEqual(llamadas.map(([tipo]) => tipo), ['estado', 'reporte', 'alerta']);
  assert.deepEqual(llamadas[0][1].where, { id: 1, estado: 'Disponible' });
  assert.equal(llamadas[2][1].data.reporteId, result.reporte.id);
});
test('si otro proceso cambia el estado no crea reporte ni alerta', async () => {
  const { llamadas, db } = escenario('Disponible', 0);
  await assert.rejects(reportarAveriaService(1, { descripcion: 'No enciende el equipo' }, db), { status: 409 });
  assert.deepEqual(llamadas.map(([tipo]) => tipo), ['estado']);
});
test('HTTP devuelve 400 y issues de Zod sin acceder a la BD', async () => {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await crearEquipo({ body: { ...valido, stock: -1 } }, res);
  assert.equal(res.code, 400);
  assert.equal(res.body.errores[0].path[0], 'stock');
  await reportarAveria({ params: { id: 'abc' }, body: {} }, res);
  assert.equal(res.code, 400);
  assert.ok(res.body.errores.length);
});

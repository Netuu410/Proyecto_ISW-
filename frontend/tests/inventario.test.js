import test from 'node:test';
import assert from 'node:assert/strict';
import { resumirInventario, filtrarInventario } from '../src/lib/inventario.js';

const equipos = [
  { id: 1, stock: 10, unidadesDisponiblesAhora: 3, unidadesEnUso: 5, stockAveriado: 2 },
  { id: 2, stock: 2, unidadesDisponiblesAhora: 0, unidadesEnUso: 0, stockAveriado: 2 },
  { id: 3, stock: 4, unidadesDisponiblesAhora: 4, unidadesEnUso: 0, stockAveriado: 0 },
];
test('resumen cuenta unidades, no tarjetas', () => {
  assert.deepEqual(resumirInventario(equipos), { todos: 16, disponibles: 7, enUso: 5, mantenimiento: 4 });
});
test('un mismo equipo aparece en varios filtros según sus cantidades', () => {
  const ids = filtro => filtrarInventario(equipos, filtro).map(equipo => equipo.id);
  assert.deepEqual(ids('disponibles'), [1, 3]);
  assert.deepEqual(ids('enUso'), [1]);
  assert.deepEqual(ids('mantenimiento'), [1, 2]);
  assert.deepEqual(ids('todos'), [1, 2, 3]);
});
test('sin resultados devuelve listas y totales vacíos', () => {
  assert.deepEqual(filtrarInventario([equipos[2]], 'enUso'), []);
  assert.deepEqual(resumirInventario([]), { todos: 0, disponibles: 0, enUso: 0, mantenimiento: 0 });
});

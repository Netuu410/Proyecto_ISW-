import test from 'node:test';
import assert from 'node:assert/strict';
import { reservasAfectadas, describirImpacto } from '../src/services/impacto-averia.service.js';

const reserva = (id, cantidad, desde, hasta) => ({ cantidad, actividad: {
  id, nombre: `Actividad ${id}`,
  inicio: new Date(`2090-01-01T${desde}:00:00Z`),
  fin: new Date(`2090-01-01T${hasta}:00:00Z`),
} });

test('cinco reservadas y tres operativas informa dos faltantes', () => {
  const afectadas = reservasAfectadas([reserva(1, 5, '12', '14')], 3);
  assert.equal(afectadas[0].faltantes, 2);
  assert.equal(afectadas[0].id, 1);
});
test('capacidad suficiente y lista vacía no generan conflictos', () => {
  assert.deepEqual(reservasAfectadas([reserva(1, 3, '12', '14')], 3), []);
  assert.deepEqual(reservasAfectadas([], 0), []);
  assert.match(describirImpacto([]), /Sin reservas futuras afectadas/);
});
test('reservas coincidentes comparten un déficit aunque cada una quepa sola', () => {
  const afectadas = reservasAfectadas([reserva(1, 3, '12', '14'), reserva(2, 2, '13', '15')], 4);
  assert.deepEqual(afectadas.map(a => [a.id, a.faltantes]), [[1, 1], [2, 1]]);
  assert.match(describirImpacto(afectadas), /no se suman/);
});
test('consecutivas no se suman ni afectan actividades fuera del tramo saturado', () => {
  const reservas = [reserva(1, 3, '12', '13'), reserva(2, 3, '13', '14'), reserva(3, 1, '15', '16')];
  assert.deepEqual(reservasAfectadas(reservas, 3), []);
  assert.deepEqual(reservasAfectadas(reservas, 2).map(a => a.id), [1, 2]);
});
test('intervalo largo no suma reservas interiores que nunca coinciden', () => {
  const reservas = [reserva(1, 1, '12', '16'), reserva(2, 2, '12', '13'), reserva(3, 2, '14', '15')];
  assert.deepEqual(reservasAfectadas(reservas, 3), []);
});
test('capacidad cero señala todas las reservas y conserva fechas completas', () => {
  const afectadas = reservasAfectadas([reserva(7, 2, '12', '14')], 0);
  assert.equal(afectadas[0].faltantes, 2);
  assert.match(describirImpacto(afectadas), /#7 Actividad 7/);
  assert.match(describirImpacto(afectadas), /90/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { aInstanteSantiago, fechaHoraLocal, diasDelCalendario, ocurreEnDia } from '../src/lib/agenda-time.js';

test('convierte invierno y verano de Santiago independientemente del sistema', () => {
  assert.equal(aInstanteSantiago('2026-07-15T10:00'), '2026-07-15T14:00:00.000Z');
  assert.equal(aInstanteSantiago('2026-01-15T10:00'), '2026-01-15T13:00:00.000Z');
  assert.equal(fechaHoraLocal('2026-07-15T14:00:00Z'), '2026-07-15T10:00');
});

test('rechaza horas inexistentes y repetidas durante cambios de horario', () => {
  assert.throws(() => aInstanteSantiago('2026-09-06T00:30'), /no existe/);
  assert.throws(() => aInstanteSantiago('2026-04-04T23:30'), /se repite/);
  assert.throws(() => aInstanteSantiago('2026-02-30T10:00'), /inválida/);
});

test('genera seis semanas desde lunes incluyendo cruces de año', () => {
  const dias = diasDelCalendario('2027-01');
  assert.equal(dias.length, 42);
  assert.equal(dias[0], '2026-12-28');
  assert.equal(dias.at(-1), '2027-02-07');
});

test('una actividad que termina a medianoche no ocupa el día siguiente', () => {
  const actividad = { inicio: '2026-10-01T23:00:00-03:00', fin: '2026-10-02T00:00:00-03:00' };
  assert.equal(ocurreEnDia(actividad, '2026-10-01'), true);
  assert.equal(ocurreEnDia(actividad, '2026-10-02'), false);
});

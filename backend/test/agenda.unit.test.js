import test from 'node:test';
import assert from 'node:assert/strict';
import { actividadSchema, disponibilidadSchema, consultaAgendaSchema } from '../src/validations/agenda.schema.js';
import { ocupacionMaxima } from '../src/services/disponibilidad.service.js';

const datos = { tipo: 'EVENTO', nombre: 'Evento', clienteNombre: 'Cliente',
  inicio: '2026-10-01T10:00:00-03:00', fin: '2026-10-01T12:00:00-03:00', recintoId: 1, equipos: [] };

test('valida y normaliza la actividad sin aceptar estado del cliente', () => {
  const result = actividadSchema.parse({ ...datos, nombre: '  Evento  ' });
  assert.equal(result.nombre, 'Evento');
  assert.equal(result.inicio.toISOString(), '2026-10-01T13:00:00.000Z');
  assert.equal(actividadSchema.safeParse({ ...datos, estado: 'Reservado' }).success, false);
});

for (const cambio of [
  { nombre: ' ' }, { clienteNombre: '' }, { clienteNombre: undefined }, { tipo: 'OTRO' },
  { recintoId: 0 }, { recintoId: '1' }, { inicio: '2026-10-01T10:00:00' },
  { inicio: '2026-02-30T10:00:00Z' }, { fin: datos.inicio }, { fin: '2026-10-01T09:00:00-03:00' },
  { equipos: [{ equipoId: 1, cantidad: 0 }] }, { equipos: [{ equipoId: 1, cantidad: 1.5 }] },
  { equipos: [{ equipoId: 1, cantidad: 1 }, { equipoId: 1, cantidad: 2 }] },
]) {
  test(`rechaza actividad inválida ${JSON.stringify(cambio)}`, () => {
    assert.equal(actividadSchema.safeParse({ ...datos, ...cambio }).success, false);
  });
}

test('visita sin equipos y actividad que cruza medianoche son válidas', () => {
  assert.ok(actividadSchema.safeParse({ ...datos, tipo: 'VISITA_TECNICA', equipos: undefined,
    inicio: '2026-10-01T23:00:00-03:00', fin: '2026-10-02T02:00:00-03:00' }).success);
});

test('consulta de disponibilidad valida el mismo intervalo y recursos', () => {
  const { tipo: _tipo, nombre: _nombre, clienteNombre: _clienteNombre, ...recursos } = datos;
  assert.ok(disponibilidadSchema.safeParse(recursos).success);
  assert.equal(disponibilidadSchema.safeParse({ ...recursos, fin: recursos.inicio }).success, false);
});

test('limita consultas vacías, invertidas o excesivas', () => {
  assert.equal(consultaAgendaSchema.safeParse({}).success, false);
  assert.equal(consultaAgendaSchema.safeParse({ desde: datos.fin, hasta: datos.inicio }).success, false);
  assert.equal(consultaAgendaSchema.safeParse({ desde: datos.inicio, hasta: '2028-01-01T00:00:00Z' }).success, false);
});

const hora = valor => new Date(`2026-10-01T${valor}:00Z`);
test('calcula el máximo simultáneo, no la suma de reservas consecutivas', () => {
  const reservas = [
    { inicio: hora('10:00'), fin: hora('11:00'), cantidad: 2 },
    { inicio: hora('11:00'), fin: hora('12:00'), cantidad: 3 },
  ];
  assert.equal(ocupacionMaxima(reservas, hora('10:00'), hora('12:00')), 3);
  assert.equal(ocupacionMaxima(reservas, hora('12:00'), hora('13:00')), 0);
});

test('detecta solapes contenidos, recorta al intervalo y agrupa cambios simultáneos', () => {
  const reservas = [
    { inicio: hora('09:00'), fin: hora('13:00'), cantidad: 2 },
    { inicio: hora('10:30'), fin: hora('11:30'), cantidad: 3 },
    { inicio: hora('11:30'), fin: hora('12:30'), cantidad: 4 },
    { inicio: hora('14:00'), fin: hora('15:00'), cantidad: 100 },
  ];
  assert.equal(ocupacionMaxima(reservas, hora('10:00'), hora('12:00')), 6);
});

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { prisma } from '../src/database.js';
import agendaRoutes from '../src/routes/agenda.routes.js';
import { crearActividad, crearRecinto, comprobarDisponibilidad, listarActividades } from '../src/services/agenda.service.js';

// Este archivo nunca toca una base habitual. Requiere opt-in y nombre de test.
const habilitado = process.env.AGENDA_INTEGRATION === '1';
const prueba = (nombre, fn) => test(nombre, { skip: !habilitado }, fn);
const prefijo = `agenda-test-${Date.now()}`;
const hora = valor => new Date(`2030-10-01T${valor}:00Z`);
let secuencia = 0;
let servidor;
let base;

before(async () => {
  if (!habilitado) return;
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Las pruebas requieren PostgreSQL local');
  assert.equal(url.pathname, '/nes_agenda_test', 'Las pruebas solo pueden usar nes_agenda_test');
  const [conexion] = await prisma.$queryRaw`SELECT current_database() AS base, inet_server_port() AS puerto`;
  assert.equal(conexion.base, 'nes_agenda_test');
  const app = express();
  app.use(express.json());
  app.use('/api/agenda', agendaRoutes);
  servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api/agenda`;
});
after(async () => {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await prisma.$disconnect();
});

const recinto = () => crearRecinto({ nombre: `${prefijo}-${++secuencia}`, direccion: 'Dirección de prueba' });
const equipo = (stock = 1, estado = 'Disponible') => prisma.equipo.create({ data: {
  nombre: `${prefijo}-${++secuencia}`, categoria: 'Test', stock, estado, origen: 'Propio', precio: 1000,
} });
const datos = (lugar, cambios = {}) => ({ tipo: 'EVENTO', nombre: `${prefijo}-${++secuencia}`,
  clienteNombre: 'Cliente de prueba', inicio: hora('10:00'), fin: hora('12:00'),
  recintoId: lugar.id, equipos: [], ...cambios });
const contar = async () => ({ actividades: await prisma.actividadAgenda.count(),
  eventos: await prisma.evento.count(), reservas: await prisma.reservaEquipo.count() });

prueba('guarda evento y equipos como Reservado; la consulta contiene todos los detalles', async () => {
  const lugar = await recinto(); const recurso = await equipo(3);
  const actividad = await crearActividad(datos(lugar, { equipos: [{ equipoId: recurso.id, cantidad: 2 }] }));
  assert.equal(actividad.estado, 'Reservado');
  assert.equal(actividad.recinto.id, lugar.id);
  assert.equal(actividad.reservasEquipo[0].cantidad, 2);
  assert.equal((await prisma.evento.findUnique({ where: { id: actividad.eventoId } })).estado, 'Reservado');
  const lista = await listarActividades({ desde: hora('09:00'), hasta: hora('13:00') });
  assert.ok(lista.some(item => item.id === actividad.id && item.clienteNombre === 'Cliente de prueba'));
  assert.equal((await prisma.equipo.findUnique({ where: { id: recurso.id } })).stock, 3);
});

prueba('visita técnica no crea un segundo Evento y permite no asignar equipos', async () => {
  const anteriores = await prisma.evento.count();
  const visita = await crearActividad(datos(await recinto(), { tipo: 'VISITA_TECNICA' }));
  assert.equal(visita.eventoId, null);
  assert.equal(visita.tipo, 'VISITA_TECNICA');
  assert.equal(await prisma.evento.count(), anteriores);
});

prueba('rechaza cualquier tipo de traslape de recinto y acepta límites consecutivos', async () => {
  const lugar = await recinto(); await crearActividad(datos(lugar));
  for (const [inicio, fin] of [['09:00', '11:00'], ['11:00', '13:00'], ['10:30', '11:00'], ['09:00', '13:00'], ['10:00', '12:00']]) {
    await assert.rejects(crearActividad(datos(lugar, { inicio: hora(inicio), fin: hora(fin) })), error =>
      error.status === 409 && error.conflictos.some(c => c.tipo === 'RECINTO' && c.id === lugar.id));
  }
  await crearActividad(datos(lugar, { inicio: hora('08:00'), fin: hora('10:00') }));
  await crearActividad(datos(lugar, { inicio: hora('12:00'), fin: hora('13:00') }));
});

prueba('informa simultáneamente recinto y equipos ocupados sin guardar nada', async () => {
  const lugar = await recinto(); const recurso = await equipo();
  const solicitud = datos(lugar, { equipos: [{ equipoId: recurso.id, cantidad: 1 }] });
  await crearActividad(solicitud); const anterior = await contar();
  await assert.rejects(crearActividad(solicitud), error => {
    assert.deepEqual(error.conflictos.map(c => c.tipo), ['RECINTO', 'EQUIPO']); return error.status === 409;
  });
  assert.deepEqual(await contar(), anterior);
});

prueba('permite actividades simultáneas con recursos distintos', async () => {
  const lugares = await Promise.all([recinto(), recinto()]);
  const recursos = await Promise.all([equipo(), equipo()]);
  const resultados = await Promise.all(lugares.map((lugar, i) => crearActividad(datos(lugar, { equipos: [{ equipoId: recursos[i].id, cantidad: 1 }] }))));
  assert.equal(resultados.length, 2);
});

prueba('dos confirmaciones simultáneas de un recinto producen una sola reserva', async () => {
  const lugar = await recinto();
  const resultados = await Promise.allSettled([crearActividad(datos(lugar)), crearActividad(datos(lugar))]);
  assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(resultados.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(await prisma.actividadAgenda.count({ where: { recintoId: lugar.id } }), 1);
});

prueba('dos usuarios no pueden exceder el stock incluso usando recintos distintos', async () => {
  const recurso = await equipo(3); const lugares = await Promise.all([recinto(), recinto()]);
  const resultados = await Promise.allSettled(lugares.map(lugar => crearActividad(datos(lugar, { equipos: [{ equipoId: recurso.id, cantidad: 2 }] }))));
  assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(resultados.find(r => r.status === 'rejected').reason.conflictos[0].tipo, 'EQUIPO');
  assert.equal(await prisma.reservaEquipo.count({ where: { equipoId: recurso.id } }), 1);
});

prueba('permite compartir stock suficiente y no suma reservas que son consecutivas', async () => {
  const recurso = await equipo(4); const lugares = await Promise.all([recinto(), recinto(), recinto()]);
  await crearActividad(datos(lugares[0], { inicio: hora('10:00'), fin: hora('11:00'), equipos: [{ equipoId: recurso.id, cantidad: 2 }] }));
  await crearActividad(datos(lugares[1], { inicio: hora('11:00'), fin: hora('12:00'), equipos: [{ equipoId: recurso.id, cantidad: 2 }] }));
  await crearActividad(datos(lugares[2], { equipos: [{ equipoId: recurso.id, cantidad: 2 }] }));
  assert.equal(await prisma.reservaEquipo.count({ where: { equipoId: recurso.id } }), 3);
});

prueba('un equipo en mantenimiento o un recurso inexistente impide confirmar', async () => {
  const recurso = await equipo(1, 'Mantenimiento'); const lugar = await recinto();
  await assert.rejects(crearActividad(datos(lugar, { equipos: [{ equipoId: recurso.id, cantidad: 1 }] })), error => error.conflictos[0].motivo === 'NO_OPERATIVO');
  await assert.rejects(crearActividad(datos({ id: 2147483647 })), error => error.conflictos[0].motivo === 'NO_EXISTE');
  await assert.rejects(crearActividad(datos(lugar, { equipos: [{ equipoId: 2147483647, cantidad: 1 }] })), error => error.conflictos[0].motivo === 'NO_EXISTE');
});

prueba('la preconsulta no reserva ni garantiza una confirmación posterior', async () => {
  const solicitud = datos(await recinto()); const anterior = await contar();
  assert.equal((await comprobarDisponibilidad(solicitud)).disponible, true);
  assert.deepEqual(await contar(), anterior);
  await crearActividad(solicitud);
  assert.equal((await comprobarDisponibilidad(solicitud)).disponible, false);
  await assert.rejects(crearActividad(solicitud), { status: 409 });
});

prueba('el fallo al guardar un equipo revierte también actividad, evento y reservas anteriores', async () => {
  const lugar = await recinto(); const recursos = await Promise.all([equipo(20), equipo(20)]);
  await prisma.$executeRawUnsafe(`CREATE FUNCTION agenda_test_fallo() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.cantidad = 13 THEN RAISE EXCEPTION 'fallo inyectado de prueba'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER agenda_test_fallo BEFORE INSERT ON "ReservaEquipo" FOR EACH ROW EXECUTE FUNCTION agenda_test_fallo()');
  const anterior = await contar();
  try {
    await assert.rejects(crearActividad(datos(lugar, { equipos: [
      { equipoId: recursos[0].id, cantidad: 1 }, { equipoId: recursos[1].id, cantidad: 13 },
    ] })));
    assert.deepEqual(await contar(), anterior);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER agenda_test_fallo ON "ReservaEquipo"');
    await prisma.$executeRawUnsafe('DROP FUNCTION agenda_test_fallo()');
  }
  // También demuestra que no quedaron bloqueos de filas tras el rollback.
  await crearActividad(datos(lugar, { equipos: [{ equipoId: recursos[1].id, cantidad: 13 }] }));
});

prueba('PostgreSQL rechaza traslapes de recinto aun saltándose el servicio', async () => {
  const lugar = await recinto(); await crearActividad(datos(lugar));
  await assert.rejects(prisma.actividadAgenda.create({ data: {
    tipo: 'VISITA_TECNICA', nombre: 'Inserción directa', clienteNombre: 'Test',
    inicio: hora('11:00'), fin: hora('13:00'), recintoId: lugar.id,
  } }), error => error.message.includes('ActividadAgenda_recinto_sin_traslapes'));
});

prueba('HTTP valida datos, confirma, entrega detalle y conflictos identificados', async () => {
  const post = body => fetch(`${base}/actividades`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post({})).status, 400);
  const solicitud = datos(await recinto());
  const creada = await post(solicitud); assert.equal(creada.status, 201);
  const actividad = await creada.json();
  const detalle = await fetch(`${base}/actividades/${actividad.id}`);
  assert.equal(detalle.status, 200); assert.equal((await detalle.json()).clienteNombre, solicitud.clienteNombre);
  const conflicto = await post(solicitud); assert.equal(conflicto.status, 409);
  assert.equal((await conflicto.json()).conflictos[0].id, solicitud.recintoId);
  assert.equal((await fetch(`${base}/actividades/2147483647`)).status, 404);
  assert.equal((await fetch(`${base}/actividades/abc`)).status, 400);
  assert.equal((await fetch(`${base}/actividades?desde=mal&hasta=mal`)).status, 400);
});

prueba('impide registrar el mismo recinto con diferencias de mayúsculas o espacios', async () => {
  const lugar = await recinto();
  await assert.rejects(crearRecinto({ nombre: lugar.nombre.toUpperCase(), direccion: 'Dirección  de  prueba' }), { status: 409 });
});

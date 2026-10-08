import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, normalizarBase } from '../src/api/client.js';

test('normaliza el destino sin duplicar /api', () => {
  assert.equal(normalizarBase(), '/api');
  assert.equal(normalizarBase('/api'), '/api');
  assert.equal(normalizarBase('https://backend.example/'), 'https://backend.example/api');
  assert.equal(normalizarBase('https://backend.example/api/'), 'https://backend.example/api');
});
test('éxito, JSON, encabezados y signal', async () => {
  const controller = new AbortController();
  const api = crearCliente({ fetchImpl: async (url, opciones) => {
    assert.equal(url, '/api/catalogo');
    assert.equal(opciones.method, 'POST');
    assert.equal(opciones.headers['Content-Type'], 'application/json');
    assert.equal(opciones.headers.Accept, 'application/json');
    assert.equal(opciones.signal, controller.signal);
    assert.deepEqual(JSON.parse(opciones.body), { nombre: 'Audio' });
    return Response.json({ id: 3 }, { status: 201 });
  } });
  assert.deepEqual(await api('/catalogo', { method: 'POST', body: { nombre: 'Audio' }, signal: controller.signal }), { id: 3 });
});
test('conserva detalles Zod y status de validación', async () => {
  const detalles = [{ path: ['nombre'], message: 'Nombre obligatorio' }];
  const api = crearCliente({ fetchImpl: async () => Response.json({ mensaje: 'Error en los datos', detalles }, { status: 400 }) });
  await assert.rejects(api('/catalogo'), error => error.status === 400 && error.message === detalles[0].message && assert.deepEqual(error.detalles, detalles) === undefined);
});
test('conserva conflictos y errores de Agenda', async () => {
  const conflictos = [{ equipoId: 1, mensaje: 'Reservado' }];
  const errores = [{ message: 'Horario inválido' }];
  const api = crearCliente({ fetchImpl: async () => Response.json({ mensaje: 'Conflicto', conflictos, errores }, { status: 409 }) });
  await assert.rejects(api('/agenda/actividades'), error => {
    assert.equal(error.status, 409); assert.deepEqual(error.conflictos, conflictos); assert.deepEqual(error.errores, errores); return true;
  });
});
test('error de red legible conserva causa', async () => {
  const causa = new TypeError('fetch failed');
  const api = crearCliente({ fetchImpl: async () => { throw causa; } });
  await assert.rejects(api('/equipos'), error => /conectar/.test(error.message) && error.cause === causa);
});
test('cancelación conserva AbortError', async () => {
  const causa = new DOMException('Cancelado', 'AbortError');
  const api = crearCliente({ fetchImpl: async () => { throw causa; } });
  await assert.rejects(api('/agenda/actividades'), error => error === causa);
});
test('cancelación al leer el cuerpo conserva AbortError', async () => {
  const causa = new DOMException('Cancelado', 'AbortError');
  const api = crearCliente({ fetchImpl: async () => ({ text: async () => { throw causa; } }) });
  await assert.rejects(api('/agenda/actividades'), error => error === causa);
});
test('204 y respuesta vacía devuelven null', async () => {
  for (const status of [200, 204]) {
    const api = crearCliente({ fetchImpl: async () => new Response(null, { status }) });
    assert.equal(await api('/equipos'), null);
  }
});
test('respuesta no JSON y error HTTP vacío son visibles', async () => {
  const html = crearCliente({ fetchImpl: async () => new Response('<html>Error</html>', { status: 502 }) });
  await assert.rejects(html('/catalogo'), error => error.status === 502 && /JSON/.test(error.message));
  const vacia = crearCliente({ fetchImpl: async () => new Response(null, { status: 503 }) });
  await assert.rejects(vacia('/catalogo'), error => error.status === 503);
});

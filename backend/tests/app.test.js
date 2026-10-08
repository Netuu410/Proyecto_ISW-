import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';

test('Express sirve el build y las rutas React, separando errores API y archivos', async (t) => {
  // Usa el build local real. No consulta ni escribe PostgreSQL.
  const server = crearApp({ servirFrontend: true }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let html;
  for (const ruta of ['/', '/inventario', '/cotizaciones', '/colaboradores', '/calendario']) {
    const res = await fetch(base + ruta, { headers: { Accept: 'text/html' } });
    assert.equal(res.status, 200, ruta);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const body = await res.text();
    assert.match(body, /id="root"/);
    html ??= body;
    assert.equal(body, html);
  }
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  const js = await fetch(base + asset);
  assert.equal(js.status, 200); assert.match(js.headers.get('content-type'), /javascript/);
  await js.text();
  for (const ruta of ['/api', '/api/no-existe', '/api/catalogo/no-existe', '/assets/no-existe.js', '/.env']) {
    const res = await fetch(base + ruta, { headers: { Accept: 'text/html' } });
    assert.equal(res.status, 404, ruta);
    assert.match(res.headers.get('content-type'), /application\/json/);
    await res.json();
  }
  // Recorre ruta y controlador reales; la validación evita llegar a Prisma.
  const invalida = await fetch(base + '/api/cotizaciones', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: 1, items: [] }),
  });
  assert.equal(invalida.status, 400); assert.ok(Array.isArray((await invalida.json()).detalles));
});

test('producción falla con mensaje útil si no se compiló frontend', () => {
  assert.throws(() => crearApp({ servirFrontend: true, frontendDir: '/nes-build-inexistente-para-prueba' }), /npm run build/);
});

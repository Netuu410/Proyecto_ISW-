import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { crearApp } from '../src/app.js';
import { crearHash, verificarPassword } from '../src/utils/password.js';
import { limitarIntentos } from '../src/middleware/auth.middleware.js';
import { prisma } from '../src/database.js';

const seleccionar = (objeto, select) => select
  ? Object.fromEntries(Object.keys(select).filter(k => select[k]).map(k => [k, objeto[k]])) : { ...objeto };

function baseSimulada() {
  const usuarios = new Map();
  const sesiones = new Map();
  return {
    usuario: {
      async create({ data, select }) {
        if ([...usuarios.values()].some(u => u.email === data.email)) throw Object.assign(new Error(), { code: 'P2002' });
        const usuario = { id: usuarios.size + 1, rol: 'Gestor_Eventos', activo: true, ...data };
        usuarios.set(usuario.id, usuario);
        return seleccionar(usuario, select);
      },
      async findUnique({ where }) {
        return [...usuarios.values()].find(u => where.id ? u.id === where.id : u.email === where.email) || null;
      },
      async update({ where, data }) { Object.assign(usuarios.get(where.id), data); },
    },
    sesionUsuario: {
      async create({ data }) { sesiones.set(data.id, { ...data }); return data; },
      async findUnique({ where, include }) {
        const sesion = sesiones.get(where.id);
        return sesion ? { ...sesion, ...(include ? { usuario: seleccionar(usuarios.get(sesion.usuarioId), include.usuario.select) } : {}) } : null;
      },
      async update({ where, data }) { Object.assign(sesiones.get(where.id), data); },
      async deleteMany({ where }) {
        for (const [id, sesion] of sesiones) {
          if (where.id ? id === where.id : sesion.expiresAt <= where.expiresAt.lte) sesiones.delete(id);
        }
      },
    },
  };
}

async function verificarFlujo(db) {
  const server = crearApp({ servirFrontend: false, dbAuth: db }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const enviar = (ruta, body, cookie, marcador = true) => fetch(base + ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(marcador ? { 'X-Requested-With': 'NES-Eventos' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const sesion = cookie => fetch(base + '/auth/sesion', { headers: { Cookie: cookie } });
  const datos = { nombre: ' Prueba Auth ', email: ` AUTH-${randomUUID()}@EXAMPLE.COM `, password: 'Prueba123!Segura' };
  try {
    for (const ruta of ['/equipos', '/catalogo', '/cotizaciones', '/evaluaciones', '/colaboradores', '/agenda/actividades']) {
      assert.equal((await fetch(base + ruta)).status, 401, ruta);
    }
    assert.equal((await enviar('/auth/registro', datos, null, false)).status, 403);
    let respuesta = await enviar('/auth/registro', { ...datos, rol: 'Administrador' });
    assert.equal(respuesta.status, 400);
    assert.ok(!(await respuesta.text()).includes(datos.password));
    respuesta = await enviar('/auth/registro', { ...datos, password: 'x' });
    assert.equal(respuesta.status, 400);
    respuesta = await enviar('/auth/registro', datos);
    assert.equal(respuesta.status, 201);
    const { usuario } = await respuesta.json();
    assert.deepEqual(Object.keys(usuario).sort(), ['email', 'id', 'nombre', 'rol']);
    assert.equal(usuario.email, datos.email.trim().toLowerCase());
    assert.equal(usuario.nombre, datos.nombre.trim());
    assert.equal(usuario.rol, 'Gestor_Eventos');
    const guardado = await db.usuario.findUnique({ where: { id: usuario.id } });
    assert.notEqual(guardado.passwordHash, datos.password);
    assert.ok(await verificarPassword(datos.password, guardado.passwordHash));
    assert.equal((await enviar('/auth/registro', datos)).status, 409);
    const credenciales = { email: datos.email, password: datos.password };
    const incorrecta = await enviar('/auth/login', { ...credenciales, password: 'incorrecta' });
    const inexistente = await enviar('/auth/login', { email: `nadie-${randomUUID()}@example.com`, password: 'incorrecta' });
    assert.equal(incorrecta.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(await incorrecta.json(), await inexistente.json());

    respuesta = await enviar('/auth/login', credenciales);
    assert.equal(respuesta.status, 200);
    assert.deepEqual((await respuesta.json()).usuario, usuario);
    const setCookie = respuesta.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\/api/i);
    assert.match(setCookie, /Max-Age=28800/);
    const cookie = setCookie.split(';')[0];
    const token = cookie.split('=')[1];
    const idSesion = createHash('sha256').update(token).digest('hex');
    assert.equal(await db.sesionUsuario.findUnique({ where: { id: token } }), null);
    assert.ok(await db.sesionUsuario.findUnique({ where: { id: idSesion } }));
    assert.deepEqual((await (await sesion(cookie)).json()).usuario, usuario);
    assert.equal((await sesion(`${cookie.slice(0, -1)}z`)).status, 401);
    assert.equal((await enviar('/cotizaciones', { items: [] }, cookie)).status, 400);

    // Un nuevo login reemplaza la sesión de este navegador.
    respuesta = await enviar('/auth/login', credenciales, cookie);
    assert.equal(respuesta.status, 200);
    const nuevaCookie = respuesta.headers.get('set-cookie').split(';')[0];
    assert.notEqual(nuevaCookie, cookie);
    assert.equal((await sesion(cookie)).status, 401);
    assert.equal((await sesion(nuevaCookie)).status, 200);
    const salida = await enviar('/auth/logout', undefined, nuevaCookie);
    assert.equal(salida.status, 204);
    assert.match(salida.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await sesion(nuevaCookie)).status, 401);
    assert.equal((await enviar('/auth/logout')).status, 204);

    respuesta = await enviar('/auth/login', credenciales);
    const cookieFinal = respuesta.headers.get('set-cookie').split(';')[0];
    await db.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
    assert.equal((await sesion(cookieFinal)).status, 401);
    assert.equal((await enviar('/auth/login', credenciales)).status, 401);
    await db.usuario.update({ where: { id: usuario.id }, data: { activo: true } });
    const idFinal = createHash('sha256').update(cookieFinal.split('=')[1]).digest('hex');
    await db.sesionUsuario.update({ where: { id: idFinal }, data: { expiresAt: new Date(0) } });
    assert.equal((await sesion(cookieFinal)).status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('HTTP: registro, validación, credenciales, sesión, protección, rotación, logout y vencimiento', async () => {
  await verificarFlujo(baseSimulada());
});

test('contraseñas: salt aleatorio y rechazo de hashes dañados', async () => {
  const hash = await crearHash('Mi contraseña');
  assert.notEqual(await crearHash('Mi contraseña'), hash);
  assert.equal(await verificarPassword('Mi contraseña', hash), true);
  assert.equal(await verificarPassword('otra', hash), false);
  for (const invalido of [null, 123, '', 'mal:hash', `${'a'.repeat(32)}:${'a'.repeat(126)}`, `${hash}:extra`]) {
    assert.equal(await verificarPassword('Mi contraseña', invalido), false);
  }
});

test('límite de intentos devuelve 429 y Retry-After', () => {
  const limitar = limitarIntentos({ maximo: 2 });
  let aceptados = 0;
  const res = { set(nombre, valor) { this[nombre] = valor; }, status(codigo) { this.codigo = codigo; return this; }, json() {} };
  for (let i = 0; i < 3; i++) limitar({ ip: '127.0.0.1' }, res, () => { aceptados++; });
  assert.equal(aceptados, 2);
  assert.equal(res.codigo, 429);
  assert.ok(Number(res['Retry-After']) > 0);
});

test('PostgreSQL: flujo HTTP real dentro de una transacción revertida', {
  skip: process.env.RUN_AUTH_INTEGRATION !== '1',
}, async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Usar solo PostgreSQL local');
  const revertir = new Error('REVERTIR_AUTH');
  try {
    // Cada respuesta de negocio usa un savepoint para recuperar la transacción
    // tras el error único que provoca deliberadamente el registro duplicado.
    await assert.rejects(prisma.$transaction(async tx => {
      const db = { ...tx, usuario: {
        findUnique: args => tx.usuario.findUnique(args),
        update: args => tx.usuario.update(args),
        async create(args) {
          await tx.$executeRawUnsafe('SAVEPOINT registro');
          try {
            const usuario = await tx.usuario.create(args);
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT registro');
            return usuario;
          } catch (error) {
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT registro');
            throw error;
          }
        },
      }, sesionUsuario: tx.sesionUsuario };
      await verificarFlujo(db);
      throw revertir;
    }, { timeout: 30000 }), error => error === revertir);
  } finally { await prisma.$disconnect(); }
});

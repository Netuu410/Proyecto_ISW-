import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';

// Nunca usar DATABASE_URL/.env implícitamente para pruebas de escritura.
const target = new URL(process.env.TEST_DATABASE_URL || 'http://invalid');
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname), 'Servidor de pruebas local obligatorio');
assert.equal(target.port, '5432');
assert.match(target.pathname, /^\/nes_inventario_test_[a-z0-9_]+$/);
process.env.DATABASE_URL = target.href;
const { app } = await import('../src/app.js');
const { prisma } = await import('../src/database.js');
let server;
let base;
const run = Date.now().toString(36).toUpperCase();
const unit = { nombre: 'Guitarra prueba', categoria: 'Instrumentos', precio: 100, imagen: 'https://example.com/guitarra.png' };
async function post(path, data) {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT system_identifier::text AS id FROM pg_control_system()`;
  assert.equal(identity.id, process.env.TEST_SERVER_SYSTEM_IDENTIFIER, 'Identidad de PostgreSQL verificada antes de escribir');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
});

test('una fila por unidad; mismo nombre, códigos distintos; imagen y contrato individual', async () => {
  const a = await post('/equipos', { ...unit, codigo: `GUT-${run}-A` });
  const b = await post('/equipos', { ...unit, codigo: `GUT-${run}-B`, stock: 1 });
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.deepEqual(Object.keys(a.body).sort(), ['equipo', 'mensaje']);
  assert.notEqual(a.body.equipo.id, b.body.equipo.id);
  assert.equal(a.body.equipo.imagenUrl, unit.imagen);
  const list = await fetch(`${base}/equipos`).then(r => r.json());
  assert.ok(Array.isArray(list));
  assert.equal(list.filter(e => [a.body.equipo.id, b.body.equipo.id].includes(e.id)).length, 2);
  assert.ok(!('stock' in a.body.equipo));
});

test('códigos automáticos obligatorios y distintos bajo concurrencia', async () => {
  const responses = await Promise.all(Array.from({length: 12}, () => post('/equipos', unit)));
  for (const res of responses) { assert.equal(res.status, 201); assert.match(res.body.equipo.codigo, /^EQ-[0-9A-F-]{36}$/); }
  assert.equal(new Set(responses.map(r => r.body.equipo.codigo)).size, 12);
});

test('código duplicado: solo una solicitud simultánea confirma; normalización de entrada', async () => {
  const codigo = `CONC-${run}`;
  const responses = await Promise.all(Array.from({length: 8}, () => post('/equipos', {...unit, codigo})));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal(responses.filter(r => r.status === 409).length, 7);
  assert.equal(await prisma.equipo.count({where: {codigo}}), 1);
  assert.equal((await post('/equipos', {...unit, codigo: ` ${codigo.toLowerCase()} `})).status, 409);
  await assert.rejects(prisma.equipo.create({data: {nombre: 'Otra', categoria: 'Otra', precio: 1, codigo}}), {code: 'P2002'});
});

test('validación: precio positivo, código válido, cantidades explícitamente rechazadas', async () => {
  const beforeCount = await prisma.equipo.count();
  for (const patch of [{precio: 0}, {precio: -1}, {stock: 0}, {stock: 2}, {codigo: ''}, {codigo: '  '}, {nombre: ' '}, {imagen: 'no-url'}, {imagenUrl: 'https://example.com/otra.png'}]) {
    const res = await post('/equipos', {...unit, ...patch});
    assert.equal(res.status, 400, JSON.stringify(patch));
    assert.ok(Array.isArray(res.body.errores));
    assert.ok(res.body.errores[0].message);
  }
  assert.equal(await prisma.equipo.count(), beforeCount);
  const {imagen, ...rest} = unit;
  assert.equal((await post('/equipos', {...rest, imagenUrl: imagen})).body.equipo.imagenUrl, imagen);
  await assert.rejects(prisma.$executeRaw`INSERT INTO "Equipo" ("codigo","nombre","categoria") VALUES ('   ','Inválido','Prueba')`);
});

test('catálogo y cotizaciones: persistencia, cálculos, formatos y errores Zod', async () => {
  const created = await post('/catalogo', {nombre: `Producto ${run}`, categoria: 'Audio', precioVenta: 150, costoInterno: 50});
  assert.equal(created.status, 201);
  assert.ok((await fetch(`${base}/catalogo`).then(r=>r.json())).some(p=>p.id===created.body.id));
  const quote = await post('/cotizaciones', {clienteId: 1, items: [{catalogoItemId: created.body.id, cantidad: 2}]});
  assert.equal(quote.status, 201);
  assert.equal(quote.body.totalVenta, 300); assert.equal(quote.body.gananciaNeta, 200);
  assert.equal(quote.body.items[0].catalogoItemId, created.body.id);
  assert.ok(await prisma.cotizacion.findUnique({where:{id:quote.body.id}}));
  for(const [path, data] of [['/catalogo', {}], ['/cotizaciones', {}], ['/cotizaciones', {clienteId: 1, items:[{catalogoItemId:created.body.id,cantidad:1.5}]}]]) {
    const res=await post(path,data); assert.equal(res.status,400); assert.ok(Array.isArray(res.body.detalles)); assert.ok(res.body.detalles[0].message);
  }
  assert.equal((await post('/cotizaciones', {clienteId:1,items:[{catalogoItemId:2147483647,cantidad:1}]})).status,404);
});

test('fallos internos conservan formato, devuelven 500 y no exponen detalles', async () => {
  for(const [model, method, path, data, field] of [
    ['equipo','create','/equipos',unit,'error'],
    ['catalogoItem','create','/catalogo',{nombre:'Prueba',categoria:'Audio',precioVenta:1,costoInterno:1},'mensaje'],
    ['cotizacion','create','/cotizaciones',null,'mensaje'],
  ]) {
    let body=data;
    if(!body) { const item=await prisma.catalogoItem.findFirst(); body={clienteId:1,items:[{catalogoItemId:item.id,cantidad:1}]}; }
    const original=prisma[model][method];
    prisma[model][method]=async()=>{throw new Error('PRIVATE_DATABASE_DETAIL');};
    try {const r=await post(path,body); assert.equal(r.status,500); assert.ok(r.body[field]); assert.ok(!JSON.stringify(r.body).includes('PRIVATE_DATABASE_DETAIL'));}
    finally {prisma[model][method]=original;}
  }
});

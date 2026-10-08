import test from 'node:test';
import assert from 'node:assert/strict';
import { guardarCotizacion, ProductoNoExisteError } from '../src/services/cotizacion.service.js';
import { cotizacionSchema } from '../src/validations/cotizacion.schema.js';
import { catalogoSchema } from '../src/validations/catalogo.schema.js';
import { crearCotizacion } from '../src/controllers/cotizacion.controller.js';
import { crearItemCatalogo } from '../src/controllers/catalogo.controller.js';
import { prisma } from '../src/database.js';

const productos = [{ id: 1, precioVenta: 100, costoInterno: 40 }, { id: 2, precioVenta: 25.5, costoInterno: 30 }];
function simularDB() {
  const escrituras = [];
  return { escrituras, catalogoItem: { findUnique: async ({ where }) => productos.find(p => p.id === where.id) },
    cotizacion: { create: async (args) => { escrituras.push(args); return { id: 7, ...args.data, items: args.data.items.create }; } } };
}
test('varios productos y cantidades, ganancia y detalles con precios de base', async () => {
  const db = simularDB();
  const datos = cotizacionSchema.parse({ clienteId: 8, totalVenta: 1, items: [
    { catalogoItemId: 1, cantidad: 3, precioCobrado: 0 }, { catalogoItemId: 2, cantidad: 2 },
  ] });
  const resultado = await guardarCotizacion(datos, db);
  assert.equal(resultado.totalVenta, 351); assert.equal(resultado.gananciaNeta, 171);
  assert.equal(resultado.clienteId, 8);
  assert.deepEqual(resultado.items, [
    { catalogoItemId: 1, cantidad: 3, precioCobrado: 100, costoAsumido: 40 },
    { catalogoItemId: 2, cantidad: 2, precioCobrado: 25.5, costoAsumido: 30 },
  ]);
  assert.equal(db.escrituras.length, 1);
  assert.deepEqual(db.escrituras[0].include, { items: true });
});
test('producto inexistente impide guardar incluso con productos válidos anteriores', async () => {
  const db = simularDB();
  await assert.rejects(guardarCotizacion({ clienteId: 1, items: [{ catalogoItemId: 1, cantidad: 2 }, { catalogoItemId: 99, cantidad: 1 }] }, db), error => error instanceof ProductoNoExisteError && error.message === 'Producto 99 no existe');
  assert.equal(db.escrituras.length, 0);
});
test('validaciones conservan restricciones', () => {
  for (const datos of [{ clienteId: 0, items: [] }, { clienteId: 1, items: [{ catalogoItemId: 1, cantidad: 1.5 }] }, { clienteId: 2147483648, items: [] }]) {
    assert.equal(cotizacionSchema.safeParse(datos).success, false);
  }
  assert.equal(catalogoSchema.safeParse({ nombre: ' ', categoria: 'Audio', precioVenta: 1, costoInterno: 1 }).success, false);
  assert.equal(catalogoSchema.safeParse({ nombre: 'Audio', categoria: 'Audio', precioVenta: 0, costoInterno: 1 }).success, false);
});
function respuesta() { return { status(code) { this.codigo = code; return this; }, json(body) { this.body = body; return this; } }; }
test('controlador devuelve 400 con detalles y 404 compatible, sin usar base real', async () => {
  const res = respuesta();
  await crearCotizacion({ body: { clienteId: 1, items: [] } }, res);
  assert.equal(res.codigo, 400); assert.ok(Array.isArray(res.body.detalles));
  const original = prisma.catalogoItem.findUnique;
  prisma.catalogoItem.findUnique = async () => null;
  try {
    const noExiste = respuesta();
    await crearCotizacion({ body: { clienteId: 1, items: [{ catalogoItemId: 99, cantidad: 1 }] } }, noExiste);
    assert.equal(noExiste.codigo, 404); assert.deepEqual(noExiste.body, { mensaje: 'Producto 99 no existe' });
  } finally { prisma.catalogoItem.findUnique = original; }
});
test('contrato 201 de catálogo mantiene objeto y nombres de campos', async () => {
  const original = prisma.catalogoItem.create;
  prisma.catalogoItem.create = async ({ data }) => ({ id: 3, ...data });
  try {
    const res = respuesta();
    await crearItemCatalogo({ body: { nombre: ' Audio ', categoria: ' Equipo ', precioVenta: 100, costoInterno: 40 } }, res);
    assert.equal(res.codigo, 201);
    assert.deepEqual(res.body, { id: 3, nombre: 'Audio', categoria: 'Equipo', precioVenta: 100, costoInterno: 40 });
  } finally { prisma.catalogoItem.create = original; }
});
test('controlador de cotización conserva respuesta 201 consumida por frontend', async () => {
  const buscar = prisma.catalogoItem.findUnique;
  const crear = prisma.cotizacion.create;
  prisma.catalogoItem.findUnique = async ({ where }) => productos.find(p => p.id === where.id);
  prisma.cotizacion.create = async ({ data }) => ({ id: 10, estado: 'Preliminar', ...data, items: data.items.create });
  try {
    const res = respuesta();
    await crearCotizacion({ body: { clienteId: 3, items: [{ catalogoItemId: 1, cantidad: 2 }, { catalogoItemId: 2, cantidad: 4 }] } }, res);
    assert.equal(res.codigo, 201); assert.equal(res.body.id, 10);
    assert.equal(res.body.totalVenta, 302); assert.equal(res.body.gananciaNeta, 102);
    assert.equal(res.body.items.length, 2); assert.equal(res.body.clienteId, 3);
  } finally { prisma.catalogoItem.findUnique = buscar; prisma.cotizacion.create = crear; }
});

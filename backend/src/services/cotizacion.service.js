import { prisma } from '../database.js';

export class ProductoNoExisteError extends Error {
  constructor(id) { super(`Producto ${id} no existe`); }
}

export async function guardarCotizacion(datosSeguros, db = prisma) {
    let totalVentaCalculado = 0;
    let costoTotalCalculado = 0;
    const detallesParaGuardar = [];

    for (const itemRequest of datosSeguros.items) {
      const producto = await db.equipo.findUnique({ where: { id: itemRequest.equipoId } });
      if (!producto) throw new ProductoNoExisteError(itemRequest.equipoId);
      if (!(producto.precio > 0)) throw new ProductoNoCotizableError(`Registra un precio válido para ${producto.nombre} en Inventario`);
      if (itemRequest.cantidad > producto.stock) {
        throw new ProductoNoCotizableError(`${producto.nombre}: solicitas ${itemRequest.cantidad} unidades, pero el stock del inventario es ${producto.stock}`);
      }

      totalVentaCalculado += (producto.precio * itemRequest.cantidad);
      costoTotalCalculado += (producto.costoInterno * itemRequest.cantidad);

      detallesParaGuardar.push({
        equipoId: producto.id,
        nombreProducto: producto.nombre,
        cantidad: itemRequest.cantidad,
        precioCobrado: producto.precio,
        costoAsumido: producto.costoInterno
      });
    }

    return await db.cotizacion.create({
      data: {
        clienteId: datosSeguros.clienteId,
        clienteNombre: datosSeguros.clienteNombre,
        totalVenta: totalVentaCalculado,
        gananciaNeta: (totalVentaCalculado - costoTotalCalculado),
        items: { create: detallesParaGuardar }
      },
      include: { items: true }
    });
}

export class ProductoNoCotizableError extends Error {}

export const detalleCotizacion = { items: { include: { item: true, equipo: true } }, actividadAgenda: { select: { id: true } } };

export const listarCotizaciones = (db = prisma) => db.cotizacion.findMany({
  include: detalleCotizacion, orderBy: { id: 'desc' },
});

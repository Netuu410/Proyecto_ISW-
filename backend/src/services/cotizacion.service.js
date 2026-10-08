import { prisma } from '../database.js';

export class ProductoNoExisteError extends Error {
  constructor(id) { super(`Producto ${id} no existe`); }
}

export async function guardarCotizacion(datosSeguros, db = prisma) {
    let totalVentaCalculado = 0;
    let costoTotalCalculado = 0;
    const detallesParaGuardar = [];

    for (const itemRequest of datosSeguros.items) {
      const producto = await db.catalogoItem.findUnique({ where: { id: itemRequest.catalogoItemId } });
      if (!producto) throw new ProductoNoExisteError(itemRequest.catalogoItemId);

      totalVentaCalculado += (producto.precioVenta * itemRequest.cantidad);
      costoTotalCalculado += (producto.costoInterno * itemRequest.cantidad);

      detallesParaGuardar.push({
        catalogoItemId: producto.id,
        cantidad: itemRequest.cantidad,
        precioCobrado: producto.precioVenta,
        costoAsumido: producto.costoInterno
      });
    }

    return await db.cotizacion.create({
      data: {
        clienteId: datosSeguros.clienteId,
        totalVenta: totalVentaCalculado,
        gananciaNeta: (totalVentaCalculado - costoTotalCalculado),
        items: { create: detallesParaGuardar }
      },
      include: { items: true }
    });
}

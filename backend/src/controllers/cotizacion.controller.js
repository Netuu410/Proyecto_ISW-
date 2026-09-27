import { z } from 'zod';
import { prisma } from '../database.js'; // <- Conexión al Singleton

const cotizacionSchema = z.object({
  clienteId: z.number().int().positive(),
  items: z.array(
    z.object({
      catalogoItemId: z.number().int().positive(),
      cantidad: z.number().int().positive()
    })
  ).min(1, "La cotización debe tener al menos un ítem")
});

export const crearCotizacion = async (req, res) => {
  try {
    const datosSeguros = cotizacionSchema.parse(req.body);
    let totalVentaCalculado = 0;
    let costoTotalCalculado = 0;
    const detallesParaGuardar = [];

    for (const itemRequest of datosSeguros.items) {
      const producto = await prisma.catalogoItem.findUnique({ where: { id: itemRequest.catalogoItemId } });
      if (!producto) return res.status(404).json({ mensaje: `Producto ${itemRequest.catalogoItemId} no existe` });

      totalVentaCalculado += (producto.precioVenta * itemRequest.cantidad);
      costoTotalCalculado += (producto.costoInterno * itemRequest.cantidad);

      detallesParaGuardar.push({
        catalogoItemId: producto.id,
        cantidad: itemRequest.cantidad,
        precioCobrado: producto.precioVenta,
        costoAsumido: producto.costoInterno
      });
    }

    const nuevaCotizacion = await prisma.cotizacion.create({
      data: {
        clienteId: datosSeguros.clienteId,
        totalVenta: totalVentaCalculado,
        gananciaNeta: (totalVentaCalculado - costoTotalCalculado),
        items: { create: detallesParaGuardar }
      },
      include: { items: true }
    });

    res.status(201).json(nuevaCotizacion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ mensaje: "Error al crear cotización", detalles: error.issues });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({ mensaje: 'Un producto de la cotización ya no existe', detalles: [] });
    }
    res.status(500).json({ mensaje: "Error interno al crear cotización", detalles: [] });
  }
};

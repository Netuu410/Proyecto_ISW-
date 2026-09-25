import { z } from 'zod';
import { prisma } from '../database.js'; // Importamos la conexión

const catalogoSchema = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacío"),
  categoria: z.string().min(1, "La categoría es obligatoria"),
  precioVenta: z.number().positive("El precio debe ser mayor a 0"),
  costoInterno: z.number().positive("El costo debe ser mayor a 0")
});

export const crearItemCatalogo = async (req, res) => {
  try {
    const datosSeguros = catalogoSchema.parse(req.body);
    const nuevoItem = await prisma.catalogoItem.create({ data: datosSeguros });
    res.status(201).json(nuevoItem);
  } catch (error) {
    res.status(400).json({ mensaje: "Error en los datos", detalles: error.errors });
  }
};
import { z } from 'zod';
import { prisma } from '../database.js'; // Importamos la conexión

const catalogoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede estar vacío").max(120),
  categoria: z.string().trim().min(1, "La categoría es obligatoria").max(80),
  precioVenta: z.number().positive("El precio debe ser mayor a 0"),
  costoInterno: z.number().positive("El costo debe ser mayor a 0")
});

export const crearItemCatalogo = async (req, res) => {
  try {
    const datosSeguros = catalogoSchema.parse(req.body);
    const nuevoItem = await prisma.catalogoItem.create({ data: datosSeguros });
    res.status(201).json(nuevoItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ mensaje: "Error en los datos", detalles: error.issues });
    }
    console.error('Error al crear catálogo:', error);
    res.status(500).json({ mensaje: "Error interno al crear producto" });
  }
};

export const obtenerCatalogo = async (req, res) => {
  try {
    const productos = await prisma.catalogoItem.findMany();
    res.status(200).json(productos);
  } catch (error) { 
    res.status(500).json({mensaje: "Error al obtener el catalogo", detalles: error.mensaje});

  }
};

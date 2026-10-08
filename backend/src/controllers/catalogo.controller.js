import { z } from 'zod';
import { catalogoSchema } from '../validations/catalogo.schema.js';
import * as servicio from '../services/catalogo.service.js';



export const crearItemCatalogo = async (req, res) => {
  try {
    const datosSeguros = catalogoSchema.parse(req.body);
    const nuevoItem = await servicio.crearProducto(datosSeguros);
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
    const productos = await servicio.obtenerCatalogo();
    res.status(200).json(productos);
  } catch (error) { 
    console.error('Error al obtener el catálogo:', error);
    res.status(500).json({ mensaje: "Error al obtener el catálogo" });

  }
};

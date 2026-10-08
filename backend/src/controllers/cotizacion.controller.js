import { z } from 'zod';
import { cotizacionSchema } from '../validations/cotizacion.schema.js';
import { guardarCotizacion, ProductoNoExisteError } from '../services/cotizacion.service.js';



export const crearCotizacion = async (req, res) => {
  try {
    const datosSeguros = cotizacionSchema.parse(req.body);
    const nuevaCotizacion = await guardarCotizacion(datosSeguros);

    res.status(201).json(nuevaCotizacion);
  } catch (error) {
    if (error instanceof ProductoNoExisteError) return res.status(404).json({ mensaje: error.message });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ mensaje: "Error en los datos", detalles: error.issues });
    }
    console.error('Error al crear cotización:', error);
    res.status(500).json({ mensaje: "Error interno al crear cotización" });
  }
};

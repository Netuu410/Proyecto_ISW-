import { crearEquipoService, obtenerEquiposService } from '../services/equipo.service.js';
import { z } from 'zod';

// Validación del cuerpo de la petición con Zod
const equipoSchema = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{0,63}$/, 'El código debe tener de 1 a 64 letras, números, guiones o guiones bajos').optional(),
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  categoria: z.string().trim().min(2, "La categoría es obligatoria"),
  estado: z.enum(["Disponible", "En Uso", "Mantenimiento"]).default("Disponible"),
  precio: z.number().positive("El precio debe ser mayor que cero"),
  // Compatibilidad con clientes anteriores: stock=1 representa esta unidad.
  // Nunca aceptar una cantidad que no se vaya a persistir.
  stock: z.literal(1, { error: 'Cada solicitud crea una unidad; stock solo puede ser 1' }).optional(),
  imagen: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  imagenUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  descripcion: z.string().optional(),
}).refine(data => data.imagen === undefined || data.imagenUrl === undefined || data.imagen === data.imagenUrl, {
  message: 'imagen e imagenUrl deben coincidir si se envían ambas', path: ['imagenUrl'],
});

export const crearEquipo = async (req, res) => {
  try {
    const dataValidada = equipoSchema.parse(req.body);
    const nuevoEquipo = await crearEquipoService(dataValidada);

    res.status(201).json({
      mensaje: 'Equipo registrado exitosamente',
      equipo: nuevoEquipo,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errores: error.issues });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('codigo')) {
      return res.status(409).json({ error: 'Ya existe una unidad con ese código' });
    }
    res.status(500).json({ error: 'Error interno al crear el equipo' });
  }
};

export const obtenerEquipos = async (req, res) => {
  try {
    const equipos = await obtenerEquiposService();
    res.json(equipos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los equipos' });
  }
};

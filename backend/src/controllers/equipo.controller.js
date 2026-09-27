import { crearEquipoService, obtenerEquiposService } from '../services/equipo.service.js';
import { z } from 'zod';

// Validación del cuerpo de la petición con Zod
const equipoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  categoria: z.string().min(2, "La categoría es obligatoria"),
  estado: z.enum(["Disponible", "En Uso", "Mantenimiento"]).default("Disponible"),
  precio: z.number().positive("El precio debe ser un número positivo"),
  stock: z.number().int().min(0).default(1),
  imagen: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  descripcion: z.string().optional(),
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
      return res.status(400).json({ errores: error.errors });
    }
    res.status(500).json({ error: 'Error interno al crear el equipo' });
  }
};

export const obtenerEquipos = async (req, res) => {
  try {
    const equipos = await obtenerEquiposService();
    res.json(equipos);
  } catch (error) {
    console.error('Error detallado de Prisma:', error);
    res.status(500).json({ error: 'Error al obtener los equipos' });
  }
};
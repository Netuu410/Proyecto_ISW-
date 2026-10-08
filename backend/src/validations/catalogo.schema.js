import { z } from 'zod';

export const catalogoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede estar vacío").max(120),
  categoria: z.string().trim().min(1, "La categoría es obligatoria").max(80),
  precioVenta: z.number().positive("El precio debe ser mayor a 0"),
  costoInterno: z.number().positive("El costo debe ser mayor a 0")
});

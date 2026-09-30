import { z } from 'zod';

const imagenSchema = z.string().trim().max(2048).url('Debe ser una URL válida')
  .refine(value => /^https?:\/\//i.test(value), 'La imagen debe usar HTTP o HTTPS');

// Reglas para crear equipos: trim quita espacios en los extremos y strict rechaza campos extra.
export const equipoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(80),
  estado: z.literal('Disponible').default('Disponible'),
  origen: z.enum(['Propio', 'Arrendado']).default('Propio'),
  precio: z.number().finite().positive(),
  stock: z.number().int().min(1).max(2147483647).default(1),
  imagen: imagenSchema.or(z.literal('')).optional(),
  descripcion: z.string().trim().max(2000).optional(),
}).strict();

// El ID llega como texto desde la URL; se valida y se convierte a un entero positivo.
export const equipoIdSchema = z.string().regex(/^[1-9]\d*$/, 'ID inválido')
  .transform(Number).pipe(z.number().int().max(2147483647));

export const averiaSchema = z.object({
  descripcion: z.string().trim().min(10, 'Describe la avería con al menos 10 caracteres').max(2000),
}).strict();

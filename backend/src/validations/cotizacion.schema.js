import { z } from 'zod';

export const cotizacionSchema = z.object({
  clienteId: z.number().int().positive().max(2147483647).optional(),
  clienteNombre: z.string().trim().min(1).max(160).optional(),
  items: z.array(
    z.object({
      equipoId: z.number().int().positive().max(2147483647),
      cantidad: z.number().int().positive().max(2147483647)
    })
  ).min(1, "La cotización debe tener al menos un ítem").max(100)
}).refine(data => data.clienteId || data.clienteNombre, 'Indica el cliente')
  .refine(data => new Set(data.items.map(item => item.equipoId)).size === data.items.length, 'No repitas productos; ajusta su cantidad');

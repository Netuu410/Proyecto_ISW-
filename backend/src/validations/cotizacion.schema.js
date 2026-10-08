import { z } from 'zod';

export const cotizacionSchema = z.object({
  clienteId: z.number().int().positive().max(2147483647),
  items: z.array(
    z.object({
      catalogoItemId: z.number().int().positive().max(2147483647),
      cantidad: z.number().int().positive().max(2147483647)
    })
  ).min(1, "La cotización debe tener al menos un ítem")
});

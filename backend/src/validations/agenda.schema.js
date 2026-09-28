import { z } from 'zod';

const id = z.number().int().positive().max(2147483647);
const instante = z.string().datetime({ offset: true }).transform(value => new Date(value));
const texto = max => z.string().trim().min(1, 'Este dato es obligatorio').max(max);

const intervaloValido = (data, ctx) => {
  if (data.inicio >= data.fin) {
    ctx.addIssue({ code: 'custom', path: ['fin'], message: 'El término debe ser posterior al inicio' });
  }
};

const recursos = {
  inicio: instante,
  fin: instante,
  recintoId: id,
  equipos: z.array(z.object({ equipoId: id, cantidad: id }).strict()).max(100).default([]),
};
const equiposUnicos = (data, ctx) => {
  if (new Set(data.equipos.map(equipo => equipo.equipoId)).size !== data.equipos.length) {
    ctx.addIssue({ code: 'custom', path: ['equipos'], message: 'No repitas un equipo; indica su cantidad' });
  }
};

export const disponibilidadSchema = z.object(recursos).strict()
  .superRefine(intervaloValido).superRefine(equiposUnicos);

export const actividadSchema = z.object({
  ...recursos,
  tipo: z.enum(['EVENTO', 'VISITA_TECNICA']),
  nombre: texto(160),
  clienteNombre: texto(160),
}).strict().superRefine(intervaloValido).superRefine(equiposUnicos);

export const consultaAgendaSchema = z.object({
  desde: instante,
  hasta: instante,
  tipo: z.enum(['EVENTO', 'VISITA_TECNICA']).optional(),
}).strict().superRefine((data, ctx) => {
  const duracion = data.hasta - data.desde;
  if (duracion <= 0 || duracion > 93 * 24 * 60 * 60 * 1000) {
    ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'Consulta un intervalo mayor a cero y de hasta 93 días' });
  }
});

export const agendaIdSchema = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(id);
export const recintoSchema = z.object({ nombre: texto(120), direccion: texto(240) }).strict();

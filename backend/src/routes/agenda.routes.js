import { Router } from 'express';
import { z } from 'zod';
import { actividadSchema, disponibilidadSchema, consultaAgendaSchema, agendaIdSchema, recintoSchema } from '../validations/agenda.schema.js';
import { ErrorAgenda, listarActividades, obtenerActividad, comprobarDisponibilidad,
  crearActividad, listarRecintos, crearRecinto } from '../services/agenda.service.js';

const router = Router();
const atender = funcion => async (req, res) => {
  try { await funcion(req, res); }
  catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ mensaje: 'Revisa los datos de la agenda', errores: error.issues });
    if (error instanceof ErrorAgenda) return res.status(error.status).json({ mensaje: error.message, conflictos: error.conflictos });
    console.error('Error de agenda:', error);
    return res.status(500).json({ mensaje: 'No se pudo completar la operación de agenda' });
  }
};

router.get('/recintos', atender(async (_req, res) => res.json(await listarRecintos())));
router.post('/recintos', atender(async (req, res) => res.status(201).json(await crearRecinto(recintoSchema.parse(req.body)))));
router.post('/disponibilidad', atender(async (req, res) => res.json(await comprobarDisponibilidad(disponibilidadSchema.parse(req.body)))));
router.get('/actividades', atender(async (req, res) => res.json(await listarActividades(consultaAgendaSchema.parse(req.query)))));
router.get('/actividades/:id', atender(async (req, res) => res.json(await obtenerActividad(agendaIdSchema.parse(req.params.id)))));
router.post('/actividades', atender(async (req, res) => res.status(201).json(await crearActividad(actividadSchema.parse(req.body)))));

export default router;

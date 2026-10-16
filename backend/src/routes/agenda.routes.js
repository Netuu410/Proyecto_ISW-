import { Router } from 'express';
import { listarActividades, obtenerActividad, comprobarDisponibilidad,
  crearActividad, listarRecintos, crearRecinto, cancelarActividad } from '../controllers/agenda.controller.js';

const router = Router();

router.get('/recintos', listarRecintos);
router.post('/recintos', crearRecinto);
router.post('/disponibilidad', comprobarDisponibilidad);
router.get('/actividades', listarActividades);
router.get('/actividades/:id', obtenerActividad);
router.post('/actividades', crearActividad);
router.patch('/actividades/:id/cancelar', cancelarActividad);

export default router;

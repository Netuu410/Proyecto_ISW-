import { Router } from 'express';
import { crearEquipo, obtenerEquipos, reportarAveria, obtenerAlertas, registrarReparacion } from '../controllers/equipo.controller.js';

const router = Router();

router.get('/', obtenerEquipos);
router.post('/', crearEquipo);
router.get('/alertas', obtenerAlertas);
router.post('/:id/averias', reportarAveria);
router.post('/:id/reparaciones', registrarReparacion);

export default router;

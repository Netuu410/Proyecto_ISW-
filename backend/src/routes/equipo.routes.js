import { Router } from 'express';
import { crearEquipo, obtenerEquipos, reportarAveria, obtenerAlertas } from '../controllers/equipo.controller.js';

const router = Router();

router.get('/', obtenerEquipos);
router.post('/', crearEquipo);
router.get('/alertas', obtenerAlertas);
router.post('/:id/averias', reportarAveria);

export default router;

import { Router } from 'express';
import { crearEquipo, obtenerEquipos } from '../controllers/equipo.controller.js';

const router = Router();

router.get('/', obtenerEquipos);
router.post('/', crearEquipo);

export default router;
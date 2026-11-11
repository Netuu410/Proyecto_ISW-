import { Router } from 'express';

import {
  crearEvaluacion,
  obtenerHistorial,
  obtenerEventosFinalizados
} from '../controllers/evaluacion.controller.js';

const router = Router();

// Registrar una evaluación
router.post('/', crearEvaluacion);

// Obtener eventos finalizados
router.get('/eventos-finalizados', obtenerEventosFinalizados);

// Consultar historial de un colaborador
router.get('/colaborador/:colaboradorId', obtenerHistorial);

export default router;

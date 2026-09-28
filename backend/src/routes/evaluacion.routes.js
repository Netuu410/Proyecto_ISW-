import { Router } from 'express';
import { crearEvaluacion } from '../controllers/evaluacion.controller.js';

const router = Router();

router.post('/', crearEvaluacion);

export default router;
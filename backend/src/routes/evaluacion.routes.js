import { Router } from 'express';
import { crearEvaluacion } from '../controllers/evaluacion.controller.js';
import { autorizarRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', autorizarRoles('Administrador', 'Gestor_Eventos'), crearEvaluacion);

export default router;

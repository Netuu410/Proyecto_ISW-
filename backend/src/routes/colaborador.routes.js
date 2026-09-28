import { Router } from 'express';
import { obtenerColaboradores } from '../controllers/colaborador.controller.js';

const router = Router();

router.get('/', obtenerColaboradores);

export default router;
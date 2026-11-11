
import { Router } from 'express';
import {
  obtenerColaboradores,
  crearColaborador
} from '../controllers/colaborador.controller.js';

const router = Router();

// Listar colaboradores
router.get('/', obtenerColaboradores);

// Registrar un colaborador
router.post('/', crearColaborador);

export default router;

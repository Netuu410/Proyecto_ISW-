import { Router } from 'express';
import { crearEquipo, obtenerEquipos, reportarAveria, obtenerAlertas, registrarReparacion } from '../controllers/equipo.controller.js';
import { autorizarRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', obtenerEquipos);
router.post('/', autorizarRoles('Administrador', 'Encargado_Inventario'), crearEquipo);
router.get('/alertas', autorizarRoles('Administrador', 'Encargado_Inventario'), obtenerAlertas);
router.post('/:id/averias', autorizarRoles('Administrador', 'Encargado_Inventario'), reportarAveria);
router.post('/:id/reparaciones', autorizarRoles('Administrador', 'Encargado_Inventario'), registrarReparacion);

export default router;

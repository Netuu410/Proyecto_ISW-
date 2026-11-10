import { Router } from 'express';
import { crearCotizacion, obtenerCotizaciones } from '../controllers/cotizacion.controller.js';
import { autorizarRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Aquí conectamos la petición con toda tu matemática de la ganancia neta
router.post('/', autorizarRoles('Administrador', 'Gestor_Eventos'), crearCotizacion);
router.get('/', autorizarRoles('Administrador', 'Gestor_Eventos'), obtenerCotizaciones);

export default router;

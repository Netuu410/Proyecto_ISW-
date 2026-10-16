import { Router } from 'express';
import { crearCotizacion, obtenerCotizaciones } from '../controllers/cotizacion.controller.js';

const router = Router();

// Aquí conectamos la petición con toda tu matemática de la ganancia neta
router.post('/', crearCotizacion);
router.get('/', obtenerCotizaciones);

export default router;

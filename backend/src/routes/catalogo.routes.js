import { Router } from 'express';
import { crearItemCatalogo } from '../controllers/catalogo.controller.js';

const router = Router();

// Cuando alguien envíe un POST a esta ruta, se ejecuta tu controlador
router.post('/', crearItemCatalogo);

export default router;
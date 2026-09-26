import { Router } from 'express';

import { crearItemCatalogo, obtenerCatalogo } from '../controllers/catalogo.controller.js';

const router = Router();


router.get('/', obtenerCatalogo);


router.post('/', crearItemCatalogo);

export default router;
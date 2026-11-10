import { Router } from 'express';

import { crearItemCatalogo, obtenerCatalogo } from '../controllers/catalogo.controller.js';
import { autorizarRoles } from '../middleware/auth.middleware.js';

const router = Router();


router.get('/', obtenerCatalogo);


router.post('/', autorizarRoles('Administrador', 'Encargado_Inventario'), crearItemCatalogo);

export default router;

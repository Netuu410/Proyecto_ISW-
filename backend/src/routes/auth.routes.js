import { Router } from 'express';
import { crearAuthControlador } from '../controllers/auth.controller.js';
import { exigirSesion, limitarIntentos } from '../middleware/auth.middleware.js';

export function crearAuthRoutes(db) {
    const router = Router();
    const controlador = crearAuthControlador(db);
    const limite = limitarIntentos();
    router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.post('/registro', limite, controlador.registrarUsuario);
    router.post('/login', limite, controlador.iniciarSesion);
    router.post('/logout', controlador.cerrarSesion);
    router.get('/sesion', exigirSesion(db), controlador.obtenerSesion);
    return router;
}

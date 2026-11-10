import { obtenerUsuarioSesionService, DURACION_SESION_MS } from '../services/sesion.service.js';

export const COOKIE_SESION = 'nes_sesion';
export const opcionesCookie = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
});

export function leerToken(req) {
    const cookie = (req.headers.cookie || '').split(';')
        .map(parte => parte.trim()).find(parte => parte.startsWith(`${COOKIE_SESION}=`));
    return cookie?.slice(COOKIE_SESION.length + 1);
}

export function guardarCookie(res, token) {
    res.cookie(COOKIE_SESION, token, { ...opcionesCookie(), maxAge: DURACION_SESION_MS });
}

export function borrarCookie(res) {
    res.clearCookie(COOKIE_SESION, opcionesCookie());
}

export function exigirSesion(db) {
    return async (req, res, next) => {
        try {
            const usuario = await obtenerUsuarioSesionService(leerToken(req), db);
            if (!usuario) {
                borrarCookie(res);
                return res.status(401).json({ mensaje: 'Inicia sesión para continuar' });
            }
            req.usuario = usuario;
            res.set('Cache-Control', 'no-store');
            next();
        } catch (error) { next(error); }
    };
}

export function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
        }
        next();
    };
}

// Un formulario de otro sitio no puede enviar este encabezado sin un preflight CORS.
export function protegerSolicitudes(req, res, next) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)
        && req.get('X-Requested-With') !== 'NES-Eventos') {
        return res.status(403).json({ mensaje: 'Solicitud no permitida' });
    }
    next();
}

export function limitarIntentos({ maximo = 30, ventanaMs = 15 * 60 * 1000 } = {}) {
    const intentos = new Map();
    return (req, res, next) => {
        const ahora = Date.now();
        for (const [ip, entrada] of intentos) {
            if (entrada.hasta <= ahora) intentos.delete(ip);
        }
        const clave = req.ip;
        let entrada = intentos.get(clave);
        if (!entrada) {
            if (intentos.size >= 10000) {
                return res.status(429).json({ mensaje: 'Demasiados intentos. Inténtalo más tarde.' });
            }
            entrada = { cantidad: 0, hasta: ahora + ventanaMs };
            intentos.set(clave, entrada);
        }
        if (++entrada.cantidad > maximo) {
            res.set('Retry-After', String(Math.ceil((entrada.hasta - ahora) / 1000)));
            return res.status(429).json({ mensaje: 'Demasiados intentos. Inténtalo más tarde.' });
        }
        next();
    };
}

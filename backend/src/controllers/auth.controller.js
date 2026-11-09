import { z } from 'zod';
import { prisma } from '../database.js';
import { registrarUsuarioService, verificarCredencialesService } from '../services/auth.service.js';
import { crearSesionService, eliminarSesionService } from '../services/sesion.service.js';
import { registroSchema, loginSchema } from '../validations/auth.schema.js';
import { leerToken, guardarCookie, borrarCookie } from '../middleware/auth.middleware.js';

export function crearAuthControlador(db = prisma) {
    return {
        async registrarUsuario(req, res, next) {
            try {
                const datos = registroSchema.parse(req.body);
                const usuario = await registrarUsuarioService(datos, db);
                return res.status(201).json({ mensaje: 'Usuario registrado correctamente', usuario });
            } catch (error) { return responderError(error, res, next); }
        },

        async iniciarSesion(req, res, next) {
            try {
                const datos = loginSchema.parse(req.body);
                const usuario = await verificarCredencialesService(datos, db);
                const token = await crearSesionService(usuario.id, db);
                await eliminarSesionService(leerToken(req), db);
                guardarCookie(res, token);
                return res.json({ mensaje: 'Sesión iniciada', usuario });
            } catch (error) { return responderError(error, res, next); }
        },

        async cerrarSesion(req, res, next) {
            try {
                await eliminarSesionService(leerToken(req), db);
                borrarCookie(res);
                return res.status(204).end();
            } catch (error) { next(error); }
        },

        obtenerSesion(req, res) {
            return res.json({ usuario: req.usuario });
        },
    };
}

function responderError(error, res, next) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            mensaje: 'Datos de autenticación inválidos',
            errores: error.issues.map(issue => ({ campo: issue.path.join('.'), mensaje: issue.message })),
        });
    }
    if (error.message === 'EMAIL_YA_REGISTRADO') {
        return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    if (error.message === 'CREDENCIALES_INVALIDAS') {
        return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }
    return next(error);
}

export const { registrarUsuario, iniciarSesion, cerrarSesion, obtenerSesion } = crearAuthControlador();

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../database.js';
import { usuarioPublico } from './auth.service.js';

export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const hashToken = token => createHash('sha256').update(token).digest('hex');
const tokenValido = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export async function crearSesionService(usuarioId, db = prisma) {
    const token = randomBytes(32).toString('hex');
    const ahora = new Date();
    const expiresAt = new Date(ahora.getTime() + DURACION_SESION_MS);
    await db.sesionUsuario.deleteMany({ where: { expiresAt: { lte: ahora } } });
    await db.sesionUsuario.create({ data: { id: hashToken(token), usuarioId, expiresAt } });
    return token;
}

export async function obtenerUsuarioSesionService(token, db = prisma) {
    if (!tokenValido(token)) return null;
    const sesion = await db.sesionUsuario.findUnique({
        where: { id: hashToken(token) },
        include: { usuario: { select: { ...usuarioPublico, activo: true } } },
    });
    if (!sesion || sesion.expiresAt <= new Date() || !sesion.usuario.activo) return null;
    const { activo: _activo, ...usuario } = sesion.usuario;
    return usuario;
}

export async function eliminarSesionService(token, db = prisma) {
    if (tokenValido(token)) {
        await db.sesionUsuario.deleteMany({ where: { id: hashToken(token) } });
    }
}

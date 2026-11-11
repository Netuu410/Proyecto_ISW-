import { randomBytes } from 'node:crypto';
import { prisma } from '../database.js';
import { crearHash, verificarPassword } from '../utils/password.js';

export const usuarioPublico = { id: true, nombre: true, email: true, rol: true };
// También calculamos scrypt cuando el correo no existe.
const hashFicticio = crearHash(randomBytes(32).toString('hex'));

export async function registrarUsuarioService({ nombre, email, password }, db = prisma) {
    const passwordHash = await crearHash(password);

    try {
        const usuario = await db.usuario.create({
            data: {
                nombre,
                email,
                passwordHash,
            },
            select: usuarioPublico,
        });
        
        return usuario;
    } catch (error) {
        if (error.code === 'P2002') {
            throw new Error('EMAIL_YA_REGISTRADO');
        }

        throw error;
    }
}

export async function verificarCredencialesService({ email, password }, db = prisma) {
    const usuario = await db.usuario.findUnique({ where: { email } });
    const coincide = await verificarPassword(password, usuario?.passwordHash ?? await hashFicticio);

    if (!usuario || !coincide || !usuario.activo) {
        throw new Error('CREDENCIALES_INVALIDAS');
    }

    return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

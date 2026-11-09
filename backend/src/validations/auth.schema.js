import { z } from 'zod';

const emailSchema = z.string()
    .trim()
    .toLowerCase()
    .email('Ingresa un correo válido')
    .max(254);

export const registroSchema = z.object({
    nombre: z.string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(120),

    email: emailSchema,

    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128),
}).strict();

export const loginSchema = z.object({
    email: emailSchema,

    password: z.string()
        .min(1, 'La contraseña es obligatoria')
        .max(128),
}).strict();


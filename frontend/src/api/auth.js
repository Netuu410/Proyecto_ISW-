import { solicitar } from './client.js';

export const registrarUsuario = datos => solicitar('/auth/registro', { method: 'POST', body: datos });
export const iniciarSesion = datos => solicitar('/auth/login', { method: 'POST', body: datos });
export const cerrarSesion = () => solicitar('/auth/logout', { method: 'POST' });
export const obtenerSesion = opciones => solicitar('/auth/sesion', opciones);

import { solicitar } from './client.js';
export const obtenerCatalogo = (opciones) => solicitar('/catalogo', opciones);
export const crearProducto = (body, opciones) => solicitar('/catalogo', { ...opciones, method: 'POST', body });

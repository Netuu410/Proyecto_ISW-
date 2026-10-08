import { solicitar } from './client.js';
export const crearCotizacion = (body, opciones) => solicitar('/cotizaciones', { ...opciones, method: 'POST', body });

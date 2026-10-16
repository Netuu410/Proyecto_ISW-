import { solicitar } from './client.js';
export const obtenerCotizaciones = (opciones) => solicitar('/cotizaciones', opciones);
export const crearCotizacion = (body, opciones) => solicitar('/cotizaciones', { ...opciones, method: 'POST', body });

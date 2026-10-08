import { solicitar } from './client.js';
export const obtenerEquipos = (opciones) => solicitar('/equipos', opciones);
export const obtenerAlertas = (opciones) => solicitar('/equipos/alertas', opciones);
export const crearEquipo = (body, opciones) => solicitar('/equipos', { ...opciones, method: 'POST', body });
export const reportarAveriaEquipo = (id, body, opciones) => solicitar(`/equipos/${id}/averias`, { ...opciones, method: 'POST', body });

import { solicitar } from './client.js';
export const obtenerActividades = (params, opciones) => solicitar(`/agenda/actividades?${params}`, opciones);
export const obtenerRecintos = (opciones) => solicitar('/agenda/recintos', opciones);
export const comprobarDisponibilidad = (body, opciones) => solicitar('/agenda/disponibilidad', { ...opciones, method: 'POST', body });
export const crearActividad = (body, opciones) => solicitar('/agenda/actividades', { ...opciones, method: 'POST', body });
export const crearRecinto = (body, opciones) => solicitar('/agenda/recintos', { ...opciones, method: 'POST', body });

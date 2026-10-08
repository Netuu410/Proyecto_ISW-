import { solicitar } from './client.js';
export const obtenerColaboradores = (opciones) => solicitar('/colaboradores', opciones);

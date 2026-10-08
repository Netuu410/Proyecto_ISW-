// Compatibilidad para consumidores antiguos: el transporte vive en api/client.js.
import { solicitar } from '../api/client.js';
export const agendaApi = (ruta, opciones = {}) => solicitar(ruta, { ...opciones, method: opciones.body !== undefined ? 'POST' : 'GET' });

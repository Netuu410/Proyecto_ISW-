import { solicitar } from './client.js';

// Obtener todos los colaboradores
export const obtenerColaboradores = (opciones) =>
  solicitar('/colaboradores', opciones);

// Crear un nuevo colaborador
export const crearColaborador = (datos) =>
  solicitar('/colaboradores', {
    method: 'POST',
    body: datos
  });

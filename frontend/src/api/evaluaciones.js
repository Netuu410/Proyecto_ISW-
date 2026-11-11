import { solicitar } from './client.js';

// Registrar evaluación
export const crearEvaluacion = (datos) =>
  solicitar('/evaluaciones', {
    method: 'POST',
    body: datos
  });

// Consultar historial del colaborador
export const obtenerHistorial = (colaboradorId) =>
  solicitar(`/evaluaciones/colaborador/${colaboradorId}`);

// Obtener solamente eventos finalizados
export const obtenerEventosFinalizados = () =>
  solicitar('/evaluaciones/eventos-finalizados');

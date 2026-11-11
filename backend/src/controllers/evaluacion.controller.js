import { z } from 'zod';
import {
  crearEvaluacionService,
  obtenerHistorialService,
  obtenerEventosFinalizadosService
} from '../services/evaluacion.service.js';

const evaluacionSchema = z.object({
  eventoId: z.number().int().positive('El evento debe ser válido'),
  colaboradorId: z.number().int().positive('El colaborador debe ser válido'),
  estrellas: z
    .number()
    .int('La calificación debe ser un número entero')
    .min(1, 'La calificación mínima es 1 estrella')
    .max(5, 'La calificación máxima es 5 estrellas'),
  notaInterna: z.string().min(1, 'La nota interna es obligatoria'),
});

export const crearEvaluacion = async (req, res) => {
  try {
    const datosValidados = evaluacionSchema.parse(req.body);

    const resultado = await crearEvaluacionService(datosValidados);

    res.status(201).json({
      mensaje: 'Evaluación registrada correctamente',
      ...resultado,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        mensaje: 'Datos de evaluación inválidos',
        errores: error.issues,
      });
    }

    if (error.message === 'EVENTO_NO_ENCONTRADO') {
      return res.status(404).json({
        mensaje: 'El evento no existe',
      });
    }

    if (error.message === 'EVENTO_NO_FINALIZADO') {
      return res.status(400).json({
        mensaje: 'Solo se pueden evaluar eventos finalizados',
      });
    }

    if (error.message === 'COLABORADOR_NO_ENCONTRADO') {
      return res.status(404).json({
        mensaje: 'El colaborador no existe',
      });
    }

    console.error('Error al registrar evaluación:', error);

    res.status(500).json({
      mensaje: 'Error interno al registrar la evaluación',
    });
  }
};

export const obtenerHistorial = async (req, res) => {
  try {
    const colaboradorId = Number(req.params.colaboradorId);

    if (!Number.isInteger(colaboradorId) || colaboradorId <= 0) {
      return res.status(400).json({
        mensaje: 'ID del colaborador inválido'
      });
    }

    const evaluaciones = await obtenerHistorialService(colaboradorId);

    return res.status(200).json(evaluaciones);

  } catch (error) {
    if (error.message === 'COLABORADOR_NO_ENCONTRADO') {
      return res.status(404).json({
        mensaje: 'El colaborador no existe'
      });
    }

    console.error('Error al obtener historial:', error);

    return res.status(500).json({
      mensaje: 'Error interno al obtener el historial'
    });
  }
};
export const obtenerEventosFinalizados = async (req, res) => {
  try {
    const eventos = await obtenerEventosFinalizadosService();

    return res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al obtener eventos:', error);

    return res.status(500).json({
      mensaje: 'Error interno al obtener eventos finalizados'
    });
  }
};

import { z } from 'zod';
import { crearEvaluacionService } from '../services/evaluacion.service.js';

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
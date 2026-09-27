import { prisma } from '../database.js';

export const crearEvaluacionService = async ({
  eventoId,
  colaboradorId,
  estrellas,
  notaInterna,
}) => {

  // 1. Buscar el evento
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
  });

  if (!evento) {
    throw new Error('EVENTO_NO_ENCONTRADO');
  }

  // 2. Regla de negocio:
  // solo se puede evaluar un evento Finalizado
  if (evento.estado !== 'Finalizado') {
    throw new Error('EVENTO_NO_FINALIZADO');
  }

  // 3. Comprobar que el colaborador exista
  const colaborador = await prisma.colaborador.findUnique({
    where: { id: colaboradorId },
  });

  if (!colaborador) {
    throw new Error('COLABORADOR_NO_ENCONTRADO');
  }

  // 4. Guardar la evaluación
  const evaluacion = await prisma.evaluacion.create({
    data: {
      eventoId,
      colaboradorId,
      estrellas,
      notaInterna: notaInterna || null,
    },
  });

  // 5. Calcular el nuevo promedio del colaborador
  const estadisticas = await prisma.evaluacion.aggregate({
    where: { colaboradorId },
    _avg: {
      estrellas: true,
    },
    _count: {
      estrellas: true,
    },
  });

  return {
    evaluacion,
    promedioEstrellas: estadisticas._avg.estrellas ?? 0,
    totalEvaluaciones: estadisticas._count.estrellas,
  };
};
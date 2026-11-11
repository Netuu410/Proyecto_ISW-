
import { prisma } from '../database.js';

// Registrar una evaluación
export const crearEvaluacionService = async ({
  eventoId,
  colaboradorId,
  estrellas,
  notaInterna,
}) => {

  // Buscar el evento
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
  });

  if (!evento) {
    throw new Error('EVENTO_NO_ENCONTRADO');
  }

  // Solo evaluar eventos finalizados
  if (evento.estado !== 'Finalizado') {
    throw new Error('EVENTO_NO_FINALIZADO');
  }

  // Verificar colaborador
  const colaborador = await prisma.colaborador.findUnique({
    where: { id: colaboradorId },
  });

  if (!colaborador) {
    throw new Error('COLABORADOR_NO_ENCONTRADO');
  }

  // Guardar evaluación
  const evaluacion = await prisma.evaluacion.create({
    data: {
      eventoId,
      colaboradorId,
      estrellas,
      notaInterna,
    },
  });

  // Calcular nuevo promedio
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

// Consultar historial de evaluaciones
export const obtenerHistorialService = async (colaboradorId) => {

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: colaboradorId },
  });

  if (!colaborador) {
    throw new Error('COLABORADOR_NO_ENCONTRADO');
  }

  const evaluaciones = await prisma.evaluacion.findMany({
    where: { colaboradorId },
    include: {
      evento: {
        select: {
          id: true,
          nombre: true,
          fecha: true,
        },
      },
    },
    orderBy: {
      fecha: 'desc',
    },
  });

  return evaluaciones;
};

// Obtener eventos finalizados
export const obtenerEventosFinalizadosService = async () => {

  const eventos = await prisma.evento.findMany({
    where: {
      estado: 'Finalizado',
    },
    select: {
      id: true,
      nombre: true,
      fecha: true,
    },
    orderBy: {
      fecha: 'desc',
    },
  });

  return eventos;
};

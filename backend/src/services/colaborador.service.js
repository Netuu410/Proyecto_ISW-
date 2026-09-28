import { prisma } from '../database.js';

export const obtenerColaboradoresService = async () => {
  const colaboradores = await prisma.colaborador.findMany({
    include: {
      evaluaciones: true,
    },
    orderBy: {
      id: 'desc',
    },
  });

  return colaboradores.map((colaborador) => {
    const totalEvaluaciones = colaborador.evaluaciones.length;

    const promedioEstrellas =
      totalEvaluaciones > 0
        ? colaborador.evaluaciones.reduce(
            (suma, evaluacion) => suma + evaluacion.estrellas,
            0
          ) / totalEvaluaciones
        : 0;

    return {
      ...colaborador,
      promedioEstrellas,
      totalEvaluaciones,
    };
  });
};
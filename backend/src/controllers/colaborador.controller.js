import { obtenerColaboradoresService } from '../services/colaborador.service.js';

export const obtenerColaboradores = async (req, res) => {
  try {
    const colaboradores = await obtenerColaboradoresService();

    res.status(200).json(colaboradores);
  } catch (error) {
    console.error('Error al obtener colaboradores:', error);

    res.status(500).json({
      mensaje: 'Error interno al obtener los colaboradores',
    });
  }
};
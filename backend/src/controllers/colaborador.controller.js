import {
  obtenerColaboradoresService,
  crearColaboradorService
} from '../services/colaborador.service.js';

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

export const crearColaborador = async (req, res) => {
  try {
    const { nombre, tipo } = req.body;

    // Validar datos obligatorios
    if (
      typeof nombre !== 'string' ||
      !nombre.trim() ||
      typeof tipo !== 'string' ||
      !tipo.trim()
    ) {
      return res.status(400).json({
        mensaje: 'Nombre y tipo son obligatorios'
      });
    }

    // Guardar colaborador en la base de datos
    const colaborador = await crearColaboradorService({
      nombre: nombre.trim(),
      tipo: tipo.trim()
    });

    return res.status(201).json(colaborador);

  } catch (error) {
    console.error('Error al crear colaborador:', error);

    return res.status(500).json({
      mensaje: 'Error interno al crear colaborador'
    });
  }
};

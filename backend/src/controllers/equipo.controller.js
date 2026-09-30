import { z } from 'zod';
import { crearEquipoService, obtenerEquiposService, reportarAveriaService,
  obtenerAlertasService, ErrorEquipo } from '../services/equipo.service.js';
import { equipoSchema, equipoIdSchema, averiaSchema } from '../validations/equipo.schema.js';

// Traduce errores de validación, de negocio o internos a respuestas HTTP.
const responderError = (res, error) => {
  if (error instanceof z.ZodError) return res.status(400).json({ errores: error.issues });
  if (error instanceof ErrorEquipo) return res.status(error.status).json({ error: error.message });
  console.error('Error de inventario:', error);
  return res.status(500).json({ error: 'Error interno al procesar el inventario' });
};
export const crearEquipo = async (req, res) => {
  try {
    const equipo = await crearEquipoService(equipoSchema.parse(req.body));
    res.status(201).json({ mensaje: 'Equipo registrado exitosamente', equipo });
  } catch (error) { responderError(res, error); }
};
export const obtenerEquipos = async (req, res) => {
  try { res.json(await obtenerEquiposService()); }
  catch (error) { responderError(res, error); }
};
export const reportarAveria = async (req, res) => {
  try {
    // El ID viene de la URL y la descripción del cuerpo; parse valida antes de llamar al servicio.
    const id = equipoIdSchema.parse(req.params.id);
    const data = averiaSchema.parse(req.body);
    res.status(201).json(await reportarAveriaService(id, data));
  } catch (error) { responderError(res, error); }
};
export const obtenerAlertas = async (req, res) => {
  try { res.json(await obtenerAlertasService()); }
  catch (error) { responderError(res, error); }
};

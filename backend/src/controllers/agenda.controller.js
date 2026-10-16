import { z } from 'zod';
import { ErrorAgenda, listarActividades as listarActividadesService,
  obtenerActividad as obtenerActividadService, comprobarDisponibilidad as comprobarDisponibilidadService,
  crearActividad as crearActividadService, listarRecintos as listarRecintosService,
  crearRecinto as crearRecintoService, cancelarActividad as cancelarActividadService
} from '../services/agenda.service.js';
import { actividadSchema, disponibilidadSchema, consultaAgendaSchema,
  agendaIdSchema, recintoSchema, cancelacionSchema
} from '../validations/agenda.schema.js';

export const cancelarActividad = async (req, res) => {
  try {
    const id = agendaIdSchema.parse(req.params.id);
    const datos = cancelacionSchema.parse(req.body);

    const comprobante = req.file ? {
      nombre: req.file.originalname,
      tipo: req.file.mimetype,
      contenido: req.file.buffer,
    } : null;

    const resultado = await cancelarActividadService(id, {
      ...datos,
      comprobante,
    });

    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
};

const responderError = (res, error) => {
  if (error instanceof z.ZodError) return res.status(400).json({ mensaje: 'Revisa los datos de la agenda', errores: error.issues });
  if (error instanceof ErrorAgenda) return res.status(error.status).json({ mensaje: error.message, conflictos: error.conflictos });
  console.error('Error de agenda:', error);
  return res.status(500).json({ mensaje: 'No se pudo completar la operación de agenda' });
};

export const listarRecintos = async (_req, res) => {
  try {
    res.json(await listarRecintosService());
  } catch (error) { responderError(res, error); }
};

export const crearRecinto = async (req, res) => {
  try {
    const datos = recintoSchema.parse(req.body);
    res.status(201).json(await crearRecintoService(datos));
  } catch (error) { responderError(res, error); }
};

export const comprobarDisponibilidad = async (req, res) => {
  try {
    const datos = disponibilidadSchema.parse(req.body);
    res.json(await comprobarDisponibilidadService(datos));
  } catch (error) { responderError(res, error); }
};

export const listarActividades = async (req, res) => {
  try {
    const consulta = consultaAgendaSchema.parse(req.query);
    res.json(await listarActividadesService(consulta));
  } catch (error) { responderError(res, error); }
};

export const obtenerActividad = async (req, res) => {
  try {
    const id = agendaIdSchema.parse(req.params.id);
    res.json(await obtenerActividadService(id));
  } catch (error) { responderError(res, error); }
};

export const crearActividad = async (req, res) => {
  try {
    const datos = actividadSchema.parse(req.body);
    res.status(201).json(await crearActividadService(datos));
  } catch (error) { responderError(res, error); }
};

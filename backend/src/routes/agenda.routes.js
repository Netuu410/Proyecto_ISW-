import { Router } from 'express';
import multer from 'multer';
import { listarActividades, obtenerActividad, comprobarDisponibilidad,
  crearActividad, listarRecintos, crearRecinto, cancelarActividad } from '../controllers/agenda.controller.js';

const router = Router();
const formatosComprobante = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 8 * 1024},

  fileFilter: (_req, archivo, aceptar) => {
    const extension = archivo.originalname
      .slice(archivo.originalname.lastIndexOf('.'))
      .toLowerCase();

    const tipoEsperado = formatosComprobante.get(extension);

    if (!tipoEsperado || tipoEsperado !== archivo.mimetype) {
      return aceptar(new Error(
        'Adjunta un archivo JPG, JPEG, PNG, WEBP, PDF, DOC o DOCX.'
      ));
    }

    aceptar(null, true);}
  });

router.get('/recintos', listarRecintos);
router.post('/recintos', crearRecinto);
router.post('/disponibilidad', comprobarDisponibilidad);
router.get('/actividades', listarActividades);
router.get('/actividades/:id', obtenerActividad);
router.post('/actividades', crearActividad);
router.patch('/actividades/:id/cancelar', (req, res, next) => {
  upload.single('comprobante')(req, res, error => {
    if (error) {
      const mensajes = {
        LIMIT_FILE_SIZE: 'El comprobante no puede superar 10 MB.',
        LIMIT_FILE_COUNT: 'Solo puedes adjuntar un comprobante.',
        LIMIT_UNEXPECTED_FILE: 'Adjunta un solo archivo en el campo comprobante.',
        LIMIT_FIELD_COUNT: 'Solo se admite el campo de texto motivo.',
        LIMIT_FIELD_VALUE: 'El motivo supera el tamaño permitido.',
      };

      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        mensaje: mensajes[error.code] || error.message,
      });
    }

    return cancelarActividad(req, res, next);
  });
});

export default router;

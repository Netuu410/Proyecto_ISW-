import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join } from 'node:path';
import catalogoRoutes from './routes/catalogo.routes.js';
import cotizacionRoutes from './routes/cotizacion.routes.js';
import equipoRoutes from './routes/equipo.routes.js';
import evaluacionRoutes from './routes/evaluacion.routes.js';
import colaboradorRoutes from './routes/colaborador.routes.js';
import agendaRoutes from './routes/agenda.routes.js';

export function crearApp({
  servirFrontend = process.env.NODE_ENV === 'production',
  frontendDir = fileURLToPath(new URL('../../frontend/dist/', import.meta.url)),
} = {}) {
  const app = express();
  // CORS no reemplaza autenticación ni autorización.
  const origenes = (process.env.CORS_ORIGINS || '').split(',').map(valor => valor.trim()).filter(Boolean);
  app.use(cors({ origin: origenes }));
  app.use(express.json());

  app.use('/api/equipos', equipoRoutes);
  app.use('/api/catalogo', catalogoRoutes);
  app.use('/api/cotizaciones', cotizacionRoutes);
  app.use('/api/evaluaciones', evaluacionRoutes);
  app.use('/api/colaboradores', colaboradorRoutes);
  app.use('/api/agenda', agendaRoutes);
  // Nunca convertir un error de ruta API en el HTML de React.
  app.use('/api', (_req, res) => res.status(404).json({ mensaje: 'Ruta API no encontrada' }));

  if (servirFrontend) {
    const index = join(frontendDir, 'index.html');
    if (!existsSync(index)) {
      throw new Error('Falta frontend/dist/index.html. Ejecuta npm run build en frontend antes de iniciar producción.');
    }
    app.use(express.static(frontendDir, { index: false }));
    // Express 5: el comodín con nombre entre llaves incluye también la raíz.
    app.get('/{*ruta}', (req, res, next) => {
      if (req.path.startsWith('/assets/') || req.path.split('/').some(segmento => segmento.startsWith('.')) || extname(req.path) || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(index);
    });
  }
  app.use((_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
  return app;
}

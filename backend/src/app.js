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
import { prisma } from './database.js';
import { crearAuthRoutes } from './routes/auth.routes.js';
import { exigirSesion, protegerSolicitudes } from './middleware/auth.middleware.js';

export function crearApp({
  servirFrontend = process.env.NODE_ENV === 'production',
  frontendDir = fileURLToPath(new URL('../../frontend/dist/', import.meta.url)),
  dbAuth = prisma,
} = {}) {
  const app = express();
  // CORS no reemplaza autenticación ni autorización.
  const origenes = (process.env.CORS_ORIGINS || '').split(',').map(valor => valor.trim()).filter(Boolean);
  app.disable('x-powered-by');
  app.use(cors({ origin: origenes, credentials: true }));
  app.use('/api', protegerSolicitudes);
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/auth', crearAuthRoutes(dbAuth));

  const requiereSesion = exigirSesion(dbAuth);

  app.use('/api/equipos', requiereSesion, equipoRoutes);
  app.use('/api/catalogo', requiereSesion, catalogoRoutes);
  app.use('/api/cotizaciones', requiereSesion, cotizacionRoutes);
  app.use('/api/evaluaciones', requiereSesion, evaluacionRoutes);
  app.use('/api/colaboradores', requiereSesion, colaboradorRoutes);
  app.use('/api/agenda', requiereSesion, agendaRoutes);
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
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'JSON inválido' });
    if (error.type === 'entity.too.large') return res.status(413).json({ mensaje: 'La solicitud es demasiado grande' });
    console.error('Error interno de API:', error.code || error.name);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  });
  return app;
}

import express from 'express';
import cors from 'cors';
import catalogoRoutes from './routes/catalogo.routes.js';
import cotizacionRoutes from './routes/cotizacion.routes.js';
import equipoRoutes from './routes/equipo.routes.js';

export const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/equipos', equipoRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);

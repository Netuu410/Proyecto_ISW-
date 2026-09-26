import express from 'express';
import cors from 'cors';
import catalogoRoutes from './routes/catalogo.routes.js';
import cotizacionRoutes from './routes/cotizacion.routes.js';

const app = express();
const PORT = 3000;

// Permite que el frontend se conecte sin bloqueos de seguridad
app.use(cors());
// Permite entender JSON
app.use(express.json());

// Conectamos las rutas centralizadas
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);

app.listen(PORT, () => {
  console.log(`Servidor PROFESIONAL corriendo en el puerto ${PORT}`);
});
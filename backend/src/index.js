import { crearApp } from './app.js';

const app = crearApp();
const PORT = Number(process.env.PORT || 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT inválido');

app.listen(PORT, () => {
  console.log(`Servidor PROFESIONAL corriendo en el puerto ${PORT}`);
});

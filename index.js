import express from 'express';

const app = express();
const PORT = 3000;

//Permite que el Backend entienda datos en Formato JSON
app.use(express.json());

//Ruta de prueba basica
app.get('/', (req, res) => {
    res.send('backend funcionando');
});

//Enciende el Servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

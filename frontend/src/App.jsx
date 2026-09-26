import { useState } from 'react';

function App() {
  // 1. EL ESTADO: Aquí React guarda temporalmente lo que escribes en los inputs
  const [producto, setProducto] = useState({
    nombre: '',
    categoria: '',
    precioVenta: '',
    costoInterno: ''
  });

  // Función para actualizar el estado cada vez que tecleas algo
  const handleChange = (e) => {
    setProducto({ ...producto, [e.target.name]: e.target.value });
  };

  // 2. LA CONEXIÓN (El puente hacia tu backend)
  const guardarProducto = async (e) => {
    e.preventDefault(); // Evita que la página web se recargue al dar clic en guardar

    try {
      // Formateamos los datos. Zod exige números, así que usamos Number() para convertir el texto.
      const datosParaBackend = {
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioVenta: Number(producto.precioVenta),
        costoInterno: Number(producto.costoInterno)
      };

      // Usamos fetch para enviar un POST a la ruta que armamos en tu backend
      const respuesta = await fetch('http://localhost:3000/api/catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaBackend)
      });

      if (respuesta.ok) {
        alert('¡Producto guardado con éxito en PostgreSQL! 🚀');
        // Limpiamos el formulario después de guardar
        setProducto({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' }); 
      } else {
        alert('Error al guardar. Revisa que no enviaste valores negativos.');
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Error: ¿El backend está encendido?');
    }
  };

  // 3. LA INTERFAZ VISUAL (HTML con estilo básico)
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '400px', margin: 'auto' }}>
      <h2>🎪 NES Eventos - Admin</h2>
      <hr />
      
      <h4>Ingresar Nuevo Producto</h4>
      
      <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          name="nombre" 
          value={producto.nombre} 
          onChange={handleChange} 
          placeholder="Ej: Silla Tiffany" 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          name="categoria" 
          value={producto.categoria} 
          onChange={handleChange} 
          placeholder="Ej: Mobiliario" 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          name="precioVenta" 
          type="number" 
          value={producto.precioVenta} 
          onChange={handleChange} 
          placeholder="Precio de cobro al cliente" 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          name="costoInterno" 
          type="number" 
          value={producto.costoInterno} 
          onChange={handleChange} 
          placeholder="Costo real para la empresa" 
          required 
          style={{ padding: '8px' }}
        />
        
        <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Guardar en Catálogo
        </button>
      </form>
    </div>
  );
}

export default App;
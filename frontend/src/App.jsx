import { useState, useEffect } from 'react';

function App() {
  const [producto, setProducto] = useState({
    nombre: '',
    categoria: '',
    precioVenta: '',
    costoInterno: ''
  });

  // 1. NUEVO ESTADO: Un arreglo para guardar la lista de productos que llegue del backend
  const [catalogo, setCatalogo] = useState([]);

  const handleChange = (e) => {
    setProducto({ ...producto, [e.target.name]: e.target.value });
  };

  // 2. NUEVA FUNCIÓN: Pedirle al backend los productos (GET)
  const cargarCatalogo = async () => {
    try {
      const respuesta = await fetch('http://localhost:3000/api/catalogo');
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setCatalogo(datos); // Guardamos la lista en la memoria de React para dibujarla
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
    }
  };

  // 3. NUEVO HOOK: useEffect hace que 'cargarCatalogo' se ejecute AUTOMÁTICAMENTE al abrir la página
  useEffect(() => {
    cargarCatalogo();
  }, []); // Los corchetes vacíos significan "ejecutar solo 1 vez al inicio"

  const guardarProducto = async (e) => {
    e.preventDefault();

    try {
      const datosParaBackend = {
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioVenta: Number(producto.precioVenta),
        costoInterno: Number(producto.costoInterno)
      };

      const respuesta = await fetch('http://localhost:3000/api/catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaBackend)
      });

      if (respuesta.ok) {
        alert('¡Producto guardado con éxito!');
        setProducto({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' });
        
        // 4. MAGIA: Volvemos a cargar la tabla automáticamente después de guardar
        cargarCatalogo(); 
      } else {
        alert('Error al guardar. Revisa que no enviaste valores negativos.');
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Error: ¿El backend está encendido?');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '900px', margin: 'auto' }}>
      <h2>🎪 NES Eventos - Admin</h2>
      <hr />
      
      {/* Contenedor flexible para poner formulario y tabla lado a lado */}
      <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
        
        {/* LADO IZQUIERDO: EL FORMULARIO */}
        <div style={{ flex: 1 }}>
          <h4>Ingresar Nuevo Producto</h4>
          <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input name="nombre" value={producto.nombre} onChange={handleChange} placeholder="Ej: Silla Tiffany" required style={{ padding: '8px' }} />
            <input name="categoria" value={producto.categoria} onChange={handleChange} placeholder="Ej: Mobiliario" required style={{ padding: '8px' }} />
            <input name="precioVenta" type="number" value={producto.precioVenta} onChange={handleChange} placeholder="Precio de cobro" required style={{ padding: '8px' }} />
            <input name="costoInterno" type="number" value={producto.costoInterno} onChange={handleChange} placeholder="Costo real empresa" required style={{ padding: '8px' }} />
            
            <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Guardar en Catálogo
            </button>
          </form>
        </div>

        {/* LADO DERECHO: LA TABLA DE INVENTARIO */}
        <div style={{ flex: 2 }}>
          <h4>Inventario Actual</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead style={{ background: '#f4f4f4' }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nombre</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Precio Venta</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Costo Interno</th>
              </tr>
            </thead>
            <tbody>
              {/* Iteramos sobre el arreglo de productos usando .map() */}
              {catalogo.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center' }}>No hay productos registrados aún.</td></tr>
              ) : (
                catalogo.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{item.id}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.nombre} <br/><small style={{color: 'gray'}}>{item.categoria}</small></td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', color: '#28a745', fontWeight: 'bold' }}>${item.precioVenta}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', color: '#dc3545' }}>${item.costoInterno}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default App;
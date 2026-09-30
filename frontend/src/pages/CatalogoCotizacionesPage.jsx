import { useState, useEffect } from 'react';

function CatalogoCotizacionesPage() {

  const [producto, setProducto] = useState({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' });
  const [catalogo, setCatalogo] = useState([]);


  // Iniciamos clienteId en 1 por defecto y preparamos el espacio para seleccionar un producto
  const [cotizacion, setCotizacion] = useState({ clienteId: '1', catalogoItemId: '', cantidad: '1' });
  const [resultado, setResultado] = useState(null); // Aquí guardaremos la respuesta matemática del backend


  const cargarCatalogo = async () => {
    try {
      const respuesta = await fetch('http://localhost:3000/api/catalogo');
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setCatalogo(datos);
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
    }
  };

  useEffect(() => { cargarCatalogo(); }, []);

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

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        const detalles = Array.isArray(datos?.detalles)
          ? datos.detalles.map(error => error.message).filter(Boolean).join('\n')
          : '';
        throw new Error(detalles || datos?.mensaje || 'No se pudo guardar el producto. Inténtalo de nuevo.');
      }

      alert('¡Producto guardado!');
      setProducto({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' });
      cargarCatalogo();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert(error instanceof TypeError
        ? 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.'
        : error.message || 'No se pudo guardar el producto');
    }
  };

  
  const generarCotizacion = async (e) => {
    e.preventDefault();
    try {
      // Armamos la estructura exacta que pide tu esquema Zod en el backend
      const datosParaBackend = {
        clienteId: Number(cotizacion.clienteId),
        items: [
          {
            catalogoItemId: Number(cotizacion.catalogoItemId),
            cantidad: Number(cotizacion.cantidad)
          }
        ]
      };

      // Enviamos por POST a la ruta de cotizaciones
      const respuesta = await fetch('http://localhost:3000/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaBackend)
      });

      if (respuesta.ok) {
        const datosGenerados = await respuesta.json();
        setResultado(datosGenerados); // Guardamos la ganancia calculada para mostrarla en pantalla
        alert('¡Cotización generada y guardada correctamente!');
      } else {
        alert('No se pudo generar la cotización. Revisa los datos e inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] p-4 md:p-10" style={{ fontFamily: 'system-ui' }}>
      <h2>🎪 NES Eventos - Panel de Administración</h2>
      
      {/* SECCIÓN 1: CATÁLOGO */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>📦 Gestión de Catálogo</h3>
        <div className="flex flex-col gap-10 md:flex-row">
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input name="nombre" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} placeholder="Nombre" required style={{ padding: '8px' }} />
              <input name="categoria" value={producto.categoria} onChange={(e) => setProducto({ ...producto, categoria: e.target.value })} placeholder="Categoría" required style={{ padding: '8px' }} />
              <input name="precioVenta" type="number" value={producto.precioVenta} onChange={(e) => setProducto({ ...producto, precioVenta: e.target.value })} placeholder="Precio de venta" required style={{ padding: '8px' }} />
              <input name="costoInterno" type="number" value={producto.costoInterno} onChange={(e) => setProducto({ ...producto, costoInterno: e.target.value })} placeholder="Costo interno" required style={{ padding: '8px' }} />
              <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>Agregar Producto</button>
            </form>
          </div>

          <div style={{ flex: 2, minWidth: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead style={{ background: '#e9ecef' }}>
                <tr>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nombre</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Precio</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Costo</th>
                </tr>
              </thead>
              <tbody>
                {catalogo.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.nombre}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>${item.precioVenta}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>${item.costoInterno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: COTIZADOR AUTOMÁTICO */}
      <div style={{ background: '#e8f4f8', padding: '20px', borderRadius: '8px' }}>
        <h3>💰 Simulador de Cotizaciones</h3>
        <p>Selecciona un producto del catálogo para calcular la rentabilidad del evento.</p>
        
        <form onSubmit={generarCotizacion} className="mb-5 flex flex-col gap-[15px] md:flex-row md:items-center">
          
          <select 
            required 
            value={cotizacion.catalogoItemId} 
            onChange={(e) => setCotizacion({ ...cotizacion, catalogoItemId: e.target.value })}
            style={{ padding: '10px', flex: 2, minWidth: 0 }}
          >
            <option value="">-- Selecciona un Producto --</option>
            {/* Dibujamos las opciones dinámicamente desde la base de datos */}
            {catalogo.map(item => (
              <option key={item.id} value={item.id}>{item.nombre} (Precio: ${item.precioVenta})</option>
            ))}
          </select>

          <input 
            type="number" 
            min="1" 
            value={cotizacion.cantidad} 
            onChange={(e) => setCotizacion({ ...cotizacion, cantidad: e.target.value })}
            placeholder="Cantidad" 
            required 
            style={{ padding: '10px', flex: 1, minWidth: 0 }}
          />

          <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Calcular Rentabilidad
          </button>
        </form>

        {/* RESULTADO: Solo se muestra si el backend responde con éxito */}
        {resultado && (
          <div style={{ background: 'white', padding: '20px', borderLeft: '5px solid #28a745', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Resultados del Evento (Cotización #{resultado.id})</h4>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>Total a cobrar al cliente: <strong>${resultado.totalVenta}</strong></p>
            <p style={{ margin: '5px 0', fontSize: '18px', color: '#28a745' }}>Ganancia neta de la empresa: <strong>${resultado.gananciaNeta}</strong></p>
          </div>
        )}
      </div>

    </div>
  );
}

export default CatalogoCotizacionesPage;

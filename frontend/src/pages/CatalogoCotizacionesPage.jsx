import { useRef, useState, useEffect } from 'react';
import { obtenerCatalogo, crearProducto } from '../api/catalogo.js';
import { crearCotizacion } from '../api/cotizaciones.js';

function CatalogoCotizacionesPage() {

  const [producto, setProducto] = useState({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' });
  const [catalogo, setCatalogo] = useState([]);


  // No existe un módulo de clientes: el identificador se ingresa explícitamente.
  const [cotizacion, setCotizacion] = useState({ clienteId: '', catalogoItemId: '', cantidad: '1' });
  const [resultado, setResultado] = useState(null); // Aquí guardaremos la respuesta matemática del backend


  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [errorProducto, setErrorProducto] = useState('');
  const [errorCotizacion, setErrorCotizacion] = useState('');
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [guardandoCotizacion, setGuardandoCotizacion] = useState(false);
  const pendientes = useRef({ producto: false, cotizacion: false });

  const cargarCatalogo = async (signal) => {
    setCargando(true); setErrorCatalogo('');
    try { setCatalogo(await obtenerCatalogo({ signal })); }
    catch (error) { if (error.name !== 'AbortError') setErrorCatalogo(error.message); }
    finally { if (!signal?.aborted) setCargando(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    obtenerCatalogo({ signal: controller.signal })
      .then(datos => { if (!controller.signal.aborted) setCatalogo(datos); })
      .catch(error => { if (!controller.signal.aborted) setErrorCatalogo(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (pendientes.current.producto) return;
    pendientes.current.producto = true;
    setGuardandoProducto(true); setErrorProducto('');
    try {
      await crearProducto({ ...producto, precioVenta: Number(producto.precioVenta), costoInterno: Number(producto.costoInterno) });
      alert('¡Producto guardado!');
      setProducto({ nombre: '', categoria: '', precioVenta: '', costoInterno: '' });
      await cargarCatalogo();
    } catch (error) { setErrorProducto(error.message); }
    finally { pendientes.current.producto = false; setGuardandoProducto(false); }
  };

  const generarCotizacion = async (e) => {
    e.preventDefault();
    if (pendientes.current.cotizacion) return;
    pendientes.current.cotizacion = true;
    setGuardandoCotizacion(true); setErrorCotizacion(''); setResultado(null);
    try {
      setResultado(await crearCotizacion({
        clienteId: Number(cotizacion.clienteId),
        items: [{ catalogoItemId: Number(cotizacion.catalogoItemId), cantidad: Number(cotizacion.cantidad) }],
      }));
      alert('¡Cotización generada y guardada correctamente!');
    } catch (error) { setErrorCotizacion(error.message); }
    finally { pendientes.current.cotizacion = false; setGuardandoCotizacion(false); }
  };

  return (
    <div className="mx-auto max-w-[1000px] p-4 md:p-10" style={{ fontFamily: 'system-ui' }}>
      <h2>🎪 NES Eventos - Panel de Administración</h2>
      
      {/* SECCIÓN 1: CATÁLOGO */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>📦 Gestión de Catálogo</h3>
        {cargando && <p role="status">Cargando catálogo…</p>}
        {errorCatalogo && <p role="alert">{errorCatalogo} <button onClick={() => cargarCatalogo()}>Reintentar</button></p>}
        {errorProducto && <p role="alert">{errorProducto}</p>}
        <div className="flex flex-col gap-10 md:flex-row">
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <fieldset disabled={guardandoProducto} style={{ display: 'contents' }}>
              <input name="nombre" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} placeholder="Nombre" required style={{ padding: '8px' }} />
              <input name="categoria" value={producto.categoria} onChange={(e) => setProducto({ ...producto, categoria: e.target.value })} placeholder="Categoría" required style={{ padding: '8px' }} />
              <input name="precioVenta" type="number" value={producto.precioVenta} onChange={(e) => setProducto({ ...producto, precioVenta: e.target.value })} placeholder="Precio de venta" required style={{ padding: '8px' }} />
              <input name="costoInterno" type="number" value={producto.costoInterno} onChange={(e) => setProducto({ ...producto, costoInterno: e.target.value })} placeholder="Costo interno" required style={{ padding: '8px' }} />
              <button disabled={guardandoProducto} type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>{guardandoProducto ? 'Guardando…' : 'Agregar Producto'}</button>
              </fieldset>
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
        <h3>💰 Crear Cotización</h3>
        <p>Selecciona un producto. Al guardar se calcularán los totales con los precios del backend.</p>
        
        {errorCotizacion && <p role="alert">{errorCotizacion}</p>}
        <p>No existe un directorio de clientes conectado; ingresa el identificador acordado por el equipo.</p>
        <form onSubmit={generarCotizacion} className="mb-5 flex flex-col gap-[15px] md:flex-row md:items-center">
          <fieldset disabled={guardandoCotizacion} style={{ display: 'contents' }}>
          
          <input aria-label="Identificador del cliente" type="number" min="1" max="2147483647" required value={cotizacion.clienteId}
            onChange={e => { setResultado(null); setCotizacion({ ...cotizacion, clienteId: e.target.value }); }} placeholder="ID del cliente" style={{ padding: '10px', minWidth: 0 }} />
          <select 
            required 
            value={cotizacion.catalogoItemId} 
            onChange={(e) => { setResultado(null); setCotizacion({ ...cotizacion, catalogoItemId: e.target.value }); }}
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
            onChange={(e) => { setResultado(null); setCotizacion({ ...cotizacion, cantidad: e.target.value }); }}
            placeholder="Cantidad" 
            required 
            style={{ padding: '10px', flex: 1, minWidth: 0 }}
          />

          <button disabled={guardandoCotizacion || cargando || !!errorCatalogo} type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            {guardandoCotizacion ? 'Guardando…' : 'Guardar cotización'}
          </button>
          </fieldset>
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

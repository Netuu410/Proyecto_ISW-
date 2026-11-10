import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerEquipos } from '../api/equipos.js';
import { crearCotizacion, obtenerCotizaciones } from '../api/cotizaciones.js';
import { moneda } from '../lib/moneda.js';
import './CalendarPage.css';
import './CotizacionesPage.css';

export default function CotizacionesPage() {
  const [productos, setProductos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cliente, setCliente] = useState('');
  const [items, setItems] = useState([{ equipoId: '', cantidad: 1 }]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [intento, setIntento] = useState(0);
  const bloqueo = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([obtenerEquipos({ signal: controller.signal }), obtenerCotizaciones({ signal: controller.signal })])
      .then(([inventario, datos]) => { setProductos(inventario); setCotizaciones(datos); })
      .catch(err => { if (!controller.signal.aborted) setErrorCarga(err.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [intento]);
  const cambiar = (indice, campo, valor) => setItems(actual => actual.map((item, i) => i === indice ? { ...item, [campo]: valor } : item));
  const total = items.reduce((suma, item) => suma + (productos.find(p => p.id === Number(item.equipoId))?.precio || 0) * Number(item.cantidad), 0);
  async function guardar(event) {
    event.preventDefault();
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError('');
    try {
      for (const item of items) {
        const producto = productos.find(p => p.id === Number(item.equipoId));
        if (producto && Number(item.cantidad) > producto.stockDisponible) {
          throw new Error(`${producto.nombre}: solicitas ${item.cantidad} unidades, pero el stock del inventario es ${producto.stockDisponible}`);
        }
      }
      const cotizacion = await crearCotizacion({ clienteNombre: cliente, items: items.map(item => ({ equipoId: Number(item.equipoId), cantidad: Number(item.cantidad) })) });
      setCotizaciones(actual => [cotizacion, ...actual]); setSeleccionada(cotizacion);
      setCliente(''); setItems([{ equipoId: '', cantidad: 1 }]);
    } catch (err) { setError(err.message); }
    finally { bloqueo.current = false; setGuardando(false); }
  }
  return <section className="agenda" aria-labelledby="cotizaciones-titulo">
    <header className="agenda-cabecera"><div><p className="agenda-eyebrow">NES EVENTOS</p><h1 id="cotizaciones-titulo">Cotizaciones</h1>
      <p>Selecciona productos del inventario y guarda la cotización del cliente.</p></div>
      <Link to="/inventario">Ir a Inventario</Link>
    </header>
    {cargando && <p role="status">Cargando inventario y cotizaciones…</p>}
    {errorCarga && <p role="alert" className="agenda-error">{errorCarga} <button onClick={() => { setCargando(true); setErrorCarga(''); setIntento(i => i + 1); }}>Reintentar carga</button></p>}
    <div className="agenda-distribucion cotizaciones-distribucion">
      <section className="agenda-panel"><h2>Nueva cotización</h2>
        {error && <p role="alert" className="agenda-error">{error}</p>}
        <form onSubmit={guardar}><fieldset disabled={cargando || guardando || !!errorCarga}>
          <div className="agenda-campos"><label>Cliente o empresa<input required maxLength={160} value={cliente} onChange={e => setCliente(e.target.value)} /></label></div>
          {items.map((item, indice) => <div className="agenda-linea-producto" key={indice}>
            <label>Producto del inventario<select required value={item.equipoId} onChange={e => cambiar(indice, 'equipoId', e.target.value)}>
              <option value="">Selecciona un producto</option>{productos.map(p => <option key={p.id} value={p.id} disabled={!(p.precio > 0) || p.stockDisponible < 1 || items.some((otro, i) => i !== indice && Number(otro.equipoId) === p.id)}>{p.nombre} · {moneda(p.precio)} · stock {p.stockDisponible} · {p.estado || 'Sin estado'}</option>)}
            </select></label>
            <label>Cantidad<input required type="number" min="1" max={productos.find(p => p.id === Number(item.equipoId))?.stockDisponible ?? 2147483647} step="1" value={item.cantidad} onChange={e => cambiar(indice, 'cantidad', e.target.value)} /></label>
            {Number(item.cantidad) > (productos.find(p => p.id === Number(item.equipoId))?.stockDisponible ?? Infinity) && <p role="alert" className="agenda-error">La cantidad supera el stock del producto seleccionado.</p>}
            <button type="button" disabled={items.length === 1} onClick={() => setItems(actual => actual.filter((_, i) => i !== indice))}>Quitar</button>
          </div>)}
          {!cargando && !productos.length && <p>Crea un producto en Inventario para comenzar.</p>}
          <button type="button" disabled={items.length >= Math.min(productos.length, 100)} onClick={() => setItems(actual => [...actual, { equipoId: '', cantidad: 1 }])}>Agregar producto</button>
          <p className="agenda-total">Total estimado: <strong>{moneda(total)}</strong></p>
          <p className="agenda-suave">Las cantidades no pueden superar el stock del inventario. Guardar una cotización no reserva equipos; la disponibilidad para la fecha y horario se valida al agendar.</p>
          <div className="agenda-acciones"><button className="agenda-primario" disabled={!productos.length} type="submit">{guardando ? 'Guardando…' : 'Guardar cotización'}</button></div>
        </fieldset></form>
      </section>
      <aside className="agenda-panel cotizaciones-guardadas"><h2>Cotizaciones guardadas</h2>
        <p className="agenda-suave">Número de operación · de menor a mayor</p>
        {!cargando && !errorCarga && !cotizaciones.length && <p>Aún no hay cotizaciones.</p>}
        <div className="agenda-lista cotizaciones-lista" role="region" aria-label="Cotizaciones ordenadas por número de operación" tabIndex={0}>{[...cotizaciones].sort((a, b) => a.id - b.id).map(c => <button className="agenda-tarjeta" key={c.id} aria-pressed={seleccionada?.id === c.id} onClick={() => setSeleccionada(c)}>
          <strong>#{c.id} · {c.clienteNombre || `Cliente ${c.clienteId}`}</strong><span>{moneda(c.totalVenta)} · {c.estado}</span>
        </button>)}</div>
        {seleccionada && <section className="agenda-resumen" aria-label="Detalle de cotización"><h3>Cotización #{seleccionada.id}</h3>
          <p>{seleccionada.clienteNombre || `Cliente ${seleccionada.clienteId}`}</p>
          <ul>{seleccionada.items.map(item => <li key={item.id}>{item.nombreProducto} × {item.cantidad} · {moneda(item.precioCobrado * item.cantidad)}</li>)}</ul>
          <p>Total: <strong>{moneda(seleccionada.totalVenta)}</strong></p>
          <p className="agenda-suave">Margen estimado: {moneda(seleccionada.gananciaNeta)}. Considera los costos internos registrados en Inventario.</p>
          {seleccionada.estado === 'Preliminar' && !seleccionada.actividadAgenda && <Link to={`/calendario?cotizacion=${seleccionada.id}`}>Agendar esta cotización →</Link>}
        </section>}
      </aside>
    </div>
  </section>;
}

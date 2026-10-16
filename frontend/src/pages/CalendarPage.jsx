import { useEffect, useMemo, useState } from 'react';
import { obtenerActividades, obtenerRecintos, comprobarDisponibilidad, crearActividad, crearRecinto } from '../api/agenda.js';
import { obtenerCotizaciones } from '../api/cotizaciones.js';
import { Link, useSearchParams } from 'react-router-dom';
import { fechaHoraLocal, aInstanteSantiago, moverMes, diasDelCalendario, rangoMes,
  formatoHorario, ocurreEnDia } from '../lib/agenda-time';
import './CalendarPage.css';
import { moneda } from '../lib/moneda.js';

const tipos = { EVENTO: 'Evento', VISITA_TECNICA: 'Visita técnica' };
const hoy = () => fechaHoraLocal(new Date()).slice(0, 10);
const formularioInicial = dia => ({ tipo: 'EVENTO', nombre: '', clienteNombre: '',
  inicio: `${dia}T10:00`, fin: `${dia}T11:00`, recintoId: '', cantidades: {} });

function camposCotizacion(cotizacion) {
  const cantidades = {};
  for (const detalle of cotizacion.items) {
    if (detalle.equipoId) cantidades[detalle.equipoId] = (cantidades[detalle.equipoId] || 0) + detalle.cantidad;
  }
  return { tipo: 'EVENTO', cotizacionId: cotizacion.id, clienteNombre: cotizacion.clienteNombre || '',
    nombre: `Evento · Cotización #${cotizacion.id}`, cantidades };
}

function Conflictos({ conflictos }) {
  if (!conflictos.length) return null;
  return <ul className="agenda-conflictos">
    {conflictos.map(recurso => <li key={`${recurso.tipo}-${recurso.id}`}>
      <strong>{recurso.tipo === 'RECINTO' ? 'Recinto' : 'Equipo'}: {recurso.nombre}</strong>
      {recurso.motivo === 'RESERVADO' && ' — ocupado durante el horario solicitado.'}
      {recurso.motivo === 'NO_EXISTE' && ' — ya no existe; actualiza los recursos.'}
      {recurso.motivo === 'NO_OPERATIVO' && ` — estado: ${recurso.estado || 'sin definir'}.`}
      {recurso.motivo === 'STOCK_INSUFICIENTE' && ` — solicitas ${recurso.solicitadas}; disponibles durante todo el intervalo: ${recurso.disponibles}.`}
      {!!recurso.actividades?.length && <ul>{recurso.actividades.map(actividad => <li key={actividad.id}>
        {actividad.nombre}: {formatoHorario(actividad.inicio)} — {formatoHorario(actividad.fin)}
      </li>)}</ul>}
    </li>)}
  </ul>;
}

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cotizacionSolicitada = searchParams.get('cotizacion');
  const [pendientes, setPendientes] = useState([]);
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [dia, setDia] = useState(hoy());
  const [tipo, setTipo] = useState('');
  const [actividades, setActividades] = useState([]);
  const [recintos, setRecintos] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargaTerminada, setCargaTerminada] = useState('');
  const [versionRecursos, setVersionRecursos] = useState(-1);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorRecursos, setErrorRecursos] = useState('');
  const [actualizacion, setActualizacion] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(() => formularioInicial(hoy()));
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [conflictos, setConflictos] = useState([]);
  const [nuevoRecinto, setNuevoRecinto] = useState({ nombre: '', direccion: '' });
  const [mostrarRecinto, setMostrarRecinto] = useState(false);
  const [guardandoRecinto, setGuardandoRecinto] = useState(false);
  const [errorRecinto, setErrorRecinto] = useState('');
  const [cotizacion, setCotizacion] = useState(null);
  const dias = useMemo(() => diasDelCalendario(mes), [mes]);
  const claveCarga = `${mes}|${tipo}|${actualizacion}`;
  const cargando = cargaTerminada !== claveCarga;
  const recursosListos = versionRecursos === actualizacion;
  const cantidadesCotizadas = {};
  for (const detalle of cotizacion?.items || []) {
    if (detalle.equipoId) cantidadesCotizadas[detalle.equipoId] = (cantidadesCotizadas[detalle.equipoId] || 0) + detalle.cantidad;
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ ...rangoMes(mes), ...(tipo ? { tipo } : {}) });
    obtenerActividades(params, { signal: controller.signal })
      .then(datos => {
        setActividades(datos); setErrorCarga('');
        setSeleccionada(anterior => anterior ? datos.find(actividad => actividad.id === anterior.id) || null : null);
      })
      .catch(err => { if (err.name !== 'AbortError') setErrorCarga(err.message); })
      .finally(() => { if (!controller.signal.aborted) setCargaTerminada(claveCarga); });
    return () => controller.abort();
  }, [mes, tipo, actualizacion, claveCarga]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      obtenerRecintos({ signal: controller.signal }),
      obtenerCotizaciones({ signal: controller.signal }),
    ]).then(([lugares, cotizaciones]) => {
      setRecintos(lugares); setErrorRecursos(''); setVersionRecursos(actualizacion);
      const disponibles = cotizaciones.filter(c => c.estado === 'Preliminar' && !c.actividadAgenda);
      setPendientes(disponibles);
      if (cotizacionSolicitada) {
        const elegida = disponibles.find(c => String(c.id) === cotizacionSolicitada);
        if (elegida) {
          setCotizacion(elegida); setAbierto(true);
          setForm(anterior => ({ ...anterior, ...camposCotizacion(elegida) }));
        } else setError('La cotización solicitada no existe o ya fue agendada. Selecciona una cotización pendiente.');
      }
    }).catch(err => { if (err.name !== 'AbortError') setErrorRecursos(err.message); });
    return () => controller.abort();
  }, [actualizacion, cotizacionSolicitada]);

  const delDia = actividades
  .filter(actividad => ocurreEnDia(actividad, dia))
  .sort((a, b) => {
    const diferencia =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    return diferencia || b.id - a.id;
  });
  const tituloMes = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${mes}-01T12:00:00Z`));
  const editar = (campo, valor) => {
    setForm(anterior => ({ ...anterior, [campo]: valor }));
    setConflictos([]); setError(''); setMensaje('');
  };
  const abrir = () => {
    setCotizacion(null);
    setForm(formularioInicial(dia)); setAbierto(true); setError(''); setConflictos([]); setMensaje('');
  };
  const continuarCotizacion = cotizacion => {
    setCotizacion(cotizacion);
    setForm(anterior => ({ ...anterior, ...camposCotizacion(cotizacion) }));
    setError(''); setConflictos([]);
  };
  const cambiarMes = delta => { const siguiente = moverMes(mes, delta); setMes(siguiente); setDia(`${siguiente}-01`); setSeleccionada(null); };

  async function enviar(event, soloConsulta = false) {
    event.preventDefault();
    if (ocupado) return;
    setError(''); setMensaje(''); setConflictos([]); setOcupado(true);
    try {
      const cantidades = { ...form.cantidades };
      for (const [id, cantidad] of Object.entries(cantidadesCotizadas)) cantidades[id] = Math.max(Number(cantidades[id]) || 0, cantidad);
      const recursos = {
        inicio: aInstanteSantiago(form.inicio), fin: aInstanteSantiago(form.fin), recintoId: Number(form.recintoId),
        equipos: Object.entries(cantidades).filter(([, cantidad]) => Number(cantidad) > 0)
          .map(([equipoId, cantidad]) => ({ equipoId: Number(equipoId), cantidad: Number(cantidad) })),
      };
      if (recursos.inicio >= recursos.fin) throw new Error('El término debe ser posterior al inicio');
      if (!recursos.recintoId) throw new Error('Selecciona un recinto');
      if (form.tipo === 'EVENTO' && !form.cotizacionId) throw new Error('Selecciona una cotización guardada');
      if (soloConsulta) {
        const resultado = await comprobarDisponibilidad(recursos);
        setConflictos(resultado.conflictos);
        setMensaje(resultado.disponible ? 'Recursos disponibles. Se comprobarán nuevamente al confirmar.' : 'Hay recursos en conflicto. Ajusta el horario o los recursos.');
      } else {
        const actividad = await crearActividad({
          ...recursos, tipo: form.tipo, nombre: form.nombre, clienteNombre: form.clienteNombre,
          ...(form.cotizacionId ? { cotizacionId: form.cotizacionId } : {}),
        });
        const fecha = fechaHoraLocal(actividad.inicio).slice(0, 10);
        setMes(fecha.slice(0, 7)); setDia(fecha); setTipo(''); setSeleccionada(actividad);
        setAbierto(false); setActualizacion(value => value + 1);
        setSearchParams({}, { replace: true });
        setMensaje(`${tipos[actividad.tipo]}: reserva confirmada (Reservado).`);
      }
    } catch (err) {
      setError(err.errores?.length ? err.errores.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' · ') : err.message);
      setConflictos(err.conflictos || []);
    } finally { setOcupado(false); }
  }

  async function guardarRecinto(event) {
    event.preventDefault();
    if (guardandoRecinto) return;
    setGuardandoRecinto(true); setErrorRecinto('');
    try {
      const recinto = await crearRecinto(nuevoRecinto);
      setRecintos(anteriores => [...anteriores, recinto].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      editar('recintoId', String(recinto.id)); setNuevoRecinto({ nombre: '', direccion: '' }); setMostrarRecinto(false);
    } catch (err) { setErrorRecinto(err.message); }
    finally { setGuardandoRecinto(false); }
  }

  return <section className="agenda" aria-labelledby="agenda-titulo">
    <header className="agenda-cabecera">
      <div><p className="agenda-eyebrow">NES EVENTOS · COORDINACIÓN</p><h1 id="agenda-titulo">Calendario central</h1>
        <p>Eventos y visitas técnicas · Horario de Santiago de Chile</p></div>
      <button className="agenda-primario" onClick={abrir} disabled={!recursosListos || ocupado}>Agendar actividad</button>
    </header>
    {mensaje && <p role="status" className="agenda-aviso">{mensaje}</p>}
    {(error || errorCarga || errorRecursos) && <div role="alert" className="agenda-error">
      {error || errorCarga || errorRecursos}
      {(errorCarga || errorRecursos) && <button onClick={() => setActualizacion(value => value + 1)}>Reintentar carga</button>}
    </div>}
    <Conflictos conflictos={conflictos} />

    {abierto && <section className="agenda-panel agenda-formulario" aria-labelledby="form-titulo">
      <div className="agenda-fila"><h2 id="form-titulo">Nueva actividad</h2><button disabled={ocupado} onClick={() => setAbierto(false)}>Cerrar formulario</button></div>
      {cotizacion && <div className="agenda-resumen">
        <p>Cotización seleccionada · Asigna el recinto y horario del cliente.</p>
        <h3>Cotización #{cotizacion.id} · {cotizacion.clienteNombre || `Cliente ${cotizacion.clienteId}`}</h3>
        <ul>{cotizacion.items.map(item => <li key={item.id}>{item.nombreProducto} × {item.cantidad} · {moneda(item.precioCobrado * item.cantidad)}</li>)}</ul>
        <p>Total: <strong>{moneda(cotizacion.totalVenta)}</strong></p>
        <p className="agenda-suave">Si cierras este formulario, puedes retomar la cotización desde las pendientes.</p>
      </div>}
      <form onSubmit={enviar}>
        <fieldset disabled={ocupado || guardandoRecinto}>
          <div className="agenda-campos">
            <label>Tipo<select value={form.tipo} onChange={e => { setCotizacion(null); setForm(anterior => ({ ...anterior, tipo: e.target.value, cotizacionId: undefined, clienteNombre: '', cantidades: {} })); setConflictos([]); setError(''); }}>{Object.entries(tipos).map(([value, nombre]) => <option key={value} value={value}>{nombre}</option>)}</select></label>
            {form.tipo === 'EVENTO' && <label>Cotización del cliente<select required value={form.cotizacionId || ''} onChange={e => {
              const elegida = pendientes.find(c => c.id === Number(e.target.value));
              if (elegida) continuarCotizacion(elegida);
              else { setCotizacion(null); setForm(anterior => ({ ...anterior, cotizacionId: undefined, clienteNombre: '', cantidades: {} })); }
            }}><option value="">Selecciona una cotización guardada</option>{pendientes.map(c => <option key={c.id} value={c.id}>#{c.id} · {c.clienteNombre || `Cliente ${c.clienteId}`} · {moneda(c.totalVenta)}</option>)}</select></label>}
            <label>Nombre de la actividad<input required maxLength={160} value={form.nombre} onChange={e => editar('nombre', e.target.value)} /></label>
            <label>Cliente<input required readOnly={!!cotizacion?.clienteNombre} maxLength={160} value={form.clienteNombre} onChange={e => editar('clienteNombre', e.target.value)} placeholder="Nombre del cliente o empresa" /></label>
            <label>Recinto<select required value={form.recintoId} onChange={e => editar('recintoId', e.target.value)}><option value="">Selecciona un recinto</option>{recintos.map(recinto => <option key={recinto.id} value={recinto.id}>{recinto.nombre} — {recinto.direccion}</option>)}</select></label>
            <label>Inicio en Santiago<input required type="datetime-local" value={form.inicio} onChange={e => editar('inicio', e.target.value)} /></label>
            <label>Término en Santiago<input required type="datetime-local" value={form.fin} onChange={e => editar('fin', e.target.value)} /></label>
          </div>
          {form.tipo === 'EVENTO' && <p className="agenda-suave">Las cotizaciones se crean en la página <Link to="/cotizaciones">Cotizaciones</Link>. Aquí se asignan al recinto y horario.</p>}
          <button type="button" onClick={() => setMostrarRecinto(value => !value)}>Registrar un recinto</button>
          <p className="agenda-suave">Ambos tipos bloquean el recinto. Se permiten actividades consecutivas sin margen automático.</p>
          <div className="agenda-acciones"><button type="button" onClick={e => enviar(e, true)}>Consultar disponibilidad</button>
            <button className="agenda-primario" type="submit">{ocupado ? 'Comprobando…' : 'Confirmar reserva'}</button></div>
        </fieldset>
      </form>
      {mostrarRecinto && <form className="agenda-nuevo-recinto" onSubmit={guardarRecinto}>
        <h3>Nuevo recinto</h3><p className="agenda-suave">Usa un recinto existente para evitar registrar el mismo espacio dos veces.</p>
        <fieldset disabled={guardandoRecinto || ocupado}><div className="agenda-campos">
          <label>Nombre del recinto<input required maxLength={120} value={nuevoRecinto.nombre} onChange={e => setNuevoRecinto({ ...nuevoRecinto, nombre: e.target.value })} /></label>
          <label>Dirección<input required maxLength={240} value={nuevoRecinto.direccion} onChange={e => setNuevoRecinto({ ...nuevoRecinto, direccion: e.target.value })} /></label>
        </div><button type="submit">{guardandoRecinto ? 'Guardando…' : 'Guardar recinto'}</button></fieldset>
        {errorRecinto && <p role="alert" className="agenda-error">{errorRecinto}</p>}
      </form>}
    </section>}

    <div className="agenda-distribucion">
      <section className="agenda-panel" aria-label="Calendario mensual">
        <div className="agenda-herramientas"><div className="agenda-fila">
          <button aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>‹</button><h2>{tituloMes}</h2><button aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>›</button>
        </div><button onClick={() => { setDia(hoy()); setMes(hoy().slice(0, 7)); setSeleccionada(null); }}>Hoy</button>
          <label className="agenda-filtro">Mostrar<select value={tipo} onChange={e => { setTipo(e.target.value); setSeleccionada(null); }}><option value="">Todas las actividades</option>{Object.entries(tipos).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button onClick={() => setActualizacion(value => value + 1)} disabled={cargando}>Actualizar</button>
        </div>
        <div className="agenda-leyenda"><span className="agenda-etiqueta EVENTO">Evento</span><span className="agenda-etiqueta VISITA_TECNICA">Visita técnica</span></div>
        {cargando ? <p role="status">Cargando agenda…</p> : errorCarga ? <p>No se pudo cargar este período.</p> : <>
          <div className="agenda-semana" aria-hidden="true">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(nombre => <span key={nombre}>{nombre}</span>)}</div>
          <div className="agenda-cuadricula">{dias.map(fecha => {
            const delDiaCelda = actividades.filter(actividad => ocurreEnDia(actividad, fecha));
            return <button key={fecha} className={`agenda-dia ${fecha.slice(0, 7) !== mes ? 'otro-mes' : ''} ${dia === fecha ? 'seleccionado' : ''}`}
              aria-pressed={dia === fecha} aria-label={`${fecha}, ${delDiaCelda.length} actividades`} aria-current={fecha === hoy() ? 'date' : undefined}
              onClick={() => { setDia(fecha); setSeleccionada(null); }}>
              <span className="agenda-numero">{Number(fecha.slice(-2))}</span>
              {delDiaCelda.slice(0, 2).map(actividad => <span key={actividad.id} className={`agenda-etiqueta ${actividad.tipo}`}>{actividad.nombre}</span>)}
              {delDiaCelda.length > 2 && <small>+{delDiaCelda.length - 2} más</small>}
            </button>;
          })}</div>
        </>}
      </section>

      <aside className="agenda-panel" aria-label="Actividades y detalle">
        <h2>{new Intl.DateTimeFormat('es-CL', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${dia}T12:00:00Z`))}</h2>
        {!cargando && !errorCarga && !delDia.length && <p className="agenda-vacio">Sin actividades para este día.</p>}
        {!cargando && !errorCarga && <div className="agenda-lista agenda-reservas-lista">{delDia.map(actividad => <button key={actividad.id} className="agenda-tarjeta" aria-pressed={seleccionada?.id === actividad.id} onClick={() => setSeleccionada(actividad)}>
          <span className={`agenda-etiqueta ${actividad.tipo}`}>{tipos[actividad.tipo]}</span><strong>{actividad.nombre}</strong>
          <span>{formatoHorario(actividad.inicio)} — {formatoHorario(actividad.fin)}</span><span>{actividad.recinto.nombre}</span>
        </button>)}</div>}
        {seleccionada && <section className="agenda-detalle" aria-label="Detalle de actividad">
          <span className="agenda-estado">{seleccionada.estado}</span><h3>{seleccionada.nombre}</h3>
          <dl><dt>Tipo</dt><dd>{tipos[seleccionada.tipo]}</dd><dt>Cliente</dt><dd>{seleccionada.clienteNombre}</dd>
            <dt>Inicio</dt><dd>{formatoHorario(seleccionada.inicio)}</dd><dt>Término</dt><dd>{formatoHorario(seleccionada.fin)}</dd>
            <dt>Recinto</dt><dd>{seleccionada.recinto.nombre}<br />{seleccionada.recinto.direccion}</dd><dt>Equipos</dt>
            <dd>{seleccionada.reservasEquipo.length ? <ul>{seleccionada.reservasEquipo.map(reserva => <li key={reserva.equipoId}>{reserva.equipo.nombre} × {reserva.cantidad}</li>)}</ul> : 'Sin equipos asignados'}</dd>
          </dl>
          {seleccionada.cotizacion && <div className="agenda-resumen"><h3>Cotización #{seleccionada.cotizacion.id}</h3>
            <ul>{seleccionada.cotizacion.items.map(item => <li key={item.id}>{item.nombreProducto} × {item.cantidad} · {moneda(item.precioCobrado * item.cantidad)}</li>)}</ul>
            <p>Total: <strong>{moneda(seleccionada.cotizacion.totalVenta)}</strong></p>
          </div>}
        </section>}
      </aside>
    </div>
  </section>;
}

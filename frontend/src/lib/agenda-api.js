const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function agendaApi(ruta, { body, signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${base}/api${ruta}`, {
      method: body ? 'POST' : 'GET',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con el servidor. Revisa la conexión e inténtalo nuevamente.');
  }
  let datos;
  try { datos = await respuesta.json(); }
  catch { throw new Error('El servidor no entregó una respuesta válida. Inténtalo nuevamente.'); }
  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || 'No se pudo conectar con la agenda');
    error.conflictos = datos.conflictos || [];
    error.errores = datos.errores || [];
    throw error;
  }
  return datos;
}

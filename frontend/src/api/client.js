export function normalizarBase(base = '') {
  const limpia = base.trim().replace(/\/+$/, '');
  return limpia ? (/\/api$/.test(limpia) ? limpia : `${limpia}/api`) : '/api';
}

export function crearCliente({ base = '', fetchImpl = (...args) => fetch(...args), onUnauthorized } = {}) {
  const destino = normalizarBase(base);
  return async function solicitar(ruta, { method = 'GET', body, signal, headers, ...opciones } = {}) {
    const esFormulario = typeof FormData !== 'undefined' && body instanceof FormData;
    let respuesta;
    try {
      respuesta = await fetchImpl(`${destino}/${ruta.replace(/^\/+/, '')}`, {
        ...opciones, method, signal, credentials: 'include',
        headers: { Accept: 'application/json', 'X-Requested-With': 'NES-Eventos', ...(body !== undefined && !esFormulario ? { 'Content-Type': 'application/json' } : {}), ...headers, },
        ...(body !== undefined ? { body: esFormulario ? body : JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error;
      throw new Error('No se pudo conectar con el servidor. Revisa la conexión e inténtalo nuevamente.', { cause: error });
    }
    let datos = null;
    let contenido;
    try { contenido = await respuesta.text(); }
    catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error;
      throw new Error('No se pudo leer la respuesta del servidor. Inténtalo nuevamente.', { cause: error });
    }
    if (contenido.trim()) {
      try { datos = JSON.parse(contenido); }
      catch {
        const error = new Error(`El servidor no entregó una respuesta JSON válida (HTTP ${respuesta.status}).`);
        error.status = respuesta.status;
        throw error;
      }
    }
    if (!respuesta.ok) {
      const detalles = datos?.detalles || [];
      const errores = datos?.errores || [];
      const mensajeValidacion = [...detalles, ...errores].map(item => item.message || item.mensaje).filter(Boolean).join('\n');
      const error = new Error(mensajeValidacion || datos?.mensaje || datos?.error || `Error HTTP ${respuesta.status}`);
      Object.assign(error, { status: respuesta.status, datos, detalles, errores, conflictos: datos?.conflictos || [] });
      if (respuesta.status === 401 && !/^\/?auth\//.test(ruta)) onUnauthorized?.();
      throw error;
    }
    return datos;
  };
}

export const solicitar = crearCliente({
  base: import.meta.env?.VITE_API_URL || '',
  onUnauthorized: () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nes:sesion-expirada'));
  },
});

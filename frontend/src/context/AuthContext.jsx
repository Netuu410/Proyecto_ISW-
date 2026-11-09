import { useEffect, useState } from 'react';
import * as authApi from '../api/auth.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authApi.obtenerSesion({ signal: controller.signal })
      .then(datos => { if (!controller.signal.aborted) setUsuario(datos.usuario); })
      .catch(err => {
        if (controller.signal.aborted) return;
        if (err.status === 401) setUsuario(null);
        else setError(err.message);
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [intento]);

  useEffect(() => {
    const expirar = () => setUsuario(null);
    window.addEventListener('nes:sesion-expirada', expirar);
    return () => window.removeEventListener('nes:sesion-expirada', expirar);
  }, []);

  async function entrar(datos) {
    const resultado = await authApi.iniciarSesion(datos);
    setUsuario(resultado.usuario);
  }

  async function salir() {
    await authApi.cerrarSesion();
    setUsuario(null);
  }

  function reintentar() {
    setCargando(true);
    setError('');
    setIntento(n => n + 1);
  }

  return <AuthContext.Provider value={{ usuario, cargando, error, entrar, salir, reintentar }}>
    {children}
  </AuthContext.Provider>;
}


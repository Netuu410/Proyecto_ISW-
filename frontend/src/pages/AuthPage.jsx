import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { registrarUsuario } from '../api/auth.js';

export default function AuthPage({ registro = false }) {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const desde = location.state?.desde || '/';

  if (usuario) return <Navigate to={desde} replace />;

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    setError('');
    if (registro && password !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      if (registro) {
        await registrarUsuario({ nombre, email, password });
        navigate('/login', { replace: true, state: { desde, registrado: true } });
      } else {
        await entrar({ email, password });
        navigate(desde, { replace: true });
      }
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  const campo = 'mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100';

  return <div className="mx-auto max-w-md py-8 md:py-16">
    <div className="mb-8 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">NES Eventos</p>
      <h1 className="mt-3 text-3xl font-black text-slate-900">{registro ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}</h1>
      <p className="mt-3 text-slate-600">{registro ? 'Regístrate para comenzar a gestionar tus eventos.' : 'Ingresa para gestionar tus eventos, equipos y cotizaciones.'}</p>
    </div>
    <form onSubmit={enviar} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {!registro && location.state?.registrado && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Cuenta creada. Ya puedes iniciar sesión.</p>}
      {error && <p role="alert" className="whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {registro && <label className="block text-sm font-semibold text-slate-700" htmlFor="nombre">Nombre
        <input id="nombre" name="nombre" autoComplete="name" required maxLength={120} value={nombre} onChange={e => setNombre(e.target.value)} disabled={enviando} className={campo} />
      </label>}
      <label className="block text-sm font-semibold text-slate-700" htmlFor="email">Correo electrónico
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={enviando} className={campo} />
      </label>
      <label className="block text-sm font-semibold text-slate-700" htmlFor="password">Contraseña
        <input id="password" name="password" type="password" autoComplete={registro ? 'new-password' : 'current-password'} required minLength={registro ? 8 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={enviando} className={campo} />
      </label>
      {registro && <>
        <p className="text-xs text-slate-500">Usa entre 8 y 128 caracteres.</p>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="confirmacion">Repite tu contraseña
          <input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" required maxLength={128} value={confirmacion} onChange={e => setConfirmacion(e.target.value)} disabled={enviando} className={campo} />
        </label>
      </>}
      <button type="submit" disabled={enviando} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
        {enviando ? 'Procesando…' : registro ? 'Crear cuenta' : 'Iniciar sesión'}
      </button>
      <p className="text-center text-sm text-slate-600">
        {registro ? '¿Ya tienes una cuenta? ' : '¿Aún no tienes cuenta? '}
        <Link to={registro ? '/login' : '/registro'} state={{ desde }} className="font-bold text-indigo-600 hover:underline">
          {registro ? 'Inicia sesión' : 'Regístrate'}
        </Link>
      </p>
    </form>
  </div>;
}

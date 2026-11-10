import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';

export default function RutaPrivada({ roles }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname + location.search + location.hash }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
}

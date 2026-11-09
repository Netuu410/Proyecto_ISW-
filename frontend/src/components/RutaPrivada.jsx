import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';

export default function RutaPrivada() {
  const { usuario } = useAuth();
  const location = useLocation();
  return usuario ? <Outlet /> : <Navigate to="/login" replace state={{ desde: location.pathname + location.search + location.hash }} />;
}

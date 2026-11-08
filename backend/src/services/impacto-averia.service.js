import { ocupacionMaxima } from './disponibilidad.service.js';

export function reservasAfectadas(reservas, capacidad) {
  const ocupaciones = reservas.map(reserva => ({ ...reserva.actividad, cantidad: reserva.cantidad }));
  return reservas.flatMap(({ actividad, cantidad }) => {
    // Cuenta el máximo simultáneo, no suma reservas de horarios consecutivos.
    const faltantes = Math.max(0, ocupacionMaxima(ocupaciones, actividad.inicio, actividad.fin) - capacidad);
    return faltantes ? [{ ...actividad, cantidad, faltantes }] : [];
  });
}

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short',
});

export function describirImpacto(afectadas) {
  if (!afectadas.length) return 'Sin reservas futuras afectadas al momento del reporte.';
  return [
    'Reservas futuras afectadas al momento del reporte (hora de Chile continental):',
    ...afectadas.map(actividad =>
      `• #${actividad.id} ${actividad.nombre}: ${formatoFecha.format(new Date(actividad.inicio))} a ${formatoFecha.format(new Date(actividad.fin))}. Reserva: ${actividad.cantidad} unidad(es). Faltan hasta ${actividad.faltantes} unidad(es) en ese horario.`),
    'Si las actividades coinciden, el faltante es compartido: no se suman los faltantes de cada actividad. Las reservas se conservan; logística debe revisar su cobertura.',
  ].join('\n');
}

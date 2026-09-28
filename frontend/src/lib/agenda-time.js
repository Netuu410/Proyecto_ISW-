export const ZONA_AGENDA = 'America/Santiago';
const partesFormato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_AGENDA, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function fechaHoraLocal(instante) {
  const partes = Object.fromEntries(partesFormato.formatToParts(new Date(instante)).map(p => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

// Independiente de la zona del navegador. Rechaza horas inexistentes o ambiguas
// en cambios de hora; nunca desplaza silenciosamente lo elegido por el usuario.
export function aInstanteSantiago(local) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Completa la fecha y la hora');
  const pared = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(pared) || new Date(pared).toISOString().slice(0, 16) !== local) {
    throw new Error('Fecha u hora inválida');
  }
  const offsets = new Set();
  for (let horas = -36; horas <= 36; horas += 6) {
    const muestra = pared + horas * 3600000;
    offsets.add(Date.parse(`${fechaHoraLocal(muestra)}:00Z`) - muestra);
  }
  const candidatos = [...offsets].map(offset => pared - offset)
    .filter(instante => fechaHoraLocal(instante) === local);
  if (!candidatos.length) throw new Error('Esa hora no existe en Santiago por el cambio de horario. Elige otra hora.');
  if (candidatos.length > 1) throw new Error('Esa hora se repite por el cambio de horario de Santiago. Elige una hora fuera de ese tramo.');
  return new Date(candidatos[0]).toISOString();
}

export function moverMes(mes, delta) {
  const [year, month] = mes.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function diasDelCalendario(mes) {
  const primero = new Date(`${mes}-01T12:00:00Z`);
  const lunes = new Date(+primero - ((primero.getUTCDay() + 6) % 7) * 86400000);
  return Array.from({ length: 42 }, (_, i) => new Date(+lunes + i * 86400000).toISOString().slice(0, 10));
}

export function rangoMes(mes) {
  const dias = diasDelCalendario(mes);
  const siguiente = new Date(Date.parse(`${dias.at(-1)}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  // En Santiago algunas medianoches no existen. El rango visual comienza en
  // lunes, pero se usa 01:00 del día anterior para incluir cualquier actividad.
  const anterior = new Date(Date.parse(`${dias[0]}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  return { desde: aInstanteSantiago(`${anterior}T01:00`), hasta: aInstanteSantiago(`${siguiente}T01:00`) };
}

export const formatoHorario = instante => new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA_AGENDA, dateStyle: 'short', timeStyle: 'short',
}).format(new Date(instante));

export const ocurreEnDia = (actividad, dia) =>
  fechaHoraLocal(actividad.inicio).slice(0, 10) <= dia &&
  fechaHoraLocal(new Date(+new Date(actividad.fin) - 1)).slice(0, 10) >= dia;

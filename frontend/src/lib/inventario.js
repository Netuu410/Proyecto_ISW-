export function resumirInventario(equipos) {
  return equipos.reduce((total, equipo) => ({
    todos: total.todos + equipo.stock,
    disponibles: total.disponibles + equipo.unidadesDisponiblesAhora,
    enUso: total.enUso + equipo.unidadesEnUso,
    mantenimiento: total.mantenimiento + equipo.stockAveriado,
  }), { todos: 0, disponibles: 0, enUso: 0, mantenimiento: 0 });
}

export function filtrarInventario(equipos, filtro, busqueda = '', categoria = '') {
  const campos = { disponibles: 'unidadesDisponiblesAhora', enUso: 'unidadesEnUso', mantenimiento: 'stockAveriado' };
  // Permite buscar sin distinguir mayúsculas ni tildes.
  const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const consulta = normalizar(busqueda);
  return equipos.filter(equipo =>
    (filtro === 'todos' || equipo[campos[filtro]] > 0) &&
    (!categoria || equipo.categoria === categoria) &&
    (!consulta || normalizar(equipo.nombre).includes(consulta)));
}

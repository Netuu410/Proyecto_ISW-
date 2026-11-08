export function resumirInventario(equipos) {
  return equipos.reduce((total, equipo) => ({
    todos: total.todos + equipo.stock,
    disponibles: total.disponibles + equipo.unidadesDisponiblesAhora,
    enUso: total.enUso + equipo.unidadesEnUso,
    mantenimiento: total.mantenimiento + equipo.stockAveriado,
  }), { todos: 0, disponibles: 0, enUso: 0, mantenimiento: 0 });
}

export function filtrarInventario(equipos, filtro) {
  const campos = { disponibles: 'unidadesDisponiblesAhora', enUso: 'unidadesEnUso', mantenimiento: 'stockAveriado' };
  return filtro === 'todos' ? equipos : equipos.filter(equipo => equipo[campos[filtro]] > 0);
}

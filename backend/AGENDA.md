# Calendario central y bloqueo de traslapes

Responsable: José Arellano. Base de implementación: `main`, commit `87daab4`.

## Alcance y reglas confirmadas

- Actividades `EVENTO` y `VISITA_TECNICA`, ambas con cliente, recinto, inicio y término.
- Cliente registrado como `clienteNombre`; no se inventa una relación con el `clienteId` de cotizaciones, que todavía no tiene entidad de cliente.
- Equipos opcionales, seleccionados por ID de `Equipo` y cantidad entera del stock existente.
- Inicio incluido y término excluido: `[inicio, fin)`. Se permiten reservas consecutivas sin margen automático.
- Ambos tipos de actividad bloquean el recinto completo. Otros recintos y equipos independientes pueden reservarse simultáneamente.
- Interfaz en `America/Santiago`, persistencia de agenda con `TIMESTAMPTZ(3)`. La API requiere ISO 8601 con `Z` u offset explícito.
- Se admiten intervalos que cruzan medianoche o varios días. La interfaz rechaza horas inexistentes o ambiguas durante los cambios de horario, con un mensaje explícito.
- Confirmación en estado `Reservado`. El cliente HTTP no puede elegir ni alterar ese estado.

## Datos e integración

`Recinto` identifica un espacio reservable. Su nombre y dirección normalizados evitan duplicados triviales. Se deben reutilizar sus ID: escribir un nombre alternativo para el mismo espacio no crea capacidad física nueva.

`ActividadAgenda` registra el horario y, mediante `recintoId`, la reserva temporal del recinto. No existe una segunda copia de sus fechas para el recinto.

`ReservaEquipo` relaciona actividad y equipo con cantidad. Usa el intervalo de la actividad, sin duplicarlo. Stock y estado operativo del inventario no se modifican por reservas futuras.

Al confirmar un evento se crea el `Evento` del módulo existente dentro de la misma transacción y se enlaza mediante `eventoId` único. Las visitas no crean `Evento`. Las evaluaciones y sus relaciones permanecen intactas. Los eventos antiguos sin horario de término, cliente o recinto no se convierten automáticamente: falta información para reservarlos.

## Contrato compartido con Control de Equipos

Archivo: `src/services/disponibilidad.service.js`.

1. `bloquearRecursos(tx, { recintoId, equipos })` bloquea el recinto y después los equipos ordenados por ID. Debe ejecutarse dentro de la misma transacción que confirmará todas las reservas.
2. `consultarDisponibilidad(tx, { inicio, fin, recintoId, equipos })` devuelve todos los conflictos detectados. Comprueba existencia, estado operativo y máximo de unidades simultáneamente comprometidas durante el intervalo.
3. `crearActividad(datos, db)` en `agenda.service.js` coordina esas funciones y guarda evento, actividad y reservas mediante una transacción `ReadCommitted`.

No basta con invocar la preconsulta y guardar después. Todo futuro flujo que asigne equipos debe usar este contrato y la misma transacción; no debe insertar reservas ni reducir stock comprometido sin coordinar su disponibilidad. El módulo de averías actual no fue modificado: conserva su alerta general sobre compromisos futuros. Vincular esa alerta con actividades concretas es una integración posterior con Martina.

El cálculo de stock usa el máximo simultáneo, no la suma de todas las reservas que intersectan la consulta. Dos reservas consecutivas de dos unidades ocupan como máximo dos unidades, no cuatro.

## Concurrencia y atomicidad

- PostgreSQL aplica una exclusión GiST por recinto y rango, también ante inserciones ajenas al servicio. Requiere la extensión `btree_gist`, incluida en la migración.
- Las filas de equipos se bloquean antes de consultar reservas. Tras esperar un bloqueo, `ReadCommitted` permite leer lo que acaba de confirmar el otro usuario.
- El orden de bloqueo es estable y no existe un bloqueo global de toda la agenda.
- La comprobación, creación de `Evento`, actividad y reservas de equipos pertenecen a una sola transacción. Cualquier excepción provoca rollback.
- Las reservas de equipos deben pasar por el servicio compartido: no hay una restricción SQL de capacidad agregada que proteja inserciones manuales arbitrarias en `ReservaEquipo`.
- La consulta de disponibilidad es orientativa y usa una lectura consistente. La confirmación siempre vuelve a comprobar.

## API

| Método y ruta | Función |
|---|---|
| `GET /api/agenda/recintos` | Listar recintos. |
| `POST /api/agenda/recintos` | Registrar `{ nombre, direccion }`. |
| `GET /api/agenda/actividades?desde=...&hasta=...&tipo=...` | Consultar actividades que intersectan el intervalo; `tipo` opcional, rango máximo de 93 días. |
| `GET /api/agenda/actividades/:id` | Obtener cliente, horario, estado, recinto y equipos. |
| `POST /api/agenda/disponibilidad` | Consultar `{ inicio, fin, recintoId, equipos }` sin reservar. |
| `POST /api/agenda/actividades` | Confirmar y guardar la actividad completa. |

Ejemplo de confirmación:

```json
{
  "tipo": "EVENTO",
  "nombre": "Lanzamiento de temporada",
  "clienteNombre": "Cliente de ejemplo",
  "inicio": "2030-10-16T10:00:00-03:00",
  "fin": "2030-10-16T12:00:00-03:00",
  "recintoId": 1,
  "equipos": [{ "equipoId": 1, "cantidad": 2 }]
}
```

Los ID del ejemplo deben existir. Los errores de validación responden `400`; un recurso incompatible responde `409` con `conflictos` indicando tipo, ID, nombre, motivo y, cuando corresponde, actividades superpuestas o cantidad disponible. No se confirma ninguna parte de una solicitud rechazada. Un detalle inexistente responde `404`.

## Instalación y verificación

No se modifica la base habitual por ejecutar el servidor. Antes de aplicar migraciones hay que verificar `DATABASE_URL`, servidor, base y migraciones previas. No usar `db push` para esta funcionalidad: no instala la exclusión definida en SQL.

Para una instalación cuya base e historial ya hayan sido comprobados:

```powershell
cd backend
npm.cmd ci
# Definir DATABASE_URL en este proceso con la conexión ya verificada.
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run dev
```

El backend existente lee la variable de entorno del proceso; no se agregó un cargador de `.env` al arranque. El frontend se inicia con `npm.cmd run dev`, abre `/calendario` y usa `http://localhost:3000` por defecto. Se puede definir `VITE_API_URL` para otra URL de backend.

Pruebas unitarias: `npm.cmd test` en backend (las pruebas de integración se omiten sin habilitación explícita). Horarios: `node --test test/agenda-time.test.js` en frontend. Compilación y análisis: `npm.cmd run build` y `npm.cmd run lint` en frontend.

Integración real sobre una base aislada:

```powershell
# AGENDA_TEST_DATABASE_URL debe apuntar explícitamente a localhost/nes_agenda_test.
# El script verifica la conexión real antes de aplicar migraciones.
node scripts/verificar-agenda.mjs
```

Este script se ejecuta desde backend, genera Prisma, aplica migraciones únicamente a esa base de pruebas y ejecuta todos los archivos `test/*.test.js`. Las pruebas crean datos con prefijos propios y no limpian ni reinician una base compartida.

Para navegador, iniciar backend contra la misma base de pruebas, frontend en `127.0.0.1:5173` y un perfil temporal de Edge con CDP en `127.0.0.1:9222`. Ejecutar `node scripts/verificar-agenda-browser.mjs` desde frontend con `AGENDA_TEST_DATABASE_URL`. El script comprueba que el backend ve un recinto creado en esa base antes de confirmar actividades. Guarda capturas en `docs/`.

## Límites del alcance

- El proyecto base no tiene autenticación ni roles. Estas rutas siguen ese estado; el acceso exclusivo de administrador/coordinador queda pendiente de integrar con una identidad autenticada del proyecto. No se simulan permisos con un selector ni con una cabecera controlada por el cliente.
- No se implementaron cancelación, reprogramación, recurrencia, arrastrar actividades ni sincronización en vivo entre navegadores. La consulta se actualiza al confirmar, cambiar de período/filtro o pulsar Actualizar.
- La vida posterior del evento y los estados de agenda deben coordinarse antes de añadir finalización/cancelación. La regla existente de evaluación de eventos `Finalizado` permanece sin cambios.
- No se añaden restricciones de colaboradores, vehículos, traslado o montaje.
- Averías posteriores y reducción futura de stock requieren coordinar sus efectos sobre reservas existentes con Martina.

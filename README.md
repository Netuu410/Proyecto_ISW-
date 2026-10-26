# NES Eventos: ejecución local

La aplicación utiliza PostgreSQL del `docker-compose.yml`, idéntico al de `origin/main`. Backend y frontend se ejecutan en Windows; PostgreSQL se ejecuta en Docker.

| Componente | Dirección |
|---|---|
| Frontend | http://localhost:5173/calendario |
| Backend | http://localhost:3000 |
| PostgreSQL | `127.0.0.1:5444`, base `nes_eventos`, contenedor `nes_postgres` |

Entorno comprobado: Node 24, npm 11 y Docker Desktop con contenedores Linux.

## 1. Iniciar PostgreSQL

Con Docker Desktop abierto, desde la raíz del repositorio:

```powershell
docker compose up -d postgres
docker compose ps
```

Los datos persisten en el volumen `postgres_data` del proyecto Compose. No es necesario recrear el volumen para ejecutar la aplicación.

## 2. Preparar el backend

```powershell
cd backend
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate status
```

`backend/.env` debe contener la conexión indicada en `.env.example`, que usa las credenciales locales definidas por Compose. El archivo `.env` está excluido de Git.

Para una base nueva, o con migraciones pendientes y cuyo destino e historial se hayan verificado, aplicar las migraciones existentes:

```powershell
npx.cmd prisma migrate deploy
```

La integración de cotizaciones y agenda agrega las migraciones `20261015000000_cotizacion_agenda` y `20261015010000_cotizar_inventario`. Aplicarlas antes de ejecutar esta versión. No usar `prisma migrate reset`, `db push` o eliminación de volúmenes para preparar esta base existente.

## Cotizar y agendar un evento

1. Crear el producto en **Inventario**, indicando precio, stock y costo interno opcional. El producto aparece directamente en Cotizaciones, sin crear otro registro en Catálogo.
2. En **Cotizaciones**, indicar el cliente, seleccionar productos del inventario y sus cantidades, y pulsar **Guardar cotización**. Los nombres, precios unitarios y costos se conservan aunque después cambie el inventario.
3. Pulsar **Agendar esta cotización**, o abrir Calendario → **Agendar actividad** y seleccionar una cotización pendiente.
4. Elegir recinto, inicio y término; consultar disponibilidad y confirmar la reserva. El servidor incluye siempre los equipos cotizados y comprueba nuevamente su disponibilidad. El formulario de calendario no crea cotizaciones.
5. Seleccionar el evento en el calendario para ver el recinto, los equipos y la cotización asociada.

Si el recinto está ocupado o se cierra el formulario, la cotización sigue disponible en el selector del calendario. Una cotización puede agendarse una sola vez. Las cotizaciones históricas del antiguo catálogo mantienen su detalle y precios; aquellas sin equipos capturados requieren asignarlos al agendar. Las tablas del antiguo catálogo se conservan para ese historial, y las nuevas cotizaciones usan directamente Inventario.

Las visitas técnicas siguen disponibles eligiendo ese tipo de actividad, sin exigir cotización. Agregar equipos adicionales al agendar no cambia el precio cotizado. El total se calcula con precio unitario por cantidad, sin multiplicarlo automáticamente por la duración del evento.

Prueba opcional de integración local: desde `backend`, ejecutar `$env:RUN_AGENDA_INTEGRATION='1'` y `node --env-file=.env --test tests/cotizacion-agenda.test.js`. Crea fixtures dentro de una transacción que se revierte al terminar, sin dejar registros. Las pruebas unitarias habituales no necesitan PostgreSQL.

## 3. Ejecutar backend y frontend

### Averías por unidades

Aplicar también la migración `20261024000000_averias_por_cantidad` y regenerar Prisma antes de iniciar. En el detalle del inventario, indicar la cantidad dañada: con 5 unidades totales y 1 averiada quedan 4 operativas. El stock total se conserva; el estado pasa a Mantenimiento solo cuando todas están averiadas. Cotizaciones y nuevas reservas usan las unidades operativas.

El backend rechaza cantidades inválidas, excesivas y equipos asignados a un evento activo. Las reservas futuras existentes se conservan: la alerta de stock pide revisar esos compromisos. En el detalle, el apartado Sacar de mantenimiento permite registrar unidades reparadas y una nota opcional. Se conserva el historial de averías y se guarda cada reparación; las alertas anteriores son históricas. Aplicar también la migración 20261024010000_reparaciones_equipo.

Los equipos que ya estaban en Mantenimiento conservan todas sus unidades bloqueadas. La cantidad de los reportes históricos queda vacía porque antes no se registraba; no se inventa un dato histórico.

Prueba manual: crear un equipo con stock 5, reportar 1 unidad y comprobar 5 totales / 1 en mantenimiento / 4 operativas. Intentar reportar 5 debe fallar; reportar las 4 restantes debe dejarlo en Mantenimiento. Para probar con PostgreSQL local y rollback, ejecutar desde backend: `node --env-file=.env --test tests/averias.test.js` con la variable `RUN_AVERIAS_INTEGRATION=1`.

Primera terminal, desde `backend`:

```powershell
npm.cmd run dev
```

También puede utilizarse `npm.cmd start` para arrancar sin vigilancia de archivos. Ambos scripts cargan `.env` con la opción nativa de Node `--env-file`.

Segunda terminal, desde `frontend`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://localhost:5173/calendario. El frontend utiliza `http://localhost:3000` como API por defecto; no requiere cambios para esta configuración.

Si la terminal heredó una `DATABASE_URL` de pruebas, esa variable prevalece sobre `.env`. Para utilizar la configuración local de Compose en esa terminal:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm.cmd run dev
```

## Pruebas y documentación de Agenda

`npm.cmd test` desde `backend` ejecuta las pruebas sin habilitar integración. Las pruebas que crean reservas, provocan concurrencia o comprueban rollback deben seguir usando la base aislada `nes_agenda_test`, mediante `AGENDA_TEST_DATABASE_URL` y el script `backend/scripts/verificar-agenda.mjs`. Esa base no es la conexión habitual de la aplicación.

El contrato de Agenda, las reglas de reservas y la verificación en navegador están documentados en [backend/AGENDA.md](backend/AGENDA.md). La configuración de Compose se conserva sin modificaciones.

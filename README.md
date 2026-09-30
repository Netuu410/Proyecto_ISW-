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

La base local `nes_eventos` fue comprobada el 28 de septiembre de 2026: tiene las cinco migraciones aplicadas, incluida Agenda, y no necesitó ninguna migración adicional. No usar `prisma migrate reset`, `db push` o eliminación de volúmenes para preparar esta base existente.

## 3. Ejecutar backend y frontend

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

# Ejecución y despliegue de NES Eventos

## Recorrido y contratos

Página/componente → servicio en `frontend/src/api/` → `client.js` → ruta Express `/api/...` → controlador → servicio backend → Prisma → PostgreSQL.

El cliente compartido normaliza la URL, serializa JSON y maneja estados HTTP, fallos de red, cancelaciones, respuestas vacías y respuestas no JSON. Conserva `status`, `datos`, `detalles`, `errores` y `conflictos` en errores HTTP. Agenda conserva su comprobación de disponibilidad y confirmación de reservas; `lib/agenda-api.js` solo delega por compatibilidad.

Catálogo mantiene GET (arreglo) y POST (201, objeto). Cotizaciones mantiene POST (201, objeto con `items`, `totalVenta`, `gananciaNeta`). Validación: 400 con `mensaje` y `detalles`; producto inexistente: 404 con `mensaje`. El backend usa precios y costos de la base, nunca los enviados por el navegador. Una sola creación Prisma anidada guarda cabecera y detalles atómicamente. No se modifica `prisma/schema.prisma` ni se crean migraciones.

`clienteId` es un entero, sin modelo Cliente, clave foránea ni API de clientes. Agenda tiene `clienteNombre`, que no es una fuente de identificadores. La pantalla ahora exige el ID explícito; no comprueba que represente un cliente real. Vincularlo a clientes requiere un requisito posterior. Tampoco se incorpora CRUD completo ni se cambia el tipo monetario Float.

## Desarrollo local

Se comprobó Node 24.21.0 en este equipo. Backend requiere Node >=22.13 para `--env-file-if-exists`; frontend requiere una versión compatible con su Vite instalado (usar Node 24 en ambos). Mantener los lockfiles y usar `npm ci`.

En backend:

```sh
cd backend
npm ci
# Copiar .env.example a .env y completar DATABASE_URL local.
npx prisma generate
# Solo sobre la base de desarrollo prevista, aplicar migraciones existentes:
npx prisma migrate deploy
npm run dev
```

En otra terminal:

```sh
cd frontend
npm ci
# .env es opcional: el cliente usa /api y Vite lo redirige al backend local.
npm run dev
```

`API_PROXY_TARGET` permite cambiar el destino local de Vite. El valor por defecto es `http://localhost:3000`, exclusivamente en configuración de desarrollo. No es necesario activar CORS al usar este proxy.

## Variables

Frontend: `VITE_API_URL` vacío usa `/api`. Para otro dominio configurar el origen completo de la API, sin `/api`: `https://<origen-backend>`. El cliente agrega `/api` y acepta un `/api` final por compatibilidad sin duplicarlo. No incluir rutas de módulos. Las variables `VITE_*` son públicas y quedan incorporadas al compilar: cambiar una exige recompilar. Nunca poner claves, contraseñas ni DATABASE_URL en frontend.

Backend: `DATABASE_URL` solo en backend; `PORT` es el puerto interno asignado por el administrador (3000 es únicamente el valor local por defecto); `CORS_ORIGINS` es una lista de orígenes completos separados por comas, sin rutas ni barra final. Vacío no habilita accesos de otros orígenes del navegador. Configurar la lista cuando se usen dominios separados. Los procesos aceptan variables del servidor sin archivo `.env`; si existe `.env`, las variables del proceso tienen precedencia. `.env` y `.env.*` están excluidos de Git salvo `.env.example`. No copiar archivos de secretos a la carpeta pública.

## Producción en el servidor universitario: Express y PM2

La guía proporcionada indica que el backend sirve también `frontend/dist`. NES Eventos ya implementa ese comportamiento cuando `NODE_ENV=production`: un solo proceso Express sirve la API y el build de React. No se necesita un proceso PM2 para Vite ni instalar Nginx para este esquema.

Este repositorio contiene ambas carpetas; se copia o clona una sola vez conservando `backend/` y `frontend/` como hermanas. Nuestro archivo de arranque es `backend/src/index.js`, NO `backend/index.js`. Los cambios locales aún no están en un commit: clonar el remoto ahora no los incluiría. Primero debe transferirse la versión preparada por el mecanismo autorizado para la entrega; no se hicieron commits ni push automáticamente.

Desde la raíz de la copia del proyecto en el servidor (comandos Linux):

```sh
node --version
pm2 --version
cd frontend
npm ci
# Solo si aún no existe; no sobrescribir una configuración previa.
cp -n .env.production.example .env.production
# Confirmar VITE_API_URL=/api. No añadir credenciales al frontend.
nano .env.production
npm run build

cd ../backend
npm ci
cp -n .env.example .env
nano .env
```

El `.env` del backend está en `backend/.env`, no en `src/env`. Completar `DATABASE_URL` con las credenciales asignadas y `PORT` con el puerto INTERNO indicado por la universidad. La guía muestra `PORT=80`; utilizarlo si ese es el puerto interno de su entorno. El puerto externo del enlace público puede ser distinto debido al mapeo de la universidad. Si aparece `EACCES` al escuchar en 80, confirmar permisos/mapeo con el administrador; no ejecutar la aplicación como root por defecto. Mantener `CORS_ORIGINS=` vacío para frontend y API en el mismo origen.

Continuar dentro de `backend`, una vez revisado el destino de la base:

```sh
npx prisma generate
npx prisma migrate deploy
pm2 start ecosystem.config.cjs
pm2 save
pm2 list
pm2 logs nes-eventos --lines 100
```

`ecosystem.config.cjs` fija el directorio de trabajo en `backend`, ejecuta `src/index.js`, carga `.env` si existe y establece `NODE_ENV=production`. Por eso no se debe copiar literalmente `pm2 start index.js --name backend` de la guía. El proceso se llama `nes-eventos`. Requiere Node compatible con `--env-file-if-exists` (se comprobó Node 24 localmente); PM2 debe utilizar esa misma instalación de Node. La configuración usa las opciones documentadas de [PM2](https://pm2.keymetrics.io/docs/usage/application-declaration/).

Compilar frontend ANTES de iniciar PM2: en producción se falla con un mensaje explícito si falta `frontend/dist/index.html`. El fallback de Express devuelve `index.html` para recargar `/inventario`, `/cotizaciones`, `/colaboradores` y `/calendario`. Los errores `/api` conservan respuestas JSON y los archivos inexistentes devuelven 404. El comodín se ajusta a [Express 5](https://expressjs.com/en/guide/migrating-5/).

Los comandos de migración anteriores se documentan para la ejecución en el servidor; no se ejecutaron durante este trabajo. Hacer respaldo y revisar migraciones antes de aplicarlas. No usar `migrate dev`, reset ni db push en producción. Una base sin las tablas correspondientes puede dar `P2021`; comprobar `migrate deploy`, no recrear la base.

### URL y comprobaciones de la entrega

Con el esquema de un solo proceso, usar el MISMO puerto externo para frontend y API:

- Navegador: `http://146.83.198.35:<PUERTO_EXTERNO_ASIGNADO>/`
- Postman: GET `http://146.83.198.35:<PUERTO_EXTERNO_ASIGNADO>/api/catalogo`
- También comprobar GET `/api/equipos` y `/api/colaboradores` (sin escrituras).
- Abrir `/cotizaciones` y recargar: debe cargar React, sin 404.
- GET `/api/no-existe` debe dar 404 JSON, no la página HTML.

La guía menciona puertos externos distintos para backend y frontend, pero también dice que Express sirve ambos. Esa distinción no es necesaria en este esquema; confirmar el mapeo asignado, sin inventar puertos. Si realmente exigen dos orígenes, seguir la sección de dominios separados.

Capturas pendientes de tomar en el servidor: `pm2 list`, `pm2 logs nes-eventos`, Postman con URL/estado/respuesta visibles y navegador mostrando la URL pública y la aplicación. No se han generado evidencias remotas ni enviado correos. Ocultar credenciales si aparecen en alguna captura.

### Reinicio y actualización

```sh
# Después de actualizar archivos y recompilar frontend cuando corresponda:
pm2 restart ecosystem.config.cjs --update-env
pm2 save
# Restaurar la lista guardada si PM2 perdió los procesos:
pm2 resurrect
```

`pm2 save` guarda la lista; confirmar con la universidad cómo se inicia PM2 al reiniciar el servidor. `pm2 resurrect` permite restaurarla manualmente. No añadir otro proceso frontend. Cambiar una variable VITE exige recompilar; cambiar variables backend exige reiniciar. El alojamiento aquí presupone la raíz de la URL pública; para un subdirectorio hay que coordinar Vite, React Router y el mapeo del servidor.

## Dominios separados y pendientes

Compilar frontend con `VITE_API_URL` del backend y establecer `CORS_ORIGINS` con el origen real del frontend. Ambos deben tener HTTPS configurado por el administrador. Se mantiene el fallback React en el servidor del frontend. No cambiar DATABASE_URL ni exponer PostgreSQL al navegador.

La guía ya identifica PM2 y la IP pública. Falta confirmar: puerto externo asignado y su mapeo al interno, raíz o subdirectorio, versión de Node/PM2, ruta de archivos, acceso a PostgreSQL, HTTPS, arranque de PM2 tras reinicios y política de respaldos/migraciones.

Bloqueo para exposición pública: las rutas actuales no tienen autenticación ni permisos de acceso. CORS no los reemplaza y no impide llamadas directas fuera del navegador. La universidad debe restringir la exposición hasta resolver autenticación/autorización en un trabajo aparte. También quedan pendientes el directorio real de clientes y la decisión sobre precisión monetaria.

## Comparación con ObjetosPerdidosUBB

Se revisó el código público de la rama `main` de [ObjetosPerdidosUBB](https://github.com/Dvniiel19/ObjetosPerdidosUBB). El usuario informa que ese proyecto ya se subió al servidor. El repositorio permite comparar la aplicación, pero no confirma qué revisión, variables ni configuración externa están funcionando allí.

| Aspecto | ObjetosPerdidosUBB (`main`) | NES Eventos local |
| --- | --- | --- |
| Tecnologías | React/Vite, Express 4, Prisma 6 y PostgreSQL | React/Vite, Express 5, Prisma 5 y PostgreSQL; no hace falta igualar versiones para desplegar |
| API frontend | Cliente `pedir()` y servicios; `VITE_API_URL` sin valor por defecto | Cliente compartido y servicios; `/api` por defecto |
| Prefijo | Sus servicios piden `/objetos`, etc.; la variable debe incluir `/api` para sus rutas Express | Se configura el origen sin `/api`; el cliente lo agrega y acepta un `/api` final por compatibilidad |
| Inicio backend | `npm start` → `node index.js`, carga `dotenv` y conecta Prisma antes de escuchar | `npm start` usa carga opcional de `.env` de Node; Prisma conecta cuando se necesita |
| Puerto | `PORT` configurable | `PORT` configurable |
| CORS | `cors()` abierto | Lista explícita `CORS_ORIGINS`; no necesaria para mismo origen |
| Navegación | Vistas elegidas con estado de React en `App.jsx` | React Router: se necesita fallback a `index.html` para recargar rutas |
| Docker Compose | Solo PostgreSQL 16 | Solo PostgreSQL 15; ninguno de los dos Compose despliega frontend ni backend |

Archivos de referencia: [cliente HTTP](https://github.com/Dvniiel19/ObjetosPerdidosUBB/blob/main/frontend/src/services/api.js), [arranque](https://github.com/Dvniiel19/ObjetosPerdidosUBB/blob/main/backend/index.js), [aplicación Express](https://github.com/Dvniiel19/ObjetosPerdidosUBB/blob/main/backend/src/app.js), [navegación](https://github.com/Dvniiel19/ObjetosPerdidosUBB/blob/main/frontend/src/App.jsx) y [Compose](https://github.com/Dvniiel19/ObjetosPerdidosUBB/blob/main/docker-compose.yml).

En el árbol de `main` revisado no aparecen Dockerfiles, configuración Nginx, PM2 ni workflows de despliegue. El README principal solo contiene el nombre del proyecto. Por ello no se puede deducir el procedimiento del servidor a partir de este código. No se inspeccionó la configuración instalada en el servidor ni el contenido de las otras ramas.

Su middleware `usuarioPrueba` también declara pendiente el login real y rechaza su uso con `NODE_ENV=production`; tener dependencias JWT no confirma autenticación completa. No copiar ese mecanismo como solución de acceso para NES Eventos.

Los Compose de ambos proyectos contienen credenciales de desarrollo y publican el puerto de PostgreSQL. El Compose local de NES Eventos no es una configuración de producción: para el servidor usar credenciales propias administradas allí y la conectividad de base acordada con la universidad.

Al obtener el instructivo, confirmar especialmente: rama/revisión que se sube, si entregan una URL raíz o un subdirectorio, cómo publican frontend y `/api`, versión de Node, comando y directorio de arranque, puerto asignado, mecanismo para mantener el proceso y acceso a PostgreSQL. No compartir contraseñas ni archivos `.env` en el chat; basta con los nombres de variables y el procedimiento sin secretos. Con esos datos se pueden reemplazar los marcadores de esta guía por la configuración real.

## Verificación reproducible

```sh
cd frontend
npm test
npm run lint
npm run build
cd ../backend
npm run test:unit
npx prisma validate
```

Las pruebas nuevas viven en `frontend/tests` y `backend/tests`, versionables; no se incorporan las carpetas `test` locales ignoradas. Compilar frontend antes de las pruebas backend: `app.test.js` sirve ese build real por HTTP local y comprueba rutas React, archivos y aislamiento de errores API. Los cálculos y contratos se verifican con Prisma simulado, sin escrituras a PostgreSQL. No se ejecutan pruebas de integración sobre la base habitual. La creación anidada conserva la atomicidad de Prisma; no se ha comprobado contra una base aislada en este trabajo.

Resultado comprobado en este equipo: 9 pruebas frontend y 8 backend aprobadas; lint sin advertencias ni errores; compilación frontend aprobada; generación del cliente Prisma 5.22 y validación del esquema aprobadas. Las nuevas pruebas HTTP locales sirven el build real y comprueban las rutas React, archivos JavaScript, 404 API y validación 400 sin consultar la base. Se comprobó la opción de Node para arrancar sin archivo env, la sintaxis de la configuración PM2, la exclusión de archivos de secretos, la visibilidad de las pruebas nuevas para Git y la ausencia de solicitudes directas/localhost en páginas y componentes. PM2 no está instalado localmente: su ejecución real queda pendiente en el servidor. No se ejecutaron migraciones, integración PostgreSQL, pruebas visuales en navegador ni despliegue universitario.

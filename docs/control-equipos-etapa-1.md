# Control de Equipos — registro de etapa 1

Fecha: 2026-09-27. Estado histórico: diagnóstico terminado. Posteriormente José autorizó la etapa 2; ver [diseño y decisiones actuales](control-equipos-etapa-2.md). La implementación sigue sin autorización.
Fuente: plan facilitado por José en `D:\juegos\Spiderman 2\Plan_Control_Equipos_Codex.md`.

## Alcance y protección

- RAMA_PERSONAL: `Josee`, upstream `origin/Josee`, HEAD `ed39928709e0c3c7dc8a3c522fd97849c9f265b8`. No existe una segunda rama `josee` entre las referencias consultadas.
- Árbol inicialmente limpio. Único archivo añadido en esta etapa: este registro.
- Remoto: https://github.com/Netuu410/Proyecto_ISW-. Fetch completado correctamente.
- `main` local permanece en `9040c77570ed89fb3ad68ffbd2f7b5b1df860567`; actualizar origin/main por fetch no modifica main local.
- No se encontraron AGENTS.md en los directorios ascendentes ni en el árbol del proyecto examinado (excluidos .git y node_modules).
- Sin instalaciones, cambios de aplicación, migraciones nuevas, commits, push, merges, rebase ni borrado de datos.
- Solo está autorizada la etapa 1. Las propuestas siguientes NO son decisiones funcionales aprobadas.

## Referencias revisadas y compatibilidad

Se inspeccionaron árboles, historia desde el ancestro común, diferencias y contratos relevantes. Todas las ramas de colegas consultadas ya son ancestros del origin/main actual; no tienen commits exclusivos respecto de él. No se deducen responsables funcionales de los nombres de rama.

| Rama y SHA | Archivos/módulo y contrato encontrado | Coincidencia con Control de Equipos | Riesgo | Adaptación propuesta |
| --- | --- | --- | --- | --- |
| origin/main — e2b68065c43f43b51b3f0b1934702a05dbbac8b9 | Prisma: CatalogoItem, Cotizacion, DetalleCotizacion; Express /api/catalogo y /api/cotizaciones; React Router con / y /inventario | Base compartida, navegación e inventario visual | No existen Evento, equipo físico ni reserva; pantalla de inventario simulada; desapareció del App la interfaz funcional anterior de catálogo/cotizaciones | Diseñar sobre la navegación integrada, acordar contratos faltantes y preservar acceso a funcionalidades existentes antes de integrar |
| origin/Josee — ed39928709e0c3c7dc8a3c522fd97849c9f265b8 | Corrección YAML de docker-compose.yml; App monolítica con catálogo/cotizaciones reales | Entorno local y funcionalidades actuales | No contiene nueva navegación; origin/main aún conserva YAML inválido | Mantener corrección Compose; solicitar autorización para incorporar origin/main a Josee, sin tocar main |
| origin/Claudioo — ad3adb63dc2b9247fdbaa3c0f8c468d9494552d1 | Catálogo, cotizaciones y cálculo de rentabilidad; IDs Int, cantidades, precios y costos | Posible relación comercial con equipos, aún no acordada | CatalogoItem representa ítem comercial, no unidad física; Cotizacion no es Evento | Reutilizar contratos comerciales sin convertirlos automáticamente en equipo/evento; trabajo ya integrado |
| origin/martina — f240cef6b3e397dca53e8a02241b5834628471fa | App, Navbar, HomePage, InventoryPage, InventoryCard, React Router y Tailwind | Estructura de navegación y presentación reutilizable | mockInventory usa stock y estado global Disponible/En Uso/Mantenimiento; no API ni disponibilidad temporal | Añadir futura página propia y enlace mínimo; no convertir mocks en contrato definitivo ni incluir mantenimiento en el alcance; ya integrado en main |
| origin/tomas — 9040c77570ed89fb3ad68ffbd2f7b5b1df860567 | Base previa de main, sin cambios exclusivos | Mismos contratos backend | No aporta Evento/calendario publicado | Acordar dependencia con el equipo; no inferir trabajo no publicado |

Ancestros comunes con Josee: origin/main y origin/tomas `9040c77570ed89fb3ad68ffbd2f7b5b1df860567`; origin/Claudioo `ad3adb63dc2b9247fdbaa3c0f8c468d9494552d1`; origin/martina `af6b513db0ea580c32593e476767b9156686762a`; origin/Josee coincide con HEAD.

origin/main tiene dos commits ausentes de Josee: `f240cef` y su merge `e2b6806`. Josee tiene la corrección `ed39928` ausente de origin/main. Los cambios entrantes afectan solo frontend (App, estilos, componentes, páginas y dependencias). Backend y migraciones coinciden. No se probó una combinación de ramas ni se garantiza compatibilidad futura.

## Contratos comprobados

- GET /api/catalogo: lista de CatalogoItem. POST /api/catalogo: nombre, categoria, precioVenta y costoInterno; devuelve el ítem creado.
- POST /api/cotizaciones: clienteId e items con catalogoItemId y cantidad; calcula totalVenta/gananciaNeta y devuelve cotización con detalles.
- IDs persistidos Int autoincrementales. clienteId no referencia un modelo Cliente. Cotizacion.fecha es fecha de registro; no representa un período de evento.
- InventoryCard recibe un objeto con id, nombre, categoria, estado, precio, stock, imagen y descripcion. InventoryPage aporta tres objetos estáticos, sin fetch.
- No hay autenticación ni rol de logística publicado. Las tarjetas de Inicio sobre eventos/mantenimiento no son módulos implementados.
- Cobertura CE-01 a CE-13 y CE-17: Control de Equipos aún no implementado; el inventario simulado no acredita esos criterios. CE-14: contratos existentes conservados en backend, pero regresión completa no ejecutada y navegación remota requiere revisión. CE-15: migración actual sincronizada, sin nueva integración probada. CE-16: control de acceso pendiente.

## Estado local y comprobaciones

- Node 24.16.0; instalados Prisma/@prisma/client 5.22.0, Express 5.2.1, Zod 4.6.5, React/React DOM 19.3.0, Vite 8.3.1, Oxlint 1.85.0. npm ls --depth=0 correcto en ambos proyectos. Sin actualizar versiones.
- Docker: PostgreSQL 16 activo, contenedor proyecto_isw--db-1, puerto 5432. Compose local válido.
- Servicio postgresql-x64-18 detenido. En el diagnóstico previo se verificó inicio automático: puede reaparecer el conflicto tras reiniciar.
- backend/.env sigue excluido de Git; no se imprimió su contenido.
- prisma migrate status: conexión correcta a proyecto en localhost:5432; única migración existente aplicada, base actualizada. Solo consulta, sin aplicar cambios.
- GET localhost:3000/api/catalogo y localhost:5173 no conectan actualmente. No se asume que los procesos del diagnóstico anterior continúen activos ni se reinstala por ello.
- No se repitieron build/lint anteriores: esta etapa no cambia código. No hubo pruebas visuales, de escrituras ni de concurrencia. No se afirma integración completa.

## Decisiones pendientes para el diseño

| Tema | Propuesta para acordar | Información que falta |
| --- | --- | --- |
| Unidad reservable | Equipo individual identificable, separado del ítem comercial | Confirmar unidades individuales o stock por cantidades; el stock del mock no decide el modelo |
| Evento | Reutilizar contrato del módulo propietario; si no existe, acordar uno mínimo o adaptador simulado solo de desarrollo | Responsable acordado, tipo de ID, fuente de selección, inicio/fin y estados reservables; no crear Evento duplicado |
| Período | Fecha y hora, visualización America/Santiago y almacenamiento de instantes UTC | Confirmar fechas vs horas, zona, margen de traslado y reglas para pasado; no imponer márgenes o prohibiciones |
| Límites | Intervalos [inicio, fin): permitir iniciar al terminar otra reserva | Confirmación de límites |
| Disponibilidad y alquiler | Calcular desde reservas y vigencia de alquiler; separar ubicación actual | Fuente de vigencia y condiciones no asignables; qué significa prestado durante el intervalo solicitado |
| Bodega/prestado | Reutilizar fuente del inventario, sin cambiar ubicación por reserva futura | No existe fuente persistida publicada; acordar contrato y propietario |
| Varios equipos | Reservas independientes por unidad; conservar éxitos e informar conflictos por código | Actualizado por instrucción posterior de José; ver etapa 2 |
| Permisos | Reutilizar autenticación cuando exista y declarar pendiente mientras falte | Contrato/rol del equipo; no crear autenticación nueva |
| Navegación y regresión | Reutilizar Router/Navbar de main y conservar acceso a catálogo/cotizaciones | Autorizar integración en Josee y acordar ubicación de las pantallas anteriores que main reemplazó |

## Archivos propuestos para etapas posteriores

Nombres sujetos al diseño aprobado; no se crearon archivos de implementación.

- Persistencia: backend/prisma/schema.prisma y una carpeta NUEVA de migración, sin editar la histórica.
- Backend: rutas/controlador/servicio propios de equipos y reservas bajo backend/src; registro mínimo en backend/src/index.js; reutilizar backend/src/database.js. Pruebas del módulo según contratos y estrategia de concurrencia acordados.
- Frontend: frontend/src/pages/ControlEquiposPage.jsx y componentes/cliente API propios; cambios mínimos en App.jsx y components/Navbar.jsx una vez incorporada la navegación autorizada.
- No modificar InventoryPage/InventoryCard ni catálogo/cotizaciones para sustituir funciones ajenas. La recuperación de acceso a las pantallas previas debe acordarse antes de integrar.
- Dependencias de Router/Tailwind y sus archivos de configuración ya vienen de main; no instalarlas ni cambiarlas hasta autorizar integración. No se propone nueva dependencia del módulo todavía.
- Mantener este registro con decisiones aprobadas y pruebas de cada etapa.

## Siguiente paso

Solicitar autorización de etapa 2 y resolver juntas las decisiones anteriores. La autorización de diseño no autoriza persistencia, publicación ni integración de main por sí sola. Hasta entonces, etapa 1 terminada, sin implementar.

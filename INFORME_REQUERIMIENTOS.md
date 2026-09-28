# Informe de implementación de requerimientos — Calendario Central y Bloqueo de Traslapes - R1 (Requerimiento #1) - ... 

**Proyecto:** NES Eventos  
**Responsable:** José Arellano  
**Fecha:** 27 de septiembre de 2026  
**Base:** `main`, commit `87daab4`  
**Estado:** código integrado localmente y probado con PostgreSQL aislado. Sin commits ni push. Sin traslado a `Josee`.

## 1. Resultado

Se agregó `/calendario` a la aplicación. Permite consultar eventos y visitas técnicas, registrar una actividad con cliente y recursos, revisar disponibilidad y confirmar una reserva completa. El servidor rechaza los recursos incompatibles y la interfaz explica cuáles provocan el conflicto.

El calendario mensual permite navegar por meses, volver a hoy, seleccionar un día, filtrar por tipo y actualizar la consulta. Los eventos y las visitas tienen etiquetas y colores distintos. El panel de detalle muestra cliente, inicio, término, recinto, estado y equipos con cantidades.

La implementación utiliza los modelos de equipos y eventos integrados en `main`. No incorpora archivos ni decisiones del antiguo inventario exclusivo de `Josee`.

## 2. Reglas autorizadas

| Regla | Comportamiento implementado |
|---|---|
| Zona horaria | La interfaz usa America/Santiago; API con offset explícito y persistencia con zona horaria. |
| Reservas consecutivas | Una actividad que termina a las 12:00 permite otra desde las 12:00. |
| Márgenes | No se agregan márgenes automáticos de traslado, montaje o desmontaje. |
| Visitas técnicas | Bloquean el recinto igual que los eventos; pueden no llevar equipos. |
| Equipos | Se reservan cantidades del stock de los equipos existentes. |
| Cliente | Nombre del cliente o empresa, sin inventar una relación con cotizaciones. |
| Simultaneidad | Permitida con recintos distintos y recursos o stock suficientes. |

## 3. Componentes agregados

| Archivo o componente | Función |
|---|---|
| `backend/prisma/schema.prisma` | Agrega `Recinto`, `ActividadAgenda`, `ReservaEquipo`, tipo de actividad y relaciones con `Equipo`/`Evento`. |
| `backend/prisma/migrations/20260928000000_calendario_central/migration.sql` | Crea tablas, claves, controles de integridad y exclusión de traslapes de recinto. |
| `backend/src/validations/agenda.schema.js` | Valida datos obligatorios, fechas con offset, intervalo, cantidades e ID; rechaza equipos repetidos. |
| `backend/src/services/disponibilidad.service.js` | Contrato único de comprobación temporal y bloqueo de recursos; calcula la ocupación máxima simultánea. |
| `backend/src/services/agenda.service.js` | Consulta agenda, registra recintos y coordina la confirmación atómica. |
| `backend/src/routes/agenda.routes.js` | Expone seis operaciones HTTP de consulta, detalle, recintos, disponibilidad y confirmación. |
| `frontend/src/pages/CalendarPage.jsx` y `.css` | Calendario, formularios, detalle, filtros y presentación adaptable. |
| `frontend/src/lib/agenda-api.js` | Comunicación con backend y presentación de errores de conexión/API. |
| `frontend/src/lib/agenda-time.js` | Conversión de horarios de Santiago, grilla mensual y actividades que cruzan días. |
| `backend/test/agenda.unit.test.js` | Validaciones y cálculo de cantidades simultáneas. |
| `backend/test/agenda.integration.test.js` | Concurrencia, rollback, restricciones SQL y respuestas HTTP contra PostgreSQL real. |
| `frontend/test/agenda-time.test.js` | Horarios de invierno/verano, cambios de hora y límites de día. |
| `backend/scripts/verificar-agenda.mjs` | Verifica el destino de pruebas, genera Prisma, aplica migraciones y ejecuta las pruebas del backend. |
| `frontend/scripts/verificar-agenda-browser.mjs` | Verifica el flujo de usuario en Edge contra la base aislada y guarda capturas. |
| `backend/AGENDA.md` | Contrato con equipos, API, instalación, pruebas y límites técnicos. |

Las modificaciones autorizadas en archivos compartidos se limitaron al esquema Prisma y a registrar el módulo en `backend/src/index.js`, `frontend/src/App.jsx` y `frontend/src/components/Navbar.jsx`. No se modificaron servicios, pantallas ni reglas de averías de Martina. No se agregaron dependencias de npm.

## 4. Cómo se evita una doble reserva

1. El backend valida la solicitud; el estado siempre lo fija el servidor como `Reservado`.
2. Abre una transacción y bloquea las filas del recinto y equipos solicitados, en orden estable.
3. Comprueba la disponibilidad durante todo el intervalo. Para equipos calcula cuántas unidades están ocupadas simultáneamente, no la suma indiscriminada de reservas que tocan ese día.
4. Si encuentra incompatibilidades, devuelve `409` con recursos y motivos. La actividad no se guarda.
5. Si todos están disponibles, crea el evento —cuando corresponde—, la actividad y sus reservas de equipos dentro de la misma transacción.
6. Si cualquier escritura falla, PostgreSQL revierte la operación completa. La reserva de recinto está representada por el intervalo de `ActividadAgenda`, protegido además con una exclusión SQL.

La preconsulta no crea bloqueos persistentes ni promete disponibilidad futura: al confirmar se vuelve a comprobar. Dos usuarios pueden ver inicialmente disponibilidad, pero solo las solicitudes compatibles llegan a confirmarse.

## 5. Seguimiento de criterios de aceptación

| N.º | Criterio | Estado y evidencia |
|---|---|---|
| 1 | Calendario con eventos y visitas diferenciados | Implementado; comprobado en navegador con etiquetas, colores y filtro. |
| 2 | Consulta de horarios, recinto, cliente, estado y equipos | Implementado; detalle en API e interfaz, verificado por HTTP y navegador. |
| 3 | Datos obligatorios e inicio anterior al término | Implementado en Zod y formulario; pruebas de datos ausentes, intervalos inválidos y fechas sin offset. |
| 4 | Impedir recinto ocupado en cualquier parte del intervalo | Implementado; pruebas de intersección parcial, total, intervalo contenido e idéntico; exclusión SQL comprobada directamente. |
| 5 | Impedir equipos incompatibles durante el intervalo | Implementado según la regla autorizada de cantidades; se rechaza exceso de stock o estado no operativo. |
| 6 | Informar conflictos sin confirmar lo rechazado | Implementado; respuestas identifican recinto/equipo, motivo y reservas afectadas; comprobado que no hay registros nuevos. |
| 7 | Evitar incompatibilidades con confirmaciones simultáneas | Verificado con dos transacciones concurrentes sobre el mismo recinto y sobre equipos compartidos entre recintos distintos. |
| 8 | Operación completa, sin bloqueos parciales al fallar | Verificado inyectando un error SQL durante la reserva de equipos y comprobando rollback de actividad, evento y reservas. |
| 9 | Guardar como Reservado y comprometer recursos | Verificado en la respuesta, la agenda y una consulta posterior de disponibilidad. |
| 10 | Permitir actividades simultáneas compatibles | Verificado con recursos distintos y con stock suficiente; también en navegador mediante visita en otro recinto. |

Estos resultados cubren el flujo de agendamiento. El control de acceso exclusivo por administrador/coordinador, mencionado en el requisito funcional, **sigue pendiente**: el proyecto base no dispone de autenticación o roles que se puedan reutilizar. La aplicación no debe considerarse protegida por roles por el hecho de mostrar la sección de coordinación.

## 6. Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| Prisma validate y generación del cliente | Correctos. |
| Migraciones sobre PostgreSQL aislado | Las cinco migraciones se aplicaron correctamente; una segunda ejecución no encontró pendientes. |
| Backend | 54 pruebas aprobadas: 19 nuevas unitarias, 14 nuevas de integración y 21 existentes de inventario. |
| Horarios del frontend | 4 pruebas aprobadas. |
| Navegador | Alta de evento, preconsulta, detalle, rechazo de traslape, visita simultánea compatible y filtro comprobados. |
| Escritorio y móvil | Revisados a 1440 px y 390 px; sin desbordamiento horizontal ni excepciones JavaScript. |
| Build de Vite | Correcto. |
| Lint | Sin errores ni advertencias nuevas; conserva 3 advertencias previas en Inventario, Cotizaciones y Colaboradores. |
| Git diff --check | Sin errores de espacios. |

En la primera ejecución se detectó que Node descubría el script de preparación como si fuera un test y lo ejecutaba recursivamente. Se corrigió el nombre del script y se limitó la ejecución a `test/*.test.js`; la ejecución final pasó completa.

## 7. Base utilizada y evidencia

Se verificó el contexto Docker local `desktop-linux`, con endpoint de named pipe de Docker Desktop. Se creó un contenedor independiente `nes_agenda_test_20260927` y se confirmó mediante consulta SQL el destino `127.0.0.1:5545/nes_agenda_test`, PostgreSQL 15.19. Todas las migraciones y escrituras de esta implementación se probaron allí.

No se iniciaron ni modificaron `nes_postgres` o `proyecto_isw--db-1`. No se creó un `.env` apuntando a alguna de esas bases ni se ejecutaron migraciones sobre ellas.

Durante esta sesión se dejó un entorno temporal de revisión: frontend en `http://127.0.0.1:5173/calendario`, backend en el puerto 3000 y base aislada en 5545. Contiene datos de prueba, incluidos eventos de octubre de 2030. No representa la base habitual del proyecto. Si esos procesos se detienen, hay que iniciarlos nuevamente con una conexión verificada.

Las capturas locales están en `docs/calendario-escritorio.png` y `docs/calendario-movil.png`. La configuración existente de Git excluye `docs/`; esas capturas no se incluirán automáticamente en un commit. Este informe y `backend/AGENDA.md` sí quedan disponibles para versionar cuando se autorice.

## 8. Coordinación y pendientes

- **Autenticación y roles:** integrar con el responsable correspondiente para limitar los endpoints a administrador/coordinador.
- **Martina:** revisar y adoptar el contrato de disponibilidad para futuros flujos de asignación. No implementar una segunda lógica de reservas.
- **Averías posteriores:** la alerta existente sigue siendo general; queda por acordar identificación y resolución de actividades afectadas.
- **Históricos:** no convertir eventos antiguos sin cliente, recinto y término, ni inventar esos valores.
- **Cambios de agenda:** cancelación, reprogramación, recurrencia y sincronización automática entre navegadores no forman parte de esta entrega.
- **Ciclo de estados:** coordinar la evolución de `Evento` y `ActividadAgenda` antes de introducir cancelación/finalización; la evaluación de eventos finalizados permanece como estaba.
- **Base habitual:** comprobar su conexión e historial antes de aplicar esta migración fuera del entorno de prueba.
- **Entrega Git:** revisar el diff y, cuando José lo indique, preparar `Josee` para que refleje la versión nueva completa. No se realizó commit, push ni reemplazo de ramas.

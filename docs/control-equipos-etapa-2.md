# Control de Equipos — etapa 2: diseño

Fecha: 2026-09-27. Rama: Josee. Estado: diseño documentado; persistencia sin implementar ni autorizar.

## Autorización y acuerdos

José autorizó la etapa 2, confirmó unidades individuales identificables y pidió dejar Evento como incógnita; aceptó las demás propuestas de la explicación anterior. Se mantienen Evento y permisos de logística como dependencias pendientes. No se interpreta esto como autorización para integrar main, crear migraciones, publicar o ampliar el alcance.

Acuerdos: fecha y hora; presentación America/Santiago, instantes UTC; intervalo [inicio, fin); ubicación actual separada de reservas futuras; disponibilidad calculada desde reservas y vigencia de arriendo; reservas independientes por equipo. No se añade margen de traslado, prohibición de fechas pasadas, mantenimiento, daños, notificaciones, edición, cancelación, devolución ni administración de inventario.

Corrección posterior de José: se elimina la condición de confirmar toda la selección o rechazarla completa. Pueden existir varias unidades del mismo tipo (por ejemplo, guitarras), diferenciadas por código individual. Una misma unidad no puede estar comprometida con dos clientes durante períodos superpuestos. El resto del diseño se mantiene aceptado; Evento sigue pendiente.

Los detalles técnicos siguientes son la propuesta concreta de esta etapa. Lo que no se conoce del inventario y de Evento se marca pendiente, no se inventa como decisión aprobada.

## Base de compatibilidad

Se conserva el mapa de etapa 1: origin/main e2b6806, origin/Josee ed39928, origin/Claudioo ad3adb6, origin/martina f240cef, origin/tomas 9040c77 (SHA completos en el registro anterior). No hubo un nuevo fetch en esta etapa documental; no se afirma que no existan publicaciones posteriores.

Se revisaron de nuevo rama, estado, esquema y dependencias declaradas. Solo estaban pendientes los documentos de etapa 1. Express, Zod y el singleton Prisma existentes se reutilizan; sin actualizar Prisma 5.22.0 ni PostgreSQL 16. CatalogoItem es comercial; Cotizacion no es Evento. El inventario publicado es simulado y usa stock; no se transforma ese mock en una fuente persistida de unidades sin coordinarlo con el equipo.

## Entidades y relaciones propuestas

| Entidad lógica | Campos propuestos | Integridad y alcance |
| --- | --- | --- |
| Equipo | id Int autoincremental; codigo único no vacío; nombre; tipo (por ejemplo, guitarra, no único); procedencia PROPIO/ARRENDADO; ubicacionActual BODEGA/PRESTADO | Una fila por unidad física. Reutilizar entidad del inventario si el equipo publica una compatible antes de implementar. Sin cantidad/stock ni booleano global disponible. Código visible e ID técnico distintos. El código es único globalmente; tipo, procedencia y ubicación son atributos, no una clave compuesta. Cambiar ubicación no crea otra unidad ni permite repetir su código. |
| VigenciaArriendo | id Int; equipoId; inicio; fin | Una o más ventanas de uso de una unidad arrendada. Modelo provisional hasta acordar fuente con inventario; inicio < fin. No es contrato comercial ni administración de alquileres. Una ventana debe cubrir íntegramente la reserva; no unir ventanas fragmentadas silenciosamente. |
| ReservaEquipo | id Int; equipoId obligatorio; referencia a Evento obligatoria en integración final; inicio; fin; creadaEn | FK a Equipo con borrado restringido, fechas no nulas, inicio < fin y exclusión de solapamientos. Tipo/nombre de FK a Evento pendiente. Cada fila es confirmada; selección de pantalla no se persiste como reserva. Sin ciclo de cancelación o edición. |

Fechas propuestas: Prisma DateTime con tipo nativo PostgreSQL timestamptz(3). Respuestas ISO 8601 UTC. La relación Evento 1:N ReservaEquipo es conceptual: todavía no se crea modelo Evento, eventoId textual provisional, tabla duplicada ni FK ficticia. Tampoco se inventa usuarioId para auditoría sin contrato de autenticación.

Cada confirmación reserva una sola unidad y tiene su propia transacción. Si se seleccionan varias, se confirman mediante operaciones independientes: un conflicto en una no revierte las reservas confirmadas de las demás. No se crea una cabecera que obligue a reservar un conjunto indivisible.

El cliente beneficiario debe ser verificable mediante el futuro contrato Evento/Cliente. Su fuente y tipo de identificador quedan pendientes; no se inventa una relación usando Cotizacion.clienteId ni se confunde cliente con usuario de logística. La exclusión es por unidad y período, independientemente del cliente: impide compartirla entre clientes y duplicar reservas superpuestas para el mismo cliente. Dos guitarras de códigos distintos sí pueden reservarse a clientes distintos simultáneamente.

La relación opcional Equipo–CatalogoItem no se añade todavía: depende del inventario y no es necesaria para exclusividad temporal. Equipo y VigenciaArriendo son necesidades lógicas, no autorización para construir otro inventario. Antes de convertirlas en tablas se debe acordar fuente/propiedad con el equipo.

## Reglas de fechas y disponibilidad

1. Recibir fechas ISO 8601 con Z u offset explícito, válidas y finitas, inicio < fin. No interpretar fecha/hora sin zona según la zona de Windows.
2. Presentar en America/Santiago y convertir a instantes UTC; contemplar cambio de horario. Horas locales inexistentes deben rechazarse y las ambiguas requieren escoger offset explícito; no fijar Chile a un offset constante. La herramienta concreta de conversión se decide al implementar, sin añadir dependencias en esta etapa.
3. Solapamiento: existente.inicio < solicitado.fin y existente.fin > solicitado.inicio. Una reserva 10:00–12:00 admite otra desde 12:00; una desde 11:59 entra en conflicto. Comparar instantes, no textos de fechas.
4. Unidad propia: comprobar reservas. Unidad arrendada: además debe existir vigencia que cubra [inicio, fin). Una vigencia desconocida no equivale a uso ilimitado: informar disponibilidad indeterminada y no permitir confirmar hasta validar la fuente.
5. La ubicación actual se muestra independientemente. BODEGA no garantiza disponibilidad futura; PRESTADO no significa indisponibilidad eterna. Si el préstamo tiene período registrado, usarlo para detectar ocupación; si no existe información temporal, no afirmar disponibilidad: marcar INDETERMINADA hasta resolver el contrato de inventario. No implementar devolución para resolver esa carencia.
6. Resultado por período: DISPONIBLE, NO_DISPONIBLE o INDETERMINADA, acompañado de motivos. No persistir ese resultado como estado global. Los casos indeterminados son dependencias sin resolver, no datos inventados.
7. No imponer fechas futuras ni tiempo adicional de traslado. Límites respecto de las fechas y estados de Evento quedan pendientes del contrato propietario; no asumir que la reserva debe ser idéntica al evento o que puede excederlo.

## Dependencias Evento y permisos

Diseñar una frontera interna de consulta de eventos que permita resolver existencia, referencia canónica, información para mostrar y autorización del período/estado. Firma conceptual, no contrato definitivo: resolverEvento(referencia) y validarPeriodoReservable(evento, inicio, fin). Tipo de referencia, campos de respuesta, selección de eventos, reglas y responsable siguen abiertos.

No proponer un GET /api/eventos propio mientras no se acuerde su propietario. La UI futura podrá consumir el proveedor que acuerde el equipo. Un adaptador con fixtures es una opción exclusivamente para pruebas/desarrollo, no implementada ni activada por este documento. No permitir confirmaciones reales con eventos inventados ni presentar ese modo como integrado.

En la integración final se requiere referencia verificable a Evento y garantía de integridad acorde a su almacenamiento. Si comparte PostgreSQL, la propuesta es FK con borrado restringido y coordinación transaccional con cambios de evento. Si es un servicio externo, habrá que acordar garantías y fallos antes de habilitar confirmación; una consulta HTTP aislada no garantiza atomicidad con cambios remotos.

Permisos: no hay autenticación publicada. No se implementa nuevo rol ni pantalla de acceso; no se declara protegido el módulo. Cuando exista el contrato, incorporar su middleware y sus respuestas 401/403. Diferir esa integración no equivale a autorizar exposición pública sin protección.

## Concurrencia y transacción

Propuesta principal: restricción de exclusión PostgreSQL por equipo y rango temporal, usando btree_gist para igualdad del identificador y tstzrange(inicio, fin, '[)') para solapamiento. Impide reservas superpuestas incluso si dos solicitudes leyeron disponibilidad antes de que alguna insertara. Esta técnica está documentada para PostgreSQL 16: https://www.postgresql.org/docs/16/rangetypes.html#RANGETYPES-CONSTRAINT y https://www.postgresql.org/docs/16/btree-gist.html.

La restricción y CHECK de intervalos se escribirán como SQL explícito en una NUEVA migración, con comentarios y pruebas. Prisma mantendrá campos ordinarios inicio/fin; no hará falta exponer el rango como campo del cliente. La documentación de Prisma contempla SQL personalizado para funciones no representadas en el esquema: https://docs.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features. Esa documentación actual no sustituye las pruebas con Prisma 5.22.0: verificar creación, introspección y conservación de restricciones con la versión instalada en la etapa 3.

Secuencia de confirmación propuesta:

1. Validar cuerpo, fechas y equipoId entero positivo. Cada petición confirma una unidad; la selección visual no permite repetir IDs.
2. Resolver Evento real y permisos cuando existan. Si la dependencia falta, devolver un error controlado de integración pendiente, sin insertar.
3. Abrir una transacción para esa unidad y bloquear su fila Equipo con consulta parametrizada. Releer condiciones de ubicación/vigencia y reservas. Todos los futuros escritores de esas condiciones deberán respetar la misma coordinación; no afirmar que un bloqueo protege cambios externos no coordinados.
4. Verificar el equipo solicitado, cobertura de arriendo y período permitido del evento según el contrato final. Detectar conflictos para responder con equipo y motivo.
5. Insertar la reserva de esa unidad. La exclusión en PostgreSQL es la última garantía contra solapamientos, además de la consulta previa. Si falla, revertir únicamente esa operación, conservando los éxitos independientes de otros equipos.
6. Responder 201 solo tras commit. Traducir la violación de exclusión (SQLSTATE 23P01) a 409 fuera de la transacción fallida. Investigar y probar cómo Prisma 5.22.0 expone ese error; no asumir un código Prisma concreto ni mapear cualquier error a conflicto.
7. Manejar deadlocks/fallos transitorios con error controlado, sin duplicar operaciones. No se promete reintento automático en este alcance. Si se pierde la respuesta, refrescar reservas antes de volver a confirmar: la restricción impide duplicados, pero no promete devolver el mismo 201 a un reintento.

Si btree_gist o el contrato de Evento impiden aplicar este diseño, explicar el impedimento y revisar la alternativa antes de sustituirlo. No recurrir a consulta seguida de inserción sin protección. Probar extensión y permisos en base de pruebas aislada antes de aplicar en la base local autorizada.

## Contratos HTTP propuestos

Nombres nuevos compatibles con las rutas existentes; sujetos a conciliación si el equipo publica rutas de equipos. No se cambia /api/catalogo ni /api/cotizaciones.

| Operación | Petición propuesta | Resultado |
| --- | --- | --- |
| Listar unidades | GET /api/equipos | 200 {equipos:[{id,codigo,nombre,tipo,procedencia,ubicacionActual}]}; array vacío válido. No campo disponible sin período. |
| Reservas de unidad | GET /api/equipos/:id/reservas, filtro opcional inicio y fin juntos | 200 {equipoId,reservas:[{id,eventoRef,inicio,fin}]}; filtro devuelve intersecciones; 404 si no existe equipo. eventoRef es notación conceptual cuyo tipo queda pendiente. |
| Consultar disponibilidad temporal | GET /api/equipos/disponibilidad?inicio=...&fin=... | 200 {periodo:{inicio,fin},equipos:[{id,codigo,nombre,tipo,procedencia,ubicacionActual,disponibilidad,motivos}]}; resultado orientativo, no bloqueo ni garantía de confirmación. Validación de compatibilidad con Evento pendiente de su contrato. |
| Confirmar una unidad | POST /api/reservas-equipos con {eventoRef,inicio,fin,equipoId:1} | 201 {reserva:{id,equipoId,eventoRef,inicio,fin}}. Cada unidad se confirma independientemente; forma/tipo de eventoRef y vínculo con Cliente pendientes. |

Registrar la ruta literal /disponibilidad antes de futuras rutas genéricas /:id. Las consultas temporales pueden usarse sin Evento para explorar el inventario; eso no habilita confirmación sin un Evento válido. La paginación no se incorpora como requisito nuevo en esta etapa; reexaminar con el tamaño real del inventario.

Errores nuevos: {codigo,mensaje,detalles?}, sin SQL, stack ni credenciales. 400 DATOS_INVALIDOS (fechas o ID inválido); 404 EQUIPO_NO_ENCONTRADO o EVENTO_NO_ENCONTRADO cuando exista proveedor; 409 CONFLICTO_RESERVA, FUERA_VIGENCIA_ARRIENDO o EVENTO_NO_RESERVABLE; 503 INTEGRACION_PENDIENTE/DEPENDENCIA_NO_DISPONIBLE si falta información o proveedor; 500 ERROR_INTERNO para fallo inesperado. Para 409 incluir equipoId afectado y motivos verificables. No comunicar una vigencia desconocida como conflicto comprobado.

Ejemplo conceptual: GUT-001 y GUT-002 son guitarras distintas. El cliente A reserva GUT-001 entre 14:00Z y 16:00Z. El cliente B puede reservar GUT-002 en ese período, pero recibe 409 al intentar GUT-001 entre 15:00Z y 17:00Z. Si B seleccionó ambas, se conserva su reserva de GUT-002 y se informa el rechazo de GUT-001. No se establecen IDs ficticios de Evento/Cliente como contrato.

## Recorrido de pantalla

Página propia ControlEquiposPage con componentes de período, listado, reservas y revisión. Integrar en Router/Navbar publicados cuando se autorice incorporar esa base a Josee; conservar catálogo/cotizaciones. No modificar el inventario de otra persona para sustituirlo.

1. Seleccionar evento mediante el contrato pendiente. Si no está disponible, mostrar integración pendiente y deshabilitar confirmación; no inventar selector real.
2. Indicar inicio y fin en zona Chile; mostrar zona y errores de validación.
3. Consultar unidades y mostrar código, nombre, propio/arrendado, bodega/prestado y disponibilidad para el período. Abrir reservas de una unidad con evento y fechas cuando exista esa información real.
4. Seleccionar una o varias unidades DISPONIBLES, distinguiendo código y tipo; mostrar resumen de evento/período/equipos y explicar que cada unidad se confirma por separado.
5. Deshabilitar envíos duplicados por unidad. En selección múltiple, enviar una petición por equipo y mostrar resultados por código: reservado, rechazado o resultado por comprobar. Retirar de selección los confirmados y refrescar disponibilidad/reservas. Ante un 409 conservar los éxitos de otros equipos y pedir revisión del rechazado; no reenviar automáticamente ni mostrar éxito total cuando hubo resultados parciales.
6. Cambiar evento o fechas invalida selección y resultados. Cancelar peticiones anteriores o ignorar sus respuestas tardías para no restaurar información obsoleta.

Estados: carga, inventario vacío, sin disponibilidad, integración pendiente, error de conexión, fecha inválida, selección, confirmación en curso, éxito total, resultado parcial y conflicto concurrente. Tras error de red al confirmar, consultar reservas para comprobar resultado antes de reintentar. No cambiar ubicacionActual a PRESTADO por guardar una reserva futura.

## Matriz de aceptación para implementar y probar después

Todos los casos siguientes son PLANIFICADOS, no pruebas ejecutadas ni criterios ya cumplidos.

| ID | Caso y resultado esperado |
| --- | --- |
| CE-01 | Varias unidades de tipo guitarra con códigos distintos, procedencia y ubicación. Rechazar código duplicado aunque cambien los atributos. |
| CE-02 | Reservas muestran equipo, referencia real de evento y período persistidos; pendiente Evento. |
| CE-03 | Disponibilidad exacta para el período; offsets equivalentes representan los mismos instantes. |
| CE-04 | Asignación válida persiste y se consulta al recargar; pendiente integración Evento. |
| CE-05 | Tras confirmar, nueva consulta refleja ocupación sin booleano global almacenado. |
| CE-06 | Solapamientos parcial, total, contenido e idéntico se rechazan para la misma unidad; unidades distintas pueden coincidir. |
| CE-07 | Fin igual a inicio siguiente y períodos separados se admiten; inicio igual a fin se rechaza. |
| CE-08 | Dos clientes intentan el mismo código/período en conexiones independientes: solo uno confirma. Dos códigos distintos del mismo tipo pueden confirmar simultáneamente para clientes distintos; verificar filas finales. Identidad de clientes según contrato pendiente. |
| CE-09 | Fechas inválidas/sin zona, equipoId ausente, no entero o inexistente no insertan datos para esa petición; Evento/Cliente según contrato. La selección visual impide IDs repetidos. |
| CE-10 | Arriendo cubre todo el intervalo o se rechaza; bordes exactos válidos; vigencia desconocida no se declara disponible. |
| CE-11 | En selección con una unidad libre y otra en conflicto, la libre queda reservada y la otra se rechaza. Mostrar resultado por código; probar distintos órdenes, concurrencia y fallo de una petición sin revertir éxitos independientes. |
| CE-12 | Doble clic/reenvío no duplica reservas incompatibles; error controlado y refresco tras respuesta perdida. |
| CE-13 | Reserva futura no cambia BODEGA/PRESTADO; préstamo sin período deja disponibilidad indeterminada. |
| CE-14 | Regresión GET/POST catálogo y POST cotizaciones, incluida accesibilidad de sus pantallas al integrar navegación. |
| CE-15 | Migración nueva en base aislada, historial previo intacto, FK/CHECK/exclusión presentes y datos anteriores conservados; FK Evento pendiente. |
| CE-16 | Probar permisos cuando exista contrato; hasta entonces declarar acceso sin protección integrada. |
| CE-17 | Recorrido visual con cargas, vacíos, errores, cambios de filtro, respuestas tardías, doble envío, resultados parciales y conflictos. |

Añadir en pruebas temporales fechas en cambio de horario de Chile y JSON con distintas representaciones del mismo instante. Datos de prueba solo en base aislada; no crear/borrar registros de otros integrantes.

## Secuencia posterior y archivos

1. Antes de etapa 3: actualizar referencias, acordar propiedad/fuente de unidades con inventario y revisar contrato Evento. Si Evento continúa pendiente, decidir explícitamente un alcance parcial de persistencia/pruebas sin presentar reservas integradas ni inventar una FK.
2. Etapa 3, solo autorizada posteriormente: schema.prisma, NUEVA migración con SQL explícito y pruebas de integridad/concurrencia. No editar migración inicial ni aplicar resets. No usar el script migrar de forma rutinaria porque genera migraciones.
3. Etapa 4, con autorización separada: routes/equipo.routes.js, routes/reserva-equipo.routes.js, controladores y servicio propio en backend/src; registrar rutas en index.js y reutilizar database.js. Adaptador Evento solo cuando se acuerde su contrato.
4. Etapa 5: pages/ControlEquiposPage.jsx, componentes propios y cliente HTTP; modificaciones mínimas a App/Navbar tras autorizar integración de origin/main en Josee. Ningún merge autorizado ahora.
5. Etapa 6: pruebas reales y regresión con SHA exactos y limitaciones. Etapa 7: commit/push únicamente por solicitud explícita.

## Resultado de esta etapa

Solo documentación: se actualizó el estado histórico de etapa 1 y se añadió este diseño. Sin cambios funcionales, esquema, base, dependencias o ramas. No se repitieron instalaciones, arranques ni pruebas de aplicación, porque no se implementó código. Se revisaron coherencia del diseño con esquema/rutas existentes y diff documental; no se ejecutó la estrategia de concurrencia.

Etapa 2 documentada con Evento, permisos y fuente definitiva de inventario explícitamente pendientes. Posteriormente José autorizó comenzar el desarrollo y pidió revisar primero los avances publicados del equipo. La etapa 3 aún no tiene cambios de implementación; esta etapa no permite afirmar integración completa.

## Revisión remota previa al desarrollo

Se ejecutó un nuevo git fetch origin correctamente tras la solicitud de José. No cambió ninguna de las referencias respecto del diagnóstico: origin/main e2b68065c43f43b51b3f0b1934702a05dbbac8b9; origin/Josee ed39928709e0c3c7dc8a3c522fd97849c9f265b8; origin/Claudioo ad3adb63dc2b9247fdbaa3c0f8c468d9494552d1; origin/martina f240cef6b3e397dca53e8a02241b5834628471fa; origin/tomas 9040c77570ed89fb3ad68ffbd2f7b5b1df860567.

Se compararon historia, diferencias desde ancestros comunes, esquema, migraciones, rutas, páginas y dependencias. Las tres ramas de colegas no tienen commits exclusivos frente a origin/main. Josee sigue teniendo un commit exclusivo (Compose corregido) y le faltan dos commits presentes en origin/main (avance de navegación y su merge). No se revisó trabajo no publicado.

No se descartan los avances existentes: se propone reutilizar Router, Navbar, HomePage y estilos de main, manteniendo InventoryPage/InventoryCard. Son 11 archivos de frontend entrantes; backend y migraciones no cambian. No han aparecido Evento, Cliente, unidades físicas persistidas, reservas ni autenticación. El inventario sigue usando mockInventory con cantidades de stock, sin códigos únicos por unidad.

Propuesta concreta de adaptación, pendiente de autorización de integración: incorporar origin/main e2b6806 únicamente hacia Josee, conservando el arreglo Compose ed39928 y estos documentos; preservar la pantalla funcional actual de catálogo/cotizaciones en una página propia, por ejemplo CatalogoCotizacionesPage, enlazada desde la nueva navegación. No reemplazar InventoryPage ni convertir sus estados simulados en disponibilidad temporal. La página futura de Control de Equipos se agregará a esa navegación en su etapa correspondiente.

La diferencia del Compose entre las puntas no es un cambio entrante del equipo: es la corrección exclusiva de Josee y debe conservarse. No se ejecutó merge ni se probó todavía la combinación. main local sigue en 9040c77570ed89fb3ad68ffbd2f7b5b1df860567. Únicos cambios pendientes: documentación propia bajo docs/.

La regla 6 del plan de José pide autorización específica antes de incorporar main hacia la rama personal. Revisar/adaptar el diseño no se interpreta como permiso para ese merge. El comienzo del desarrollo ya está autorizado; la integración de ramas y los contratos de Evento/Cliente siguen siendo decisiones separadas.

## Integración autorizada y completada

José autorizó incorporar origin/main mediante «ok hagamoslo». Se integró exactamente e2b68065c43f43b51b3f0b1934702a05dbbac8b9 en Josee. Commit local de merge: e8f18a8, padres ed39928 y e2b6806. Sin push. main local permanece en 9040c77570ed89fb3ad68ffbd2f7b5b1df860567; backend, migraciones y Compose corregido no cambiaron.

Se conservaron Inicio e Inventario y se extrajo la pantalla original de catálogo/cotizaciones a frontend/src/pages/CatalogoCotizacionesPage.jsx, disponible en /cotizaciones y enlazada desde Navbar. La lógica anterior al render se comparó con ed39928 y permanece idéntica salvo el nombre del componente. Se ajustó únicamente la distribución de esa pantalla y de Navbar para evitar desbordamiento móvil. InventoryPage e InventoryCard conservan su implementación publicada y sus datos simulados.

Validación: npm ci con el lock incorporado; build correcto; lint sin errores, con la advertencia preexistente react(set-state-in-effect). Edge con perfil temporal: navegación Inicio → Inventario → Cotizaciones, tres tarjetas originales, dos formularios, enlace activo, recarga directa de /cotizaciones y GET real /api/catalogo HTTP 200. Sin excepciones de navegador. Capturas desktop y móvil revisadas; comprobado ancho de página y enlaces a 390px tras corregir el desbordamiento. No se enviaron POST ni se escribieron datos; esto no acredita una regresión completa de creación de productos/cotizaciones.

git diff --cached --check detectó espacios finales en archivos entrantes del equipo; se conservaron sin limpieza ajena al alcance. Los documentos de docs/ siguen pendientes fuera del commit de integración. Las herramientas y capturas temporales de verificación se guardaron bajo node_modules/.cache (ignorado). Backend y frontend se iniciaron en 3000 y 5173 para las pruebas; su continuidad fuera de la sesión no está garantizada.

La integración previa terminó. Persistencia de Control de Equipos aún no implementada; Evento/Cliente y fuente definitiva del inventario siguen pendientes conforme al diseño.

## Cierre de pruebas y publicación autorizada

A solicitud de José se finalizaron las pruebas y se detuvieron los procesos de backend y frontend iniciados para ellas; se comprobó que 3000 y 5173 ya no respondían por HTTP. No se detuvo Docker ni se modificaron datos.

José autorizó publicar los cambios actuales en Josee: integración e8f18a8 y estos documentos. Antes de publicar se completó git fetch origin; origin/Josee seguía en ed39928 sin commits remotos ajenos pendientes. Se seleccionaron únicamente los dos documentos de docs/ para el nuevo commit; .env, node_modules, compilados y herramientas temporales siguen excluidos. Esta publicación no incluye implementación de reservas ni modifica main.

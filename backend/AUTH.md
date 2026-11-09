# Registro e inicio de sesión

El navegador usa `/registro` y `/login`. Las cuentas nuevas reciben el rol
`Gestor_Eventos`; el formulario no permite elegir privilegios. El registro no
inicia sesión automáticamente: después de crear la cuenta se muestra el login.

## Cómo se conecta el código

1. `validations/auth.schema.js` valida y normaliza nombre y correo. No modifica la contraseña.
2. `controllers/auth.controller.js` recibe la petición y transforma el resultado en una respuesta HTTP.
3. `services/auth.service.js` crea usuarios y comprueba credenciales mediante Prisma.
4. `utils/password.js` calcula scrypt con salt aleatorio y compara las claves.
5. `services/sesion.service.js` crea, consulta y elimina sesiones persistidas en PostgreSQL.
6. `middleware/auth.middleware.js` exige una sesión válida antes de acceder a los módulos.
7. `routes/auth.routes.js` conecta los endpoints con los controladores.

## API

| Método | Ruta | Datos / resultado |
| --- | --- | --- |
| POST | `/api/auth/registro` | `{ nombre, email, password }` → 201 y usuario |
| POST | `/api/auth/login` | `{ email, password }` → 200, usuario y cookie |
| GET | `/api/auth/sesion` | 200 y usuario actual; 401 sin sesión válida |
| POST | `/api/auth/logout` | Revoca la sesión y borra la cookie; responde 204 |

Todas las solicitudes que modifican datos requieren el encabezado
`X-Requested-With: NES-Eventos`, incluido el login y el envío de comprobantes.
El cliente de React lo agrega automáticamente. Para probar con Postman, agregar
ese encabezado y `Content-Type: application/json`; conservar las cookies entre
login y las siguientes peticiones. Los errores de validación responden 400;
correo repetido, 409; credenciales incorrectas, 401; exceso de intentos, 429.

Las respuestas de usuario contienen únicamente `id`, `nombre`, `email` y `rol`.
Las contraseñas y los hashes no se devuelven al cliente.

## Sesiones y permisos

La cookie `nes_sesion` es HttpOnly, SameSite=Lax, tiene ruta `/api` y dura ocho
horas. En producción exige HTTPS mediante Secure. La base de datos guarda el
SHA-256 del token aleatorio, no el token original. Un nuevo login revoca la
sesión que presente ese navegador; logout la elimina de la base de datos.
Las sesiones vencidas y las cuentas inactivas no pueden acceder a la API.

Los módulos de inventario, catálogo, cotizaciones, evaluaciones, colaboradores
y agenda exigen una cuenta activa. Los roles se guardan y devuelven, pero esta
implementación no diferencia permisos entre módulos por rol.

El límite de registro/login es de 30 peticiones cada 15 minutos por IP y proceso.
Para un despliegue con varias instancias se necesita un limitador compartido.
El desarrollo usa el proxy de Vite. En producción se recomienda servir frontend
y API desde el mismo dominio; la cookie Secure requiere HTTPS. Si se usa un
frontend de otro origen, configurar su URL exacta en `CORS_ORIGINS`; las cookies
SameSite=Lax requieren que ambos orígenes pertenezcan al mismo sitio.

## Preparación y pruebas

Desde `backend`, aplicar las migraciones de usuarios y sesiones y generar Prisma:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd test
```

Las pruebas habituales usan una base simulada. La siguiente prueba recorre el
flujo HTTP con PostgreSQL local dentro de una transacción que se revierte, sin
dejar cuentas ni sesiones de prueba:

```powershell
$env:RUN_AUTH_INTEGRATION='1'
node --env-file=.env --test tests/auth.test.js
Remove-Item Env:RUN_AUTH_INTEGRATION
```

Desde `frontend`, ejecutar `npm.cmd test`, `npm.cmd run lint` y `npm.cmd run build`.

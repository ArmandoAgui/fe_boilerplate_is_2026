# Autenticación y sesión del frontend

## Pantalla y validaciones

[LoginForm](../app/login/login-form.tsx) incluye etiquetas, email con `type=email`, contraseña, autocompletado, required, mensajes aria-live y estado pending del botón. useActionState conserva email y error; no conserva la contraseña dentro del estado devuelto.

La [Server Action login](../app/actions/auth.ts) recorta email, comprueba presencia de ambos campos y aplica una expresión regular sencilla de email. No impone largo máximo ni las mismas reglas del DTO backend; este continúa siendo responsable de validar el contrato. El frontend no convierte el email a minúsculas; el backend sí normaliza. No hay formulario de registro o recuperación.

## Petición real y procesamiento de respuesta

authenticate exige `process.env.API_URL`; construye la URL con `new URL("auth/login", apiUrl.replace(/\/?$/, "/"))`. Ejecuta fetch POST con JSON `{ email, password }`, Content-Type application/json y cache no-store desde el servidor Next.

Si recibe 401 o 403 devuelve null y muestra error de credenciales. Otros estados no exitosos lanzan error; también se capturan fallos de red/JSON. Busca el token en `data.token ?? data.accessToken ?? data.access_token`. El contrato actual de Nest usa accessToken y coincide con esa extracción; no hay validación de esquema de la respuesta.

Solo devuelve el access token; descarta `refreshToken`, `expiresIn` y `user`. No se llama a `/auth/me`, `/auth/refresh` o `/auth/logout` del backend. El hecho de aceptar tres nombres de token no implica tres contratos soportados por Nest.

## Persistencia y rutas

[createSession](../lib/session.ts) escribe `session` con el token, HttpOnly, path `/`, SameSite lax y Secure cuando NODE_ENV es production. Define expires siete días después, independiente del vencimiento JWT. No hay localStorage ni sessionStorage y no se entrega el token al componente cliente como parte de LoginState.

[proxy.ts](../proxy.ts) solo comprueba si existe un valor de cookie. No verifica firma, expiración, usuario activo ni permisos. Una cookie arbitraria o vencida puede permitir abrir la página estática Hello world; eso no permite por sí mismo acceder a endpoints Nest protegidos, que verifican Bearer y usuario activo. Tampoco se envía la cookie automáticamente como Authorization hacia Nest.

La home actual no obtiene datos del usuario. Existe getSession en lib/session.ts, pero no un flujo que lo use para cargar identidad o datos del dominio. Si hay cookie inválida, entrar a `/login` redirige al inicio y no ofrece recuperar sesión mediante el login; el logout local permite borrarla.

## Logout y vigencia

La acción logout elimina la cookie y redirige a `/login`; no revoca refresh en Nest. El backend emite access token con 15m y refresh de siete días por defecto, mientras frontend conserva solo el primero durante siete días. Esa diferencia deja una interfaz que cree tener sesión cuando el backend ya la rechazaría. Es una conclusión del flujo y defaults del código, sin prueba de ejecución.

## Trabajo pendiente propuesto

1. Corregir API_URL y decidir puertos en una fase de implementación; ver [integración](04-integracion-backend.md).
2. Acordar dónde almacenar refresh de forma segura en el modelo servidor/cookie y cómo sincronizar expiración; coordinar renovación para no disparar múltiples canjes del mismo token.
3. Obtener usuario y validar sesión con backend antes de operaciones protegidas. El proxy puede seguir sirviendo como redirección temprana, sin sustituir controles de servidor.
4. Completar logout con revocación del refresh; definir reacción ante 401, errores de red, sesión revocada o cuenta inactiva.
5. Definir roles y permisos del Proyecto 1 en conjunto con backend; no existen actualmente ni deben inferirse desde la UI.
6. Elegir estado global solo cuando haya necesidades concretas; no es obligatorio introducir Redux o Zustand para guardar tokens en JavaScript del navegador.
7. Verificar login correcto/incorrecto, validación, vencimiento, renovación concurrente y logout entre pestañas mediante pruebas apropiadas.

Estos puntos son recomendaciones pendientes y no cambios hechos en esta entrega. Se conserva la autenticación existente.

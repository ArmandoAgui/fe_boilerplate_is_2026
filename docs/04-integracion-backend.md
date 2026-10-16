# Integración entre Next.js y NestJS

Bases analizadas: frontend `861ee56`, backend `92a451f`. Los archivos del backend citados como `backend: ruta` se encuentran en el fork `ArmandoAgui/be_boilerplate_is_2026`; las rutas con enlaces relativos son de este frontend.

## Compatibilidad existente

| Elemento | Frontend | Backend | Evaluación |
|---|---|---|---|
| Login | [auth.ts](../app/actions/auth.ts): POST auth/login con email/password | `src/auth/controllers/auth.controller.ts`, LoginDto | Método, sufijo y nombres de campos coinciden |
| Respuesta | Reconoce accessToken (también dos alias) | AuthResponseDto devuelve accessToken, refreshToken, expiresIn, user | Token compatible; resto se descarta |
| Registro | No existe pantalla/acción | POST `/api/v1/users` | Solo backend implementado |
| Identidad | No se consulta usuario | GET `/api/v1/auth/me` protegido | Contrato disponible, consumidor pendiente |
| Renovación | No implementada | POST `/api/v1/auth/refresh` con rotación | Backend disponible con riesgo de concurrencia |
| Logout | Borra cookie | POST `/api/v1/auth/logout` revoca refresh | No están conectados |
| Roles | Sin permisos de UI | Sin campo rol ni guard RBAC | Pendiente en ambos |
| Datos de negocio | Sin pantallas de condominios | Solo User/RefreshToken | Diez módulos pendientes |

## URLs y puertos

La plantilla [.env.example](../.env.example) configura `API_URL=http://localhost:8000`. Al añadir `auth/login`, la acción llama `http://localhost:8000/auth/login`. Backend `src/main.ts` define prefijo `/api/v1` y puerto 3000 por defecto; Compose publica `${PORT:-3000}:3000`. Por tanto, las configuraciones de ejemplo no forman una integración directa compatible.

**Configuración propuesta, no aplicada:** ejecutar backend en host 3000 y frontend en 3001, con `API_URL=http://localhost:3000/api/v1` en el entorno del servidor Next. La construcción actual añade la barra y produce `http://localhost:3000/api/v1/auth/login`. Para iniciar Next en 3001 se podría usar `npm run dev -- --port 3001`; no se modifican scripts ni se ejecuta aquí.

Otra posibilidad es publicar la API en host 8000 mediante PORT de Compose y configurar `API_URL=http://localhost:8000/api/v1`. En Compose el puerto interno sigue siendo 3000. No confundir puerto publicado, puerto de escucha dentro del contenedor y prefijo HTTP.

Si Next se ejecuta en otro contenedor de la misma red, localhost refiere a ese contenedor; la URL deberá usar el servicio API, por ejemplo `http://api:3000/api/v1`, siempre que se conecte a la misma red. El Compose entregado solo define api/postgres; no contiene esa configuración frontend. En despliegue la URL debe ser alcanzable desde el servidor Next, no necesariamente desde el navegador. API_URL es de servidor y no tiene prefijo NEXT_PUBLIC.

## Transporte, CORS y errores

El navegador envía el formulario a Next; Next ejecuta fetch hacia Nest. Por esa topología servidor→servidor, el login actual no requiere CORS entre navegador y API. Backend no llama enableCors en main. Una futura llamada directa desde navegador a otro origen sí necesitará una decisión explícita de CORS y credenciales; aún no está configurada.

No hay interceptores HTTP, cliente compartido, timeout explícito, refresh automático ni agregado general de Authorization: Bearer. [proxy.ts](../proxy.ts) tampoco reenvía tokens a la API. La cookie de Next no sustituye el header exigido por JwtAuthGuard.

La acción diferencia 401/403 de otros errores, pero no muestra mensajes de validación específicos de Nest. Respuestas malformadas o sin token muestran error genérico. El contrato backend responde 400 por DTO y propiedades extra, 409 por registro duplicado, 401 por autenticación y 204 por logout; no hay rol que produzca 403 actualmente. Falta estandarizar cómo consumir esos errores en futuras pantallas.

## Clasificación del estado

| Categoría | Componentes |
|---|---|
| Implementado por lectura de código | Registro y ciclo de tokens en API; formulario y fetch login en Next; cookie y logout local; guard JWT en backend |
| Configurado pero sin flujo completo de consumo | Cookie de siete días sin relación con TTL real; getSession exportado sin uso en UI; Bearer en Swagger, sin cliente frontend para rutas protegidas; APIs refresh/me/logout sin consumidor frontend |
| Pendiente | URLs coherentes, puertos simultáneos, sesión validada y renovable, logout remoto, roles/pertenencia, módulos de negocio y pruebas integradas |
| Propuesta de mejora | Servicio API de servidor común, manejo compartido de errores, renovación coordinada, decisiones de estado justificadas y pruebas por criterio de negocio |

Que un componente esté implementado no significa que se probó en ejecución. Esta sesión no tiene node/npm/docker en PATH; no se arrancaron servidores ni se ejecutaron migraciones o tests.

## Riesgos para los diez módulos

Sin autorización por rol y unidad no se pueden proteger estados de cuenta, visitas, paquetes, votos ni datos privados del directorio. Identidad y pertenencia deben tener contrato común. Cuotas, reservas y votaciones necesitarán consistencia e idempotencia; reportes dependerán de definiciones de datos de esos módulos, y notificaciones de un contrato transversal. El backend actual no implementa esas garantías de negocio.

El PDF define un módulo por equipo dentro de diez equipos. Debe confirmarse cuál corresponde a Armando, Heber, Guille, Serrato y Yael antes de convertir la propuesta global en tareas de desarrollo. Véanse `backend: docs/07-propuesta-plataforma-condominios.md` y `docs/06-riesgos-y-recomendaciones.md` para dependencias y reparto sugerido.

## Verificación futura propuesta

1. Habilitar Node compatible y Docker Compose; conservar el Compose de cátedra y configurar secretos locales fuera de Git.
2. Levantar entorno de desarrollo aislado y aplicar migraciones revisadas; usar seed demo solo en desarrollo.
3. Probar health por `/api/v1`, login válido/erróneo y registro; inspeccionar atributos de cookie sin publicar su valor.
4. Incorporar y probar consulta de usuario, vencimiento, renovación y logout remoto cuando se implemente la sesión completa.
5. Probar permisos y aislamiento por unidad/rol antes de conectar pantallas del módulo asignado.

## Git de esta entrega

Fork: `https://github.com/ArmandoAgui/fe_boilerplate_is_2026`. Rama: `docs/analisis-inicial`. origin apunta al fork; upstream lee `https://github.com/nrecinos2001/fe_boilerplate_is_2026.git` y su URL de push es `disabled://upstream-read-only`.

La configuración local usa push por defecto a origin, main con pushRemote disabled y un hook `.git/protection-hooks/pre-push` que solo permite la rama de documentación al fork exacto. Se comprobó su rechazo para upstream y main sin enviar nada a la cátedra. Es protección local, no regla de GitHub, y no se copia automáticamente al clonar. Se preserva main en `861ee563ad9716638fd0b318991a505440e1057a`; la entrega agrega únicamente los cuatro documentos de docs, sin PR ni merge.

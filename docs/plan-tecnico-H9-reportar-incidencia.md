# H9 · Reportar incidencia

**Rama:** `feature/H9_Reportar_Una_Incidencia` desde `origin/develop` del fork `ArmandoAgui/fe_boilerplate_is_2026` (`7a89a67` al crear la rama).

**Referencia:** panel H9 de `M03_Incidencias_HOJA_MODULO.png`. Entregar en una sola pasada el formulario de residente en `/incidencias/nueva`, conectado a la API, con validación de fotos y confirmación de registro. H10 y H11 cubren la administración. H12 cubre la lista, el detalle y el seguimiento, incluida la consulta de evidencias guardadas.

## Pantalla

Usar el layout autenticado de `app/(plataforma)`. Agregar «Incidencias» a la navegación del residente, con destino a `/incidencias/nueva` y estado activo en esa pantalla. La cabecera compartida del fork sustituye la barra lateral del mockup. En el contenido, reproducir la jerarquía del panel H9 con los estilos `.panel`, `.field`, `.button` y los colores existentes de Tailwind 4. En móvil, apilar los selectores y dejar que las miniaturas se acomoden en varias filas.

- Encabezado «Incidencias / Reportar», título «Reportar incidencia» y texto «Describe el problema y adjunta fotos para que la administración lo atienda».
- En «Lugar», mostrar los radios «Mi unidad» y «Área común». Seleccionar «Mi unidad» al entrar y precargar la primera unidad disponible. Al alternar, sustituir el selector por el catálogo correspondiente y descartar la selección del otro tipo. Si un catálogo está vacío, explicarlo junto al selector y permitir elegir el otro tipo.
- Ubicar «Categoría» junto al selector de ubicación. Mostrar Fuga, Electricidad, Ascensor, Limpieza, Seguridad y Otro. Debajo, poner «Descripción» con contador `n / 500` y validar el texto recortado que se enviará, de 10 a 500 caracteres.
- En «Fotos (opcional)», agregar un selector múltiple con «Agregar foto», miniaturas de las imágenes válidas y botones accesibles para quitarlas. Aceptar JPG/JPEG o PNG, hasta 3 fotos y 5 MiB por archivo. Rechazar archivos vacíos, de formato incorrecto o que excedan el límite. Identificar el archivo rechazado junto al mensaje y permitir descartarlo. Conservar las fotos válidas y liberar las URLs temporales al quitar una foto, reiniciar el formulario o salir.
- Habilitar «Enviar reporte» cuando haya ubicación, categoría y descripción válidas y no queden errores de adjuntos pendientes. Durante el envío, bloquear un segundo envío y mostrar «Enviando…». Asociar los errores a sus campos y anunciar errores y confirmación a lectores de pantalla.
- Mostrar «Incidencia registrada», el código que devuelva la API (por ejemplo, `INC-0009`) y la etiqueta «Abierta» después de un `201`. Mantener la confirmación en H9 y ofrecer «Reportar otra incidencia» para reiniciar el formulario. Si falla el envío, conservar la selección, la descripción y las fotos para corregir o reintentar.

## Integración con el backend

El frontend usa `API_URL` en el servidor, con el prefijo `/api/v1`. La página debe comprobar el rol con `usuarioActual()` antes de cargar en paralelo los dos catálogos. Reutilizar `SinPermiso` para un usuario de otro rol y la redirección de sesión del proyecto.

| Operación | Contrato que se reutiliza |
| --- | --- |
| Sesión | `GET /api/v1/auth/me` identifica al usuario. El formulario se habilita para `RESIDENTE`. |
| Mi unidad | `GET /api/v1/unidades/mias` devuelve `{ datos: [{ id, codigo }] }` con las unidades activas vinculadas al residente. Mostrar `codigo` y enviar `id`. |
| Área común | `GET /api/v1/areas` devuelve `{ datos: [...] }`. Usar las entradas con `activa: true`, mostrar `nombre` y enviar `id`. |
| Registro | `POST /api/v1/incidencias` recibe `multipart/form-data` y devuelve `201` con `id`, `codigo`, `estado`, `categoria`, `creadaAt` y `evidencias`. |

Construir un `FormData` con `lugarTipo`, `categoria` y `descripcion`. Para `UNIDAD`, agregar solo `unidadId`. Para `AREA_COMUN`, agregar solo `areaId`. Agregar cada archivo con la clave repetida `fotos`. Los valores de categoría de la API son `FUGA`, `ELECTRICIDAD`, `ASCENSOR`, `LIMPIEZA`, `SEGURIDAD` y `OTRO`.

Enviar con una Server Action, como en Reservas y Visitas. Leer la cookie de sesión HttpOnly en el servidor y reenviar el JWT como Bearer mediante `lib/api.ts`. Ajustar el cliente compartido para mantener el encabezado JSON en las llamadas actuales y dejar que `fetch` genere el encabezado multipart y su delimitador cuando el cuerpo sea `FormData`. Configurar el límite de cuerpo de las Server Actions en 16 MB, suficiente para tres archivos de 5 MiB más los campos y el multipart. Consultar la guía de la versión instalada de Next.js antes de cambiar `next.config.ts`. La acción debe validar cantidad, tamaño, campos requeridos y rol. NestJS vuelve a comprobar los permisos, la ubicación y el contenido real de las imágenes. Para la confirmación, devolver al cliente solo el código y el estado que utiliza la pantalla.

Usar también 16 MB como límite del proxy de Next.js para que el cuerpo de la solicitud llegue completo a la Server Action. Para reportes con fotos, dar a NestJS hasta 45 segundos para recibir y validar los adjuntos.

Conservar `status`, `message` y el `campo` opcional de los errores de la API. Asociar los errores de validación o de ubicación al control correspondiente. Usar `SinPermiso` para impedir acceso directo de otros roles y mostrar el motivo del servidor si el envío devuelve `403`. Mantener la redirección existente para `401`. Ante fallos de red o del servidor, mostrar un aviso general y permitir un reintento manual.

## Archivos previstos

| Archivo | Responsabilidad |
| --- | --- |
| `app/(plataforma)/incidencias/nueva/page.tsx` | Verificar rol y cargar los catálogos. |
| `components/incidencias/nueva-incidencia.tsx` | Formulario, miniaturas, mensajes y confirmación. |
| `lib/incidencias.ts` | Tipos, categorías y reglas de validación compartidas entre el formulario y la acción. |
| `app/actions/incidencias.ts` | Validar y enviar el reporte a NestJS con la sesión del servidor. |
| `lib/api.ts` y `next.config.ts` | Admitir multipart, propagar el campo del error y configurar el límite de envío. |
| `components/reservas/ui.tsx` | Agregar el enlace de H9 a la navegación que ya usa la plataforma. |
| `tests/incidencias.test.tsx` y `e2e/incidencias.spec.ts` | Cubrir la interacción del formulario y el flujo contra la API real. |

## Verificación final

Usar las suites existentes de Vitest y Playwright. Para el flujo real, levantar el backend desde su rama H9 mientras se revisa el PR, o desde `develop` del fork cuando ya incluya H9. Aplicar las migraciones en una base de desarrollo y usar un residente de prueba con unidad vinculada y un área activa.

Desde Git Bash, con el backend de prueba escuchando en `http://localhost:3100/api/v1`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

En una terminal, levantar el frontend. En otra, ejecutar la prueba H9:

```bash
API_URL=http://localhost:3100/api/v1 npm run dev -- --port 3101
```

```bash
npx playwright install chromium
E2E_BASE_URL=http://localhost:3101 E2E_API_URL=http://localhost:3100/api/v1 npm run test:e2e -- e2e/incidencias.spec.ts
```

- **Vitest:** alternar ubicación y comprobar que solo se envía el ID correcto. Cubrir catálogos vacíos, límites de descripción de 9, 10, 500 y 501 caracteres, archivo de formato inválido, archivo mayor a 5 MiB, cuarta foto, eliminación de adjuntos, bloqueo de doble envío y conservación de datos ante un error de la API.
- **Playwright:** iniciar sesión como residente y llegar desde la navegación. Reportar en unidad sin fotos y en área común con JPG/PNG reales. Verificar el código y «Abierta» en ambos casos. Incluir en el caso con adjuntos un envío de más de 1 MiB en total y comprobar también un lote cercano a 15 MiB para validar el límite de la ruta real. Abrir la ruta sin sesión y con un rol distinto de residente para comprobar el control de acceso.
- **Revisión visual:** comparar con el panel H9 en escritorio y móvil. Verificar orden de los campos, contador, miniaturas, mensajes, foco con teclado y ausencia de desplazamiento horizontal.

H9 está lista cuando ambos tipos de ubicación funcionan con la API real y el residente recibe una confirmación con el código generado por el servidor. El PR de frontend tendrá como base `develop` del fork de frontend.

# Plan técnico frontend · H27 Consultar avisos en un solo lugar

- Repositorio `fe_boilerplate_is_2026`, rama `feature/H27_Consultar_avisos_en_un_solo_lugar`.
- Base frontend `origin/develop` en `6a3b4068786dfda36786caf8ab57cde45880046c`.
- Backend de referencia `develop` en `1a5e5c07e1a4e9718497455b56fe5bd16a6dacac`, con H27 integrado.
- Fuentes funcionales: [H27 · KAN-136](https://infsoftwareuca.atlassian.net/browse/KAN-136), [H18 · KAN-105](https://infsoftwareuca.atlassian.net/browse/KAN-105), [convenciones · KAN-10](https://infsoftwareuca.atlassian.net/browse/KAN-10) y el mockup adjunto `M09_Notificaciones_HOJA_MODULO.png`.
- Fuente técnica: guía `docs/H27-consultar-avisos.md` del backend de H27.
- Estado al 14 de noviembre de 2026: bloque único implementado y verificado con la fixture HTTP de H27.

## Bloque único · Bandeja, campana y navegación

Completar la secuencia de este bloque en una sola pasada y preparar una entrega frontend hacia `develop`. H27 permite al residente consultar sus avisos, filtrarlos, marcarlos como leídos y abrir el módulo relacionado. H18 reutiliza esta pantalla para paquetes. La generación corresponde al backend de H28 y la bandeja puede desarrollarse con el contrato de H27 y datos controlados mientras se revisa H28.

### Contrato HTTP y arquitectura

`API_URL` vive en servidor Next y ya incluye `/api/v1`. Pasar rutas relativas a `lib/api.ts` para conservar el prefijo. Mantener la sesión en la cookie HttpOnly actual y dejar que el cliente HTTP de servidor adjunte el Bearer a Nest.

| Operación | Contrato de H27 | Uso en frontend |
| --- | --- | --- |
| Bandeja | `GET /api/v1/notificaciones/mias` | Pasar `pagina` y `tamanoPagina=20`. Enviar filtros solo cuando se elija un valor concreto. |
| Campana | Mismo GET con `estado=NO_LEIDA&pagina=1&tamanoPagina=2` | Usar `noLeidas` para el contador y `datos` para la vista previa de hasta dos avisos recientes, según M09. |
| Lectura | `PATCH /api/v1/notificaciones/:id/lectura`, sin body | Esperar `200` con `{ id, estado: "LEIDA", leidaAt }`. La operación es idempotente y conserva la primera fecha de lectura. |

La respuesta del GET es `{ datos, noLeidas, total, pagina, tamanoPagina }`. Cada aviso contiene `id`, `moduloOrigen`, `tipoEvento`, `titulo`, `mensaje`, `referenciaId` (UUID o `null`), `estado` y `creadaAt` (ISO 8601). `leidaAt` pertenece al PATCH. El GET no expone `userId` ni `claveEvento`. Conservar el orden del servidor (fecha descendente y UUID descendente en empate). `total` corresponde al filtro y `noLeidas` es global para el residente, incluso cuando la página está vacía.

### Secuencia de implementación

1. **Confirmar la base y tipar el contrato.** Revisar si `develop` incorporó rutas de residente para H12 o H24 y ajustar el mapa de destinos según el árbol real. Instalar las dependencias con el archivo de bloqueo y seguir `AGENTS.md` consultando las guías locales de la versión Next instalada. Definir tipos, filtros, nombres de módulos, íconos y destinos en `lib/notificaciones.ts`. Mantener los dos filtros del contrato (`moduloOrigen` y `estado`), los cinco módulos y los estados `NO_LEIDA` y `LEIDA`. Usar `es-SV` y `America/El_Salvador`.

2. **Conectar las operaciones desde el mismo origen.** Crear Route Handlers para `GET /api/notificaciones/mias` y `PATCH /api/notificaciones/:id/lectura` que reutilicen `lib/session.ts` y `lib/api.ts`. Dado que `proxy.ts` excluye `/api`, el handler debe comprobar la sesión y conservar los códigos de autorización y propiedad que devuelve Nest. Incorporar en `api()` un modo explícito para obtener `ApiError(401)` con sesión ausente o vencida y conservar el comportamiento de redirección en las pantallas y acciones actuales. Responder JSON con `Cache-Control: private, no-store` y usar el fetch de servidor sin caché y con timeout. Aceptar solo query, tipos y rangos del contrato. Rechazar claves inesperadas o repetidas con `400`. Admitir `pagina` como entero positivo seguro con offset seguro y `tamanoPagina` de 1 a 50. Validar el UUID del PATCH, conservar el `404` genérico para aviso inválido, ajeno o inexistente y formar rutas con segmentos codificados. Traducir fallos upstream a un mensaje común. Los handlers usan una ruta de backend fija y la sesión autenticada.

3. **Montar la bandeja de residente.** Añadir `app/(plataforma)/avisos/page.tsx` con verificación de `usuarioActual()` en servidor. Para Administrador o Seguridad, reutilizar `SinPermiso`. Para residente, mostrar el título **Avisos**, el texto introductorio del mockup, los filtros etiquetados **Módulo de origen** y **Estado**, y la lista. Cada fila tiene ícono del módulo, título, mensaje, fecha, estado y acción. Resaltar `No leída` mediante texto y color. Formatear `creadaAt` en `<time dateTime>` con minutos recientes, hora de hoy o fecha corta para días anteriores. Usar las opciones Todos, Cuotas, Paquetería, Comunicados, Asambleas e Incidencias, y Todos, No leída y Leída. Guardar filtros y página en la URL, omitir valores por defecto, normalizar entradas inválidas y volver a página 1 al cambiar un filtro. Consultar al servidor con cada consulta nueva, cancelar la anterior y descartar respuestas obsoletas. Mostrar el total filtrado, el contador global con su etiqueta y controles **Anterior** y **Siguiente**. Si una lectura vacía la última página, saltar a la última página válida.

4. **Integrar la campana global y adaptar la composición de M09.** Montar una sola campana para Residente en el encabezado de `EstructuraPlataforma`, junto al selector de tema y la cuenta. Compartir estado entre campana y bandeja mediante un proveedor cliente montado en el layout, asociado al ID de usuario que devuelve `auth/me`. Agregar **Avisos** a la navegación de residentes con `aria-current="page"` en su ruta. En `/avisos` usar la composición de M09 con menú lateral verde en escritorio, migas **Inicio / Avisos**, filtros encima de la lista y paginación en el pie. Construir la lista de enlaces a partir de destinos reales del repositorio y compartirla con la navegación residente existente. Mantener el encabezado común y su funcionalidad de tema y sesión. En móvil, adaptar el menú a la navegación compacta, apilar filtros y ajustar el ancho de filas y panel al viewport. Reusar superficies, bordes, contraste y foco de los temas Claro, Oscuro y Sistema. Los íconos y la hoja de referencia se traducen a componentes de la interfaz.

5. **Sincronizar contador y vista previa.** Consultar al montar el proveedor de residente y luego cada 30 segundos en pestaña visible, con una sola solicitud en curso y un solo temporizador. Refrescar al recuperar visibilidad y limpiar al desmontar o cambiar de usuario. Mostrar el valor real de 0 a 99 y `99+` desde 100. Distinguir la carga inicial de un cero confirmado. El panel muestra el conteo exacto, el título y fecha de hasta dos avisos no leídos y el enlace **Ver todos los avisos**. Abrir el panel o entrar a la bandeja no envía PATCH. Usar un botón con nombre accesible, `aria-expanded` y `aria-controls`, cierre con Escape y clic exterior, y restitución del foco al botón con Escape. Mantener el último valor confirmado si falla un sondeo y ofrecer reintento en el panel.

6. **Unificar la selección desde bandeja y campana.** Al elegir un aviso, llamar al PATCH idempotente y esperar la confirmación antes de navegar. Bloquear clics repetidos sobre el mismo aviso mientras se guarda. Tras `200`, actualizar el estado confirmado, retirar el aviso de la vista previa y, si aplica, del filtro **No leída**. Invalidar respuestas de GET anteriores al PATCH. Recargar la bandeja con la consulta vigente y reconciliar el contador con el GET de la campana desde el proveedor persistente, incluso al salir de `/avisos`. El contador no se decrementa otra vez al reabrir un aviso leído. Si falla el PATCH, conservar el estado confirmado, informar el error y ofrecer reintento. Ante `404` mostrar **El aviso ya no está disponible** y volver a consultar. Para avisos sin ruta de residente disponible, mostrar **Marcar como leída** y explicar que el módulo aún no está disponible. Desde la campana, mantener abierto el panel y conservar el enlace a la bandeja para ese caso.

| Origen y evento | Acción y destino | Disponibilidad en la base |
| --- | --- | --- |
| Cuotas · `CUOTA_POR_VENCER` | **Ver estado de cuenta** → `/cuotas` | Disponible. |
| Paquetería · `PAQUETE_RECIBIDO` | **Ver paquete** → `/paquetes` | Disponible. Es el destino que fija H18. |
| Asambleas · `VOTACION_ABIERTA` | **Ver asamblea** → `/asambleas` | Disponible. La referencia identifica un tema de votación. |
| Comunicados · `COMUNICADO_NUEVO` | **Ver comunicado** → `/comunicados/:id` con referencia válida y detalle disponible, o `/comunicados` si existe el listado | Las vistas de residente corresponden a H24. |
| Incidencias · `INCIDENCIA_RESUELTA` | **Ver incidencia** → `/incidencias/:id` con referencia válida y detalle disponible, o `/incidencias` si existe el listado | El seguimiento privado corresponde a H12. `/incidencias/nueva` es el formulario de creación de H9. |

Usar un mapa de rutas internas por módulo o evento. Para detalles, validar el UUID y codificarlo. Con referencia nula o inválida, usar el listado disponible. Cuando solo esté presente el formulario de H9 o la pantalla administrativa de H23, aplicar la acción de lectura del paso 6. Renderizar siempre el título y el mensaje del backend como texto. H18 espera que el aviso de paquete incluya el código y la fecha de recepción. La rama backend de H28 revisada incluye el código en el mensaje. La fecha `creadaAt` indica cuándo se generó el aviso. Registrar en la comprobación integrada de H18 si el productor todavía omite la fecha de recepción en el mensaje.

7. **Completar estados, accesibilidad y recuperación.** Diferenciar carga inicial, bandeja vacía (**No tienes avisos**), filtros sin coincidencias (**No hay avisos que coincidan con estos filtros**) y error de servicio. Con filtros sin coincidencias, permitir restablecerlos. Mostrar **Reintentar** ante errores de listado y mantener los filtros. Ante `401`, limpiar el estado, detener el sondeo y redirigir a `/login?expired=1`. Ante `403`, limpiar el estado de la campana y detener el sondeo de esa sesión. En la bandeja, mostrar `SinPermiso`. Verificar el foco visible, controles etiquetados, acceso por teclado y anuncios de carga o error que no se repitan cada 30 segundos.

8. **Verificar y preparar la entrega.** Usar Vitest, Testing Library y Playwright del repositorio. Crear una fixture HTTP de H27 siguiendo `e2e/fixtures/h10-api.mjs` y `e2e/fixtures/start-frontend.mjs`, con identidades de prueba y estado de lectura propio de cada caso. Probar los 30 segundos con reloj controlado. Para una comprobación con el backend real, apuntar `API_URL` a una instancia aislada con la migración de H27 y avisos de prueba. Registrar evidencia de escritorio y móvil y los resultados reales en el PR a `develop`. Distinguir V06 de interfaz de la generación real de H18, V04 y los enlaces de H12/H24. Los recorridos dependientes se comprueban cuando estén disponibles las historias que los implementan.

### Archivos previstos

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `lib/notificaciones.ts` | Tipos HTTP, filtros, presentación de fecha e íconos, mapa de destinos. |
| `lib/api.ts` | Adaptación mínima para conservar el `401` JSON en los handlers. |
| `app/api/notificaciones/mias/route.ts` y `app/api/notificaciones/[id]/lectura/route.ts` | Operaciones del mismo origen. |
| `app/(plataforma)/avisos/page.tsx` | Ruta con autorización de residente. |
| `app/(plataforma)/layout.tsx`, `components/plataforma/estructura.tsx` y `components/reservas/ui.tsx` | Proveedor, campana global y navegación con **Avisos** activo. |
| `components/notificaciones/` | Bandeja, campana y acciones compartidas. |
| `tests/notificaciones*.test.*`, `e2e/notificaciones.spec.ts` y fixture HTTP nueva | Cobertura de contrato, presentación y recorridos de usuario. |

### Criterios de aceptación

| Caso | Resultado verificable |
| --- | --- |
| Acceso y sesión | Residente activo ve campana y bandeja. Administrador y Seguridad obtienen **Sin permiso** al abrir la URL y no generan sondeo. Una sesión inválida vuelve al login y ningún dato de avisos de la sesión anterior reaparece. |
| V06 · Campana | Responde desde cualquier ruta autenticada de residente. Cubre 0, 1, 99, 100 y más. Refresca a los 30 s en pestaña visible, conserva el último estado en un error temporal y muestra hasta dos avisos y el enlace a la bandeja. |
| V06 · Bandeja | Ícono, título, mensaje, fecha, estado y acción. Orden y paginación del backend, 20 por página, filtros combinables, navegación hacia atrás con filtros conservados y conteos diferenciados. |
| V06 · Lectura y navegación | El PATCH vacío precede al cambio de ruta. Al seleccionar desde ambas vistas, el aviso leído desaparece de la vista previa y del filtro **No leída**, y el contador se actualiza. Se prueban duplicados, carreras con el sondeo, `404` y fallos temporales. |
| Destinos | Navegación a `/paquetes`, `/cuotas` y `/asambleas`. Cuando falte detalle con referencia válida, usar el listado disponible. En H12/H24 ausentes, permitir lectura e informar del destino pendiente. |
| Estados y visual | Carga, vacío, filtro sin resultados, error y reintento. Escritorio, móvil, teclado y temas Claro/Oscuro/Sistema sin desbordamiento del panel. |
| Integración posterior | H18 se verifica con un aviso real del productor H28. V04 se valida cuando H11 resuelva y emita el aviso mediante H28. El detalle de incidencia y el de comunicado se comprueban cuando sus rutas de residente estén integradas. |

Comandos previstos para la pasada de implementación desde esta rama:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run validate:temporary
# Arrancar la fixture HTTP de H27 y el frontend de prueba antes de Playwright.
npm run test:e2e -- e2e/notificaciones.spec.ts
git diff --check
```

El criterio de salida es una sola entrega que cubra V06 contra el contrato H27, con evidencia de que el residente puede consultar, filtrar y leer avisos y abrir los destinos disponibles. El PR debe registrar la base efectiva, los resultados locales y los recorridos de otras historias pendientes de verificación. La validación temporal del repositorio cubre JSON y formato. Los resultados de tipos, build y pruebas se presentan como evidencia separada.

## Ejecución del bloque

- Estado: completado en `feature/H27_Consultar_avisos_en_un_solo_lugar`, sin commit ni push.
- Implementado: contrato tipado, Route Handlers del mismo origen, filtros normalizados en URL, bandeja, campana global del residente, lectura idempotente, navegación disponible, fallback de H12/H24, accesibilidad y composición adaptable de M09.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm test`: 14 archivos y 162 pruebas aprobadas.
- `npm run build`: aprobado; Next generó `/avisos` y ambas rutas API.
- `npm run validate:temporary`: aprobado.
- `npm run test:e2e -- e2e/notificaciones.spec.ts`: 8 recorridos aprobados con fixture HTTP; incluye contador 0/1/99/100+, permisos, filtros con historial, PATCH, destino de paquetes, fallback de H12/H24, teclado, sondeo de 30 segundos y temas claro/oscuro/sistema.
- Se generaron capturas de escritorio y móvil en `test-results/`; la carpeta está ignorada por Git.
- La fixture cubre el contrato frontend; no se hizo una prueba integrada contra el backend real. El contenido y navegación de los avisos generados por H28, H18 y las futuras rutas de H12/H24 quedan para su integración.
- En este entorno, `npm ci` no pudo instalar el árbol porque el `package-lock.json` de la base referencia versiones ausentes o distintas de `@emnapi`. Para ejecutar la validación se usó `npm install --no-package-lock --prefer-offline`; el lockfile no se modificó.

# Módulo 2 frontend — H5–H8

Responsable: Armando Antonio Aguilar Rosales. Equipo Sonnet 5. 29/10/2026.

## Fuentes, arquitectura e integración

Se revisaron PDF de historias del 28/10/2026 (páginas visibles 3–7,15–20), código main `861ee56`, rama `origin/docs/analisis-inicial` (`a124bb1`), autenticación, integración, scripts y AGENTS.md. Se leyeron las guías incluidas en Next 16.3.6 para Server Actions, formularios, páginas, layout y error (`retry`, no `reset`). No se modifica la documentación de análisis.

Se conserva App Router, React 19, Tailwind 4, login/Server Actions, cookie HttpOnly y diseño base. Se agrupan las rutas autenticadas en `app/(plataforma)` con un header compartido; no había sidebar previo. El layout raíz conserva fuentes y tema. No se usan imágenes ni marcas externas.

La API de Nest continúa siendo la autoridad para roles, pertenencia y reglas. `lib/api.ts`, solo servidor, obtiene la cookie, envía Bearer, usa no-store/timeout y traduce errores. Las acciones de `app/actions/reservas.ts` nunca aceptan un token del cliente; los roles no se confían al formulario. Cada llamada llega al guard JWT existente. Un 401 redirige a `/login?expired=1`; proxy permite esa ruta incluso con cookie expirada, evitando el bucle de redirección del boilerplate.

## Adaptación del estado global y sesión

El PDF propone Zustand con usuario/rol/token/unidades/contador de avisos. Se añade Zustand 5 para `useAuthStore` con usuario, rol y unidades, inicializado por request desde datos autenticados del servidor y provisto por contexto. El token se conserva exclusivamente en la cookie HttpOnly del boilerplate: no se copia a Zustand, localStorage ni al HTML. Esta adaptación conserva la autenticación existente conforme al encargo y reduce exposición de credenciales. Formularios y filtros viven en estado local. El contador de avisos pertenece a M9 y no se inventa en este módulo.

La renovación JWT y revocación remota de logout continúan pendientes de M0; no se introduce un segundo sistema de autenticación. Al expirar, se pide iniciar sesión nuevamente. El store se vuelve a inicializar al entrar con una nueva sesión; este módulo no ofrece edición en vivo de roles/unidades.

## Páginas y componentes

| Ruta | Rol | Comportamiento |
|---|---|---|
| / | Autenticado | Inicio y enlaces por rol |
| /areas | Residente, Administrador | Catálogo de áreas activas, nombre/capacidad, estado vacío |
| /areas/[id]/disponibilidad | Residente, Administrador | Selector fecha hoy–hoy+30, 24 bloques, leyenda por texto/símbolo/color, precarga a nueva reserva solo para residente |
| /reservas/nueva | Residente | Área, unidad vinculada, fecha/hora, duración 1–4 y asistentes; validación inmediata, pending, errores |
| /reservas | Residente | Lista paginada de reservas de unidades vinculadas, confirmación con código/datos, cancelar mediante diálogo modal |
| /admin/areas | Administrador | Tabla completa incluidas inactivas; crear/editar capacidad/estado y varias franjas por día; copiar semana; mensajes bajo campos |

`components/reservas/ui.tsx` aporta Titulo, Catalogo, Navegacion y SinPermiso. Componentes específicos: Disponibilidad, NuevaReserva, MisReservas y AdminAreas. `components/auth-provider.tsx` comparte identidad de presentación. `lib/reservas.ts` concentra tipos, zona/fechas, formato, plazo de cancelación y validación de horarios. No se duplica un layout por pantalla.

`loading.tsx` presenta Cargando… y skeleton; los error boundaries muestran el mensaje del PDF y botón Reintentar. Hay estado vacío para catálogo, día sin horario, sin unidades, sin reservas y sin áreas administrativas. Página SinPermiso con Ir al inicio. `not-found.tsx` para área inexistente/inactiva. Responsive probado a 1280 y 390 píxeles; editor apilable y tabla desplazable. Controles etiquetados, foco visible, leyenda textual, modal HTML con Escape/foco y mensajes aria-live/role alert. El botón Cancelar se recalcula cada 30 segundos para ocultarse al acercarse al plazo; el servidor valida de nuevo.

## Contratos consumidos

Base `API_URL` incluye `/api/v1`, nunca es NEXT_PUBLIC. Se usan `GET auth/me`, `GET unidades/mias`, `GET areas`, `GET areas/:id/disponibilidad?fecha=...`, `POST reservas`, `GET reservas/mias?pagina=...&tamanoPagina=20`, `PATCH reservas/:id/cancelacion`, `POST areas` y `PATCH areas/:id`.

Crear reserva transforma la fecha/hora local America/El_Salvador (UTC−6, sin cambios estacionales) a ISO UTC:
```json
{"areaId":"11111111-1111-4111-8111-111111111111","unidadId":"22222222-2222-4222-8222-222222222222","inicio":"2026-10-30T18:00:00.000Z","duracionHoras":2,"asistentes":4}
```
Crear/editar área:
```json
{"nombre":"Salón de eventos","capacidad":40,"activa":true,"horarios":[{"diaSemana":1,"horaInicio":"06:00","horaFin":"22:00"}]}
```
El error `{statusCode:409,error:"Conflict",message:"Ese horario ya fue reservado. Elija otro."}` se presenta sin borrar valores del formulario. Otros 409 (máximo de dos, nombre duplicado o cancelación fuera de plazo) conservan el mensaje del servidor. Después de reservar se navega a Mis reservas con banner Reserva confirmada y datos completos en tarjeta. Cancelación muestra Reserva cancelada, actualiza la tarjeta y refresca datos; revalidatePath/no-store evita conservar disponibilidad cancelada.

## Ejecución

Requiere backend del PR `ArmandoAgui/be_boilerplate_is_2026`, rama `feature/modulo-02-reservas`, con migraciones y seed aplicados. El frontend no incluye migraciones.

```bash
# Node 24 actualizado / npm 11 recomendados
npm ci
cp .env.example .env.local
# API_URL=http://localhost:3000/api/v1
npm run dev -- --port 3001
```

Seed del backend: `admin@condominio.test`, `seguridad@condominio.test`, `residente1` a `residente5@condominio.test`, contraseña exclusivamente de pruebas `Prueba123!`. residente1 tiene A-101/A-102; residente2 comparte A-101. Las cuatro áreas iniciales están abiertas 06:00–22:00 toda la semana.

Verificación manual: entrar como admin y crear/editar área; entrar como residente y elegir un bloque futuro, confirmar y revisar código/unidad, cancelar y comprobar que el bloque se libera. Seguridad ve Sin permiso al abrir rutas del módulo. Una segunda sesión que ocupe el bloque antes de confirmar provoca 409 y conserva formulario.

## Pruebas y dependencias añadidas

Zustand satisface el estado de identidad del PDF. No había framework de pruebas frontend: se añadieron Vitest 4 (misma familia que backend), Testing Library, user-event, jest-dom y jsdom como dependencias de desarrollo para verificar comportamiento de controles. Playwright, también de desarrollo, verifica el flujo real con Next, Nest y PostgreSQL. No se añaden bibliotecas visuales ni de calendario.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
# Iniciar backend en 3100 con PostgreSQL aislado migrado y seed.
API_URL=http://localhost:3100/api/v1 npm run dev -- --port 3101
E2E_BASE_URL=http://localhost:3101 E2E_API_URL=http://localhost:3100/api/v1 npm run test:e2e
```

Resultados locales: 21 pruebas Vitest aprobadas: catálogo, enlaces/bloques, fecha, carga/vacío/error/reintento, validaciones, reserva UTC, 409 conservando valores, diálogo/cancelación/error de plazo, creación/edición/solapamientos y navegación por rol. Tres escenarios Playwright aprobados: recorrido completo en escritorio, mismo recorrido móvil, y sesión/permisos/JWT inválido. Ambos recorridos crean un área con UI, reservan con datos precargados, cancelan, comprueban liberación y provocan un 409 real con una reserva desde la API antes de confirmar el formulario. Los errores iniciales de selectores/tipos de tests se corrigieron; la corrida final pasa.

Las capturas en `docs/screenshots/` se generan con datos de prueba. Playwright requiere servidor frontend y backend activos; nunca se ejecuta contra producción. Al terminar desactiva solo el área que creó y cancela su reserva de conflicto, conservando el historial. El backend añade otras 40 unitarias y 12 pruebas HTTP/PostgreSQL, incluyendo concurrencia real. No se declara cobertura exhaustiva ni prueba de carga.

CI `.github/workflows/reservas.yml`: instalación, lint, typecheck, unitarias y build. Las pruebas integradas entre repositorios se ejecutaron localmente; no están en CI frontend porque requieren la rama backend complementaria sin fusionar.

## Capturas

- [Administración](screenshots/admin-areas.png)
- [Disponibilidad escritorio](screenshots/disponibilidad-escritorio.png)
- [Disponibilidad móvil](screenshots/disponibilidad-movil.png)
- [Confirmación escritorio](screenshots/reserva-escritorio.png)
- [Confirmación móvil](screenshots/reserva-movil.png)

## Pendientes y decisiones para el equipo

- Integrar los dos PR juntos y coordinar la base compartida de roles/unidades con M0/M1. No sustituir tablas existentes al integrar otras ramas.
- Mantener el JWT HttpOnly en vez de exponerlo en Zustand es una adaptación técnica documentada. No implementa contador de avisos M9.
- El PDF muestra Cancelar solo con más de 2h, mientras la API permite exactamente 2h: se respetan ambos textos. La interfaz se actualiza cada 30s; el backend decide el instante real.
- Desactivar impide nuevas reservas, conserva las confirmadas y permite consultarlas/cancelarlas por unidad; el área inactiva no tiene disponibilidad consultable.
- `npm audit` informa avisos heredados: Next 16.3.6 crítico y zod transitivo alto. La actualización amplia del framework debe revisarse antes de un despliegue público; este PR conserva las versiones base. No se afirma ausencia de vulnerabilidades ajenas al módulo.
- GitHub devolvió 403 al consultar protección de main con la integración; no se alteraron reglas. El usuario pidió asignar revisores posteriormente: los PR se dejan sin solicitudes de revisión automáticas y nunca se fusionan.

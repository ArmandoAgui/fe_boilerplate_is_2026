# Módulo 2 frontend — H5–H8

Responsable: Armando Antonio Aguilar Rosales. Sonnet 5. Actualizado 29/10/2026.

## Fuentes y cambio de alcance

Se revisaron el PDF del 28/10/2026 (páginas 3–7,15–20), main inicial `861ee56`, docs/analisis-inicial (`a124bb1`), autenticación, integración y guías locales de Next 16.3.6. No se modifica la documentación de análisis.

**Decisión posterior explícita del usuario:** reservas personales, máximo dos confirmadas futuras por usuario, solo el creador consulta y cancela. Esta instrucción sustituye la regla por unidad del PDF; se registra en [D-M2-01 del backend](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/feature/modulo-02-reservas/docs/decisiones/2026-10-29-reservas-personales.md). El formulario y las tarjetas ya no solicitan ni muestran unidades.

## Arquitectura y seguridad

Se conserva App Router, React 19, Tailwind 4, login existente, Server Actions, cookie HttpOnly y JWT. `app/(plataforma)/layout.tsx` comparte cabecera/identidad sin segundo sidebar. El servidor consulta auth/me; reservas ya no necesita cargar unidades. AuthProvider conserva su contrato genérico para otros módulos, con lista vacía en este layout.

`lib/api.ts` obtiene la sesión solo en servidor, envía Bearer y utiliza timeout/no-store. Las acciones `app/actions/reservas.ts` no aceptan tokens ni userId del cliente. La API determina propiedad, cupo y autorización. Un 401 redirige a /login?expired=1, permitido por proxy aun con cookie antigua. Sin permisos se muestra la pantalla del PDF. La renovación/logout remoto de M0 sigue fuera de este cambio.

Zustand mantiene usuario/rol/unidades de presentación, conforme a la adaptación documentada: token exclusivamente HttpOnly, sin copiarlo al HTML/localStorage/store. No se inventa contador de avisos de M9. Formularios y filtros viven en estado local.

## Vistas y flujo vigente

| Ruta | Rol | Comportamiento |
|---|---|---|
| / | Autenticado | Inicio y navegación por rol |
| /areas | Residente, Administrador | Catálogo de áreas activas y capacidad |
| /areas/[id]/disponibilidad | Residente, Administrador | Fecha hoy–hoy+30 y bloques con texto/símbolo/color; enlaces a reservar solo para residente |
| /reservas/nueva | Residente | Sin selección redirige a áreas. Con selección, resumen fijo de área/fecha/inicio, duración y asistentes editables |
| /reservas | Residente | Solo reservas del creador, paginación, confirmación y cancelación modal |
| /admin/areas | Administrador | Tabla incluidas inactivas y editor de franjas múltiples por día |

El residente elige área y bloque en disponibilidad. La confirmación muestra un resumen, no inputs deshabilitados: nombre/capacidad, fecha larga local e intervalo (fin recalculado por duración). No permite cambiar área, fecha o inicio desde esa pantalla. “Elegir otro horario” regresa a la disponibilidad del área y fecha elegidas; desde allí se pueden consultar otras áreas. Si los parámetros son incompletos/incorrectos, no se puede enviar una reserva. El backend sigue validando cualquier dato manipulado o un horario que dejó de estar disponible.

El formulario pide solo duración (1–4 horas) y asistentes (1–capacidad). Muestra error bajo campo y error de servidor accesible. Con 409 conserva los valores y el resumen. Al confirmar redirige a Mis reservas con código y estado. Las tarjetas muestran área/fecha/horario/asistentes/estado; no unidad. Cancelar exige confirmación, actualiza tarjeta, anuncia Reserva cancelada y revalida disponibilidad/lista. El botón se recalcula cada 30s y solo se muestra a más de 2h del inicio; la API permite exactamente 2h como indica H7.

`components/reservas/ui.tsx`: Titulo/Catalogo/Navegacion/SinPermiso. Componentes específicos: Disponibilidad, NuevaReserva, MisReservas, AdminAreas. `lib/reservas.ts` agrupa tipos y utilidades. Loading con skeleton, error boundaries con Reintentar, vacío de catálogo/reservas/áreas y not-found de área inexistente/inactiva. Responsive, controles etiquetados, foco visible y modal nativo accesible. No se incluyen imágenes externas.

## Apariencia

ThemePicker en login y cabecera: Claro, Oscuro, Sistema. La elección se guarda un año en cookie de presentación; el layout la lee para renderizar el tema correcto desde servidor, sin destello. Sistema sigue cambios del dispositivo mediante CSS. `components/theme-provider.tsx` no añade dependencias.

Claro: marfil suave/salvia. **Oscuro: gris grafito**, superficies neutras y acentos azul grisáceo; se eliminó el fondo verde a petición del usuario. Los tokens semánticos de globals.css cubren texto principal/secundario, superficies, bordes, controles, disponibilidad, badges y errores. Controles de al menos 44px, color-scheme para campos nativos, fuente Geist existente y skeleton respetando movimiento reducido. Se comprobó contraste ≥4.5:1 para pares principales de texto, estados, botones y errores en ambos modos; no se declara una auditoría integral de accesibilidad.

## Contratos

API_URL incluye /api/v1 y es solo servidor. Endpoints consumidos: auth/me, areas, areas/:id/disponibilidad, POST reservas, GET reservas/mias, PATCH reservas/:id/cancelacion y POST/PATCH areas. Ya no se envía unidadId.

```json
{"areaId":"11111111-1111-4111-8111-111111111111","inicio":"2026-10-30T18:00:00.000Z","duracionHoras":2,"asistentes":4}
```

```json
{"nombre":"Salón de eventos","capacidad":40,"activa":true,"horarios":[{"diaSemana":1,"horaInicio":"06:00","horaFin":"22:00"}]}
```

Fechas/hora seleccionadas se transforman de America/El_Salvador a ISO UTC. No se considera la zona del navegador para negocio. El servidor completa userId/código. Mis reservas recibe `{datos,total,pagina,tamanoPagina}` y ordena por inicio.

## Ejecución

Requiere el backend complementario con **ambas migraciones del módulo**, incluida `20261029160000_reservas_personales`. Nuevas reservas no requieren unidad. No desplegar este frontend con el contrato antiguo.

```bash
npm ci
cp .env.example .env.local
# API_URL=http://localhost:3000/api/v1
npm run dev -- --port 3001
```

Node 24 actualizado/npm 11. Seed backend del PDF: admin/seguridad/residente1–residente5 @condominio.test, contraseña exclusivamente de pruebas Prueba123!. Residente1 y residente2 comparten unidad base, pero sus reservas ahora son privadas e independientes. Cuatro áreas iniciales 06:00–22:00 toda la semana.

## Pruebas y capturas

Vitest 4 + Testing Library/jsdom/user-event/jest-dom para comportamiento; Playwright para navegador real. Zustand es la única dependencia de runtime añadida al boilerplate. Sin biblioteca visual/calendario adicional.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
# Arrancar API/Next de prueba con BD aislada migrada y seed
E2E_BASE_URL=http://localhost:3103 E2E_API_URL=http://localhost:3102/api/v1 npm run test:e2e
```

Resultados actuales: **23 pruebas de componentes** (incluyen resumen fijo, usuario sin unidad, selección incompleta, 409 conservando resumen, validación y cancelación). Cinco escenarios de navegador: flujos completos escritorio/móvil con confirmación sin campos editables de área/fecha/inicio/unidad y conflicto real generado por otro usuario; roles/sesión; persistencia/SSR/contraste de temas; Sistema/teclado/móvil. El backend tiene 40 unitarias y 13 HTTP/PostgreSQL con las nuevas reglas personales y concurrencia real. Las comprobaciones finales se reportan en los PR.

CI frontend verifica instalación/lint/typecheck/unitarias/build. Navegador entre repositorios se ejecuta localmente con el backend complementario; no está simulado con mocks. Los escenarios de flujo generan áreas propias y las desactivan al finalizar, sin tocar datos del usuario. No usar producción.

[Confirmación escritorio](screenshots/confirmacion-escritorio.png) · [Confirmación móvil](screenshots/confirmacion-movil.png) · [Claro](screenshots/tema-claro.png) · [Oscuro grafito](screenshots/tema-oscuro.png) · [Confirmación grafito](screenshots/confirmacion-grafito.png) · [Administración](screenshots/admin-areas.png).

## Revisión y límites

Comunicar el cambio aprobado respecto al PDF al equipo/cátedra y coordinar el despliegue de ambos PR. Los datos previos conservan creador y unidad histórica en BD; esa unidad ya no otorga acceso. No se cancelan reservas anteriores automáticamente ni se reasignan.

Persisten avisos heredados de npm audit (Next y zod transitivo) y renovación/logout de M0; no se afirma que el boilerplate esté libre de vulnerabilidades. GitHub negó lectura de protección de main con 403, sin cambios de reglas. Revisores pendientes de asignación manual, según instrucción del usuario. No se realizan merges ni cambios directos a main/originales.

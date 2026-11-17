# Probar la integración de sprints y reglas del Product Owner

Esta rama se usa junto con la rama backend del mismo nombre, `feature/integracion-sprints-product-owner-20261115`, con destino a develop. Integra H24 y completa las interfaces pendientes de H11/H12, H17, H29/H30, además de las reglas revisadas por el PO.

## Preparación local

1. Node 24. En backend: copiar `.env.example` a `.env`, configurar PostgreSQL local, ejecutar `npm ci`, `npm run prisma:deploy`, `npm run db:seed` y arrancar con `PORT=3112 npm run start:dev` (en Windows establecer PORT en `.env`).
2. En frontend: copiar `.env.example` a `.env.local` y establecer `API_URL=http://localhost:3112/api/v1/`.
3. Ejecutar `npm ci` y `npm run dev -- --port 3113`. Abrir http://localhost:3113.
4. Cuentas de demostración: `admin@condominio.test`, `seguridad@condominio.test`, `residente1@condominio.test` a `residente5@condominio.test`, contraseña `Prueba123!`. Usarlas únicamente en entornos locales de prueba.

Cada proceso tiene puerto propio. No se requiere restaurar ni borrar la base existente para aplicar la migración, pero usar una base nueva para la primera revisión permite comprobar que no dependen de datos previos.

## Recorridos de aceptación

| Sesión | Recorrido |
|---|---|
| Administrador | `/admin/residentes`: registrar residente, vincularlo a varias unidades y repetir la asociación sin duplicarla. Otros roles no pueden registrar ni vincular. |
| Administrador | `/admin/cuotas/generar`: generar importe fijo global; `/admin/cuotas`: corregir monto/vencimiento o anular cuota pendiente indicando motivo. Los pagos se conservan. |
| Residente | `/cuotas`: consultar base, recargo y total; pagar completo. Recargo único de 5% después del vencimiento. Tarifa global inicial configurable por backend, USD 50.00 por defecto. |
| Residente/Administrador | Intentar reservar teniendo una cuota vencida en cualquier unidad vinculada: debe bloquearse tanto la solicitud como su aprobación. Pagar o anular esa deuda y volver a intentar. Se conserva límite personal de dos confirmadas futuras y cancelación con al menos 24 horas. |
| Residente | `/incidencias/nueva` y `/incidencias`: reportar unidad/área, consultar descripción, fotos protegidas, responsable y línea de tiempo. Un reporte ajeno responde 404. |
| Administrador | `/admin/incidencias`: asignar/priorizar, iniciar atención y resolver confirmando. Residente recibe aviso con enlace al detalle. |
| Seguridad/Residente | `/seguridad/accesos`: solicitar confirmación al residente de destino. Este entra a `/visitas` y autoriza. Solo entonces seguridad registra entrada. Registrar salida y repetir ingreso durante la vigencia. Documento opcional, nombre/apellido y fecha requeridos. |
| Seguridad | `/seguridad/paquetes/nuevo`: recepción con aviso a residentes; `/seguridad/paquetes`: buscar, seleccionar residente de la unidad y entregar. No se aceptan terceros ni doble entrega. Corregir/anular exige motivo. |
| Residente | `/paquetes`: pendientes, entregados y anulados de las unidades propias. Una entrega conserva quién retiró y cuándo. |
| Residente/Administrador | `/asambleas/:id`: consultar participación al abrir y votar una vez por unidad. Administración solo ve resultados al cerrar y puede conocer la opción de los votos nuevos. Sin bloqueo por deuda ni quórum mínimo. |
| Residente | `/comunicados`: ver todas las audiencias de sus unidades actuales, incluidos comunicados anteriores al alta. Consultar no exige ni genera confirmación de lectura. Publicados no se editan. |
| Cualquier rol autenticado | `/directorio`: buscar respetando las preferencias de cada residente. Solo el propietario modifica su privacidad. |
| Residente | `/avisos`: enlaces de comunicado/incidencia abren sus detalles privados. No se añadió correo electrónico (NiceToHave). |
| Administrador | `/admin/reportes`: cuatro indicadores, fecha, fórmula, fuente, cero frente a Sin datos. `/admin/reportes/compartir`: presentar en pantalla completa o descargar PDF general para compartir con cualquier destinatario. No se exponen unidades morosas ni enlaces públicos. |

## Verificaciones

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Con API y frontend de pruebas activos y la base sembrada, ejecutar (configurar las variables en el entorno correspondiente a Windows/Linux):

```sh
E2E_BASE_URL=http://localhost:3113 E2E_API_URL=http://localhost:3112/api/v1 npm run test:e2e -- e2e/integracion-po.spec.ts e2e/comunicados.spec.ts
```

Estas pruebas de navegador crean datos. Deben apuntar a una base local de pruebas, nunca producción. La suite nueva comprueba hostname local antes de operar. Las pruebas backend usan una base independiente terminada en `_test`.

El lockfile reparado permite instalar mediante npm ci; no se utiliza npm install como sustituto de la comprobación limpia. Se mantiene la validación temporal de GitHub Actions solicitada anteriormente.

## Cambios de criterio que deben reflejarse en Jira

H6 aprobación/deuda; H13/H14 múltiples ingresos y confirmación previa; H17 retiro identificado desde plataforma; H21/H22 voto identificable por administración al cierre; H23/H24 sin obligación de lectura; H26 directorio para los tres roles. El documento backend explica migración, decisiones de recargo, historial y límites de los ajustes contables.

## Dependencias del frontend

Se actualizan Next.js y eslint-config-next de 16.3.6 a 16.4.6 y se corrigen dependencias transitivas admitidas por sus rangos, además de reparar el lockfile. La auditoría original detectó vulnerabilidades críticas en Next.js; referencias oficiales: [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) y [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Se repiten instalación limpia, compilación, pruebas y recorridos de navegador tras la actualización.

Después de las correcciones, `npm audit --omit=dev` no reporta vulnerabilidades en dependencias de producción del frontend. La auditoría completa conserva 7 avisos moderados relacionados con herramientas de linting y minimatch; no se forzaron versiones mayores transitivas sin compatibilidad demostrada.

## Evidencia de validación local — 15/11/2026

- Node 24; instalación limpia mediante npm ci en ambos repositorios.
- Build, typecheck y lint correctos en ambos proyectos.
- Backend: 220 pruebas unitarias y 205 pruebas HTTP/PostgreSQL, sin omitidas por falta de base.
- Frontend: 181 pruebas de componentes/reglas.
- Navegador: ocho recorridos de comunicados, reportes/PDF, paquetería, confirmación de visitas, permisos, móvil y ciclo de incidencias. Se repiten sobre Next 16.4.6.
- 18 migraciones aplicadas en base nueva y Prisma migrate diff sin diferencias.
- npm audit --omit=dev: cero vulnerabilidades en ambos repositorios. Esto no implica auditoría completa del código ni cero avisos en dependencias de desarrollo.
- Validación temporal de CI y git diff --check correctos. Los tests completos anteriores son locales; no se presentan como ejecuciones de GitHub Actions.

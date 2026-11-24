# H6/H7: gestionar solicitudes y limpiar Mis reservas

## Administración

En `/admin/reservas`, el administrador puede aprobar o rechazar. Rechazar abre un diálogo que exige un motivo de 3 a 500 caracteres. Solo se retira la solicitud cuando la API confirma el éxito; ante error se conserva el motivo y se muestra el mensaje. Al completar la última solicitud de una página posterior a la primera, se vuelve a la página anterior.

## Residente

En `/reservas` se muestra el estado `RECHAZADA` y su motivo. «Eliminar del listado» está disponible para canceladas, rechazadas y finalizadas (`fin <= ahora`); requiere confirmación y conserva el historial en el backend. No permite eliminar reservas activas ni sustituye su cancelación. Se mantiene la cancelación con al menos 24 horas de anticipación y se explica en la tarjeta cuando ya no puede cancelarse. El backend verifica propietario y reglas de nuevo.

La eliminación usa `DELETE /api/v1/reservas/{id}`; el rechazo usa `PATCH /api/v1/reservas/{id}/rechazo` con `{ motivo }`. Las acciones del servidor conservan la autenticación existente y revalidan los listados afectados. No se envían tokens al navegador.

## Integración y comprobación

Requiere el PR compañero de backend con estado `RECHAZADA` y eliminación lógica. Hotfix `1.0.3` creado desde `main`, con PR principal hacia `main` y PR de retorno hacia `develop`. Heber revisa ambos. Integrar primero a `main` y después el retorno; este PR no despliega AWS. Publicar coordinadamente tras la aprobación y aplicar las migraciones del backend antes de utilizar la interfaz nueva.

Con Node 24: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Recorrido manual:

1. Solicitar una reserva futura como residente.
2. Abrir solicitudes como administrador; rechazarla con un motivo.
3. Actualizar Mis reservas y comprobar estado y motivo.
4. Elegir «Eliminar del listado», confirmar y comprobar que desaparece y se ajusta el total.
5. Comprobar que una reserva próxima activa no presenta Eliminar ni Cancelar, y explica las 24 horas.
6. Para una reserva activa a más de 24 horas, cancelar primero y después eliminar del listado.

Las pruebas automatizadas cubren confirmación, validación del motivo, errores sin perder la tarjeta, elegibilidad y regreso de página. Los permisos y la concurrencia se prueban por HTTP con PostgreSQL en el PR de backend.

## Resultado local — 23/11/2026

Sobre la base `main`: 214 pruebas aprobadas, typecheck, lint y build correctos. La base de `develop` se comprueba por separado en el PR de retorno. También se verificó con navegador y backend/PostgreSQL locales: rechazo con motivo, consulta del residente y eliminación persistente después de recargar, sin errores de JavaScript. Se revisó la interfaz de escritorio y móvil a 390 px, sin desbordamiento horizontal. No se utilizaron ni modificaron reservas de AWS para esta validación.

# Pruebas de componente de H5–H8 y H23–H24

La guía de entrega requiere suites junto a los componentes, identificadas por historia y criterio. Se trasladaron las pruebas existentes de reservas y comunicados a sus carpetas de componentes, conservando su ejecución con `npm test` y ampliando casos del resumen de reserva, duración, estado pendiente y navegación desde disponibilidad.

```sh
npm ci
npm test
npm test -- components/reservas/reservas.test.tsx -t 'H5\.'
npm test -- components/comunicados/nuevo-comunicado.test.tsx -t 'H23\.'
npm test -- components/comunicados/mis-comunicados.test.tsx -t 'H24\.'
```

Usar Node 24. Cambiar el filtro H5 por H6, H7 o H8 según corresponda. Vitest conserva las suites de `tests/` y descubre también `components/**/*.test.tsx`; las trasladadas no quedan duplicadas.

Estas pruebas usan React Testing Library, acciones de servidor simuladas y datos ficticios. No acceden al entorno AWS ni demuestran persistencia de PostgreSQL. Para cada historia, el caso de componente del Excel reúne sus pruebas frontend y las pruebas Jest del backend (documentadas en `docs/pruebas-armando.md` del backend).

Los nombres `ACn:` corresponden a los criterios Jira consultados el 21/11/2026. H6 conserva el comportamiento aprobado por el PO: solicitud pendiente hasta que el administrador apruebe, sin confirmación automática. H6 AC3/AC8 y H7 AC1 requieren conciliar texto Jira con esas reglas antes de cerrar aceptación.

La ejecución automatizada no se registra como prueba manual ni como aceptación hecha por otro integrante. Esas ejecuciones requieren su propio resultado, fecha, persona real y captura, y permanecen pendientes en el plan hasta completarse.

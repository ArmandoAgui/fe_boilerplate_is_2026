# Pruebas de componente de H2, H29 y H30

Suites Vitest + React Testing Library con los criterios de interfaz de Heber del sprint 2, colocadas junto a sus componentes. Cada `describe` lleva el ID y título de la historia y cada `it` empieza con `ACn:`, en el orden de los criterios de la tarjeta Jira. La API, la sesión y las acciones de servidor se simulan.

| Historia | Archivo | Criterios |
|---|---|---|
| H2. Pagar una cuota pendiente | `components/cuotas/pagar-cuota.test.tsx` | AC1 a AC3 |
| H29. Consultar indicadores consolidados | `components/reportes/reportes.test.tsx` | AC1 y AC2 |
| H30. Compartir resultados administrativos | `components/integracion/reportes.test.tsx` | AC1 y AC2 |

Los criterios de backend están en las suites Jest del backend (`docs/pruebas-heber.md` del backend). En el plan de pruebas, frontend y backend de una historia se registran como un solo caso de componente.

Se trasladaron `tests/pagar-cuota.test.tsx` y `tests/reportes.test.tsx` a las suites anteriores, conservando sus casos.

```sh
npm test
npm test -- components/cuotas/pagar-cuota.test.tsx -t 'H2\.'
npm test -- components/reportes/reportes.test.tsx -t 'H29\.'
npm test -- components/integracion/reportes.test.tsx -t 'H30\.'
```

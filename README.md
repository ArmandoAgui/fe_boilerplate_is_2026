# SONNET 5 — Frontend

Interfaz Next.js/React de administración de condominio. Proyecto 1, Ingeniería de Software UCA, ciclo 02/2026. Versión preparada: 1.0.0.

Frontend: https://sonnet5.98.81.166.66.sslip.io · API: https://sonnet5.98.81.166.66.sslip.io/api/v1 · Swagger: https://sonnet5.98.81.166.66.sslip.io/api/docs (disponible al activar la release).

## Equipo

| Integrante | GitHub | Responsabilidad principal |
|---|---|---|
| Heber Josué Canales Henríquez | HC2003 | H1–H4, H29–H30 |
| Armando Antonio Aguilar Rosales | ArmandoAgui | H5–H8, H23–H24; integración y despliegue |
| Guillermo Alejandro Hernández Dubón | guillermodubon | H9–H12, H27–H28 |
| Diego Rafael Flores Serrato | DiegoFSerrato | H13–H18 |
| Fernando Yael Herrera Tamayo | Yael2222 | H19–H22, H25–H26 |

## Documentación central

La documentación completa y vigente se encuentra en el [backend](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/README.md). Durante la revisión de la release puede consultarse en [release/1.0.0](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/release/1.0.0/README.md).

- [Guía de uso](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/01-guia-de-uso.md)
- [Arquitectura](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/02-arquitectura.md)
- [Modelo de datos](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/03-modelo-de-datos.md)
- [API](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/04-api.md)
- [Instalación local](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/05-instalacion-local.md)
- [Despliegue](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/06-despliegue.md)
- [Forma de trabajo](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/07-forma-de-trabajo.md)
- [Historias por módulo](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/08-historias.md)
- [Problemas conocidos](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/09-problemas-conocidos.md)

## Desarrollo

Node 24, `npm ci`, copiar `.env.example` a `.env.local` y ajustar API_URL al backend con prefijo /api/v1/. `npm run dev -- --port 3001`; API en 3000. Instalación Docker completa y seed común: [guía](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/05-instalacion-local.md).

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Las credenciales de evaluación se entregan por Moodle. Nunca guardar JWT, contraseñas ni secretos en variables NEXT_PUBLIC.

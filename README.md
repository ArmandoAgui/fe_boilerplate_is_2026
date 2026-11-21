# SONNET 5 — Frontend

Interfaz Next.js/React de administración de condominio. **Proyecto asignado:** Proyecto 1, SONNET 5. **Curso:** Ingeniería de Software UCA, ciclo 02/2026, Sección 01. Versión frontend: 1.0.2 (hotfix de navegación horizontal compartida). Backend compatible: v1.0.0.

## Ambiente desplegado

| Componente | URL |
|---|---|
| Frontend | https://sonnet5.98.81.166.66.sslip.io |
| Backend | https://sonnet5.98.81.166.66.sslip.io/api/v1 |
| Documentación de la API (Swagger) | https://sonnet5.98.81.166.66.sslip.io/api/docs |

Swagger estará disponible al activar la release. Los usuarios de prueba se entregan en Moodle, no en el repositorio.

## Integrantes

| Nombre | Carnet | Usuario de GitHub | Módulos o historias principales |
|---|---|---|---|
| Fernando Yael Herrera Tamayo | 00038623 | [@Yael2222](https://github.com/Yael2222) | H19–H22, H25–H26 |
| Heber Josue Canales Henriquez | 00054621 | [@HC2003](https://github.com/HC2003) | H1–H4, H29–H30 |
| Diego Rafael Flores Serrato | 00029823 | [@DiegoFSerrato](https://github.com/DiegoFSerrato) | H13–H18 |
| Guillermo Alejandro Hernandez Dubon | 00106423 | [@guillermodubon](https://github.com/guillermodubon) | H9–H12, H27–H28 |
| Armando Antonio Aguilar Rosales | 00174323 | [@ArmandoAgui](https://github.com/ArmandoAgui) | H5–H8, H23–H24; integración y despliegue |

## Documentación

La documentación completa y vigente se encuentra en el [backend](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/README.md). Durante la revisión de la release puede consultarse en [release/1.0.0](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/release/1.0.0/README.md).

1. [Guía de uso](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/01-guia-de-uso.md)
2. [Arquitectura](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/02-arquitectura.md)
3. [Modelo de datos](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/03-modelo-de-datos.md)
4. [API](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/04-api.md)
5. [Instalación local](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/05-instalacion-local.md)
6. [Despliegue](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/06-despliegue.md)
7. [Forma de trabajo](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/07-forma-de-trabajo.md)
8. [Historias por módulo](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/08-historias.md)
9. [Problemas conocidos](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/09-problemas-conocidos.md)

## Desarrollo

Node 24, `npm ci`, copiar `.env.example` a `.env.local` y ajustar API_URL al backend con prefijo /api/v1/. `npm run dev -- --port 3001`; API en 3000. Instalación Docker completa y seed común: [guía](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/main/docs/05-instalacion-local.md).

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Las credenciales de evaluación se entregan por Moodle. Nunca guardar JWT, contraseñas ni secretos en variables NEXT_PUBLIC.

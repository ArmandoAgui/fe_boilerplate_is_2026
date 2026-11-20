# Desplegar el frontend junto con toda la plataforma

La guía operativa completa se mantiene en el backend para que los pasos de PostgreSQL, migraciones, API, HTTPS y respaldos tengan una sola fuente:

**[Paso a paso de despliegue en AWS](https://github.com/ArmandoAgui/be_boilerplate_is_2026/blob/feature/docker-plataforma-ubuntu/docs/despliegue/PASO-A-PASO-AWS.md)**

Incluye preparación de EC2/Ubuntu24.04, puertos del Security Group, conexión SSH, bootstrap, construcción local de imágenes amd64, transferencia por SSH, activación de la release, credenciales iniciales, carga de datos, pruebas, actualización y recuperación.

## Versión desplegada de referencia

- Fecha:16 de noviembre de2026.
- Frontend: `a1db269c440f078e3efc557611dd943378f3db78`.
- Backend: `c60e1c5c3bda16d503b10401a5d2e25c9295cd96`.
- Rama de ambos: `feature/docker-plataforma-ubuntu`, con integración de Heber H29/H30 y reglas del PO.
- Sitio de pruebas: <https://sonnet5.98.81.166.66.sslip.io>.

Los SHA corresponden a los artefactos realmente desplegados, anteriores a estos commits de documentación. La instancia tiene2GiB: se compilaron las imágenes en el equipo local y se importaron por SSH; no se compiló Next sobre EC2. El backend administra la orquestación y el frontend recibe `API_URL` únicamente como configuración del servidor.

## Verificación del frontend

1. Abrir el dominio HTTPS, sin aceptar certificados inválidos.
2. Ingresar con la cuenta inicial configurada en el bootstrap. Consultar su contraseña desde una terminal SSH privada, siguiendo la guía; no está en Git.
3. Entrar a Reportes: deben aparecer cuatro tarjetas H29 y un filtro de fechas.
4. Descargar PDF H30 del período elegido y comprobar que se abre. La presentación y el PDF utilizan el mismo servicio de cálculo que el panel.
5. Probar vista móvil, sesión, navegación administrativa y un rango inválido.

Estos recorridos se verificaron en AWS, con cookie Secure/HttpOnly y PDF descargado. Una base nueva muestra Sin datos hasta cargar registros. No se crean usuarios demo con contraseñas públicas.

Para detalles del Dockerfile, standalone y las pruebas locales, consultar [docker.md](docker.md). Para actualizar el sitio, desplegar una nueva pareja de commits/imágenes compatibles según la guía completa; un push a este PR no actualiza automáticamente AWS.

# Frontend de producción con Docker

Esta entrega depende del backend y su orquestación de despliegue (`feature/docker-plataforma-ubuntu`). Ambos PR se encadenan a la actualización de Heber (backend #39/frontend #34), sobre los PR de integración del Product Owner; no se publica automáticamente develop ni se hace merge.

## Decisiones

- Node 24 Alpine, misma versión mayor del proyecto. Imagen base fijada por digest multi-arquitectura; las pruebas de referencia se ejecutan en linux/amd64.
- Build por etapas: npm ci con lockfile, compilación y runtime standalone. El runtime copia standalone, .next/static y public; no incluye herramientas de test ni todo node_modules de desarrollo.
- `output: standalone` conserva SSR, Server Actions, cookies y Route Handlers. No se usa exportación estática porque estos flujos requieren servidor.
- `API_URL=http://api:3000/api/v1/` se inyecta al arrancar el contenedor. No es NEXT_PUBLIC, no se incorpora al navegador ni se usa localhost para llamar al backend.
- HOSTNAME=0.0.0.0 y PORT=3000 dentro del contenedor. Ese puerto no se publica en el host: Caddy recibe HTTPS y accede por la red privada de Compose.
- El proceso corre como node, sin capacidades Linux y con filesystem de solo lectura. Compose provee tmpfs para /tmp y .next/cache; la caché es prescindible y se pierde al recrear.
- `/api/health` es un liveness público sin datos de sesión ni configuración. La disponibilidad de la API/PostgreSQL se comprueba en backend y en las dependencias de Compose.
- Telemetría de Next desactivada. La fuente Next/font se descarga durante el build y queda empaquetada; el build necesita acceso a npm/Google Fonts, pero el navegador no depende de descargarlas desde Google al usar la app.
- Dockerignore excluye .env reales, .git, node_modules, builds locales, evidencia de tests y carpetas de editor. No se pasan secretos en ARG ni se desactiva TLS.

## Build independiente

```sh
docker build --build-arg VCS_REF=SHA_COMPLETO_FRONTEND -t sonnet5-web:SHA_COMPLETO_FRONTEND .
```

Para publicación precompilada destinada al servidor x86_64:

```sh
docker buildx build --platform linux/amd64 \
  --build-arg VCS_REF=SHA_COMPLETO_FRONTEND \
  --tag ghcr.io/TU_CUENTA/sonnet5-web:SHA_COMPLETO_FRONTEND --push .
```

El script del servidor recibe el digest de la imagen publicada y verifica la etiqueta OCI de revisión antes de activarla. No se deben mezclar imágenes amd64 con una instancia ARM64.

## Ejecutar toda la plataforma

El Compose, bootstrap de Ubuntu, operación por releases y recuperación están en `backend/deploy/`. La guía completa está en `backend/docs/despliegue/README.md`, junto al registro de decisiones técnicas. Usar el comando `sonnet5` para que se apliquen imágenes, SHA y configuración correctos de cada release.

La producción requiere HTTPS: la cookie de sesión usa Secure. El proxy conserva Host y X-Forwarded-Proto, de modo que las Server Actions validan el origen correcto sin abrir allowedOrigins de forma global.

## Verificación local de contenedores

Desde backend, con el frontend de esta rama disponible:

```sh
python3 deploy/tests/smoke-docker.py --frontend ../frontend --build --keep
```

El script crea un proyecto Docker aleatorio, publica solo en loopback y usa una CA local de Caddy. Su salida indica la ruta temporal y URL. Luego, desde frontend:

```sh
E2E_DOCKER_ROOT=/tmp/sonnet5-smoke-RUTA_GENERADA \
E2E_BASE_URL=https://localhost:PUERTO_GENERADO \
npm run test:e2e -- e2e/docker.spec.ts
```

Solo esta suite acepta la CA local de pruebas en Playwright; el smoke Python verifica la cadena TLS con el certificado raíz de esa CA. No se modifica el almacén de confianza del equipo ni se usa esa excepción en producción. Los casos validan login, atributos de cookie, una Server Action real, lectura autenticada de una fotografía restaurada, rechazo anónimo y vista móvil.

Referencias: [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [variables de entorno](https://nextjs.org/docs/app/guides/environment-variables).

# Análisis técnico del frontend

Fecha: 16/10/2026. Código base: `861ee563ad9716638fd0b318991a505440e1057a`. Proyecto 1: plataforma de condominios. Revisión estática sin modificar código ni dependencias.

## Tecnologías verificadas

| Área | Estado real y evidencia |
|---|---|
| Framework | Next.js `16.3.6` sobre React y React DOM `19.2.8`, versiones exactas en [package.json](../package.json) y [lock](../package-lock.json) |
| Lenguaje | TypeScript `^5`, lock `5.9.3`; `.tsx` en UI y `.ts` en acciones/configuración |
| Construcción | Scripts `next dev`, `next build` y `next start`; no es una SPA Vite |
| Node | No hay engines raíz ni archivo de versión; entrada Next del lock requiere `>=20.9.0`. `@types/node ^20` es tipado, no la versión instalada de Node |
| Estilos | Tailwind `^4` (lock `4.3.3`), plugin `@tailwindcss/postcss` y [CSS global](../app/globals.css) con variables de color y modo oscuro por preferencia del sistema |
| UI | HTML y clases Tailwind; sin sistema de componentes externo declarado |
| Rutas | App Router basado en `app/`; `next/navigation` para redirect y `proxy.ts` para redirecciones |
| HTTP | fetch nativo en una Server Action; no hay Axios ni instancia/interceptores HTTP |
| Formularios | React `useActionState`, FormData y validación HTML; no hay React Hook Form, Formik ni Zod |
| Estado | Estado local del formulario y cookie de sesión; no hay Redux, Zustand ni contexto global de usuario |
| Calidad | ESLint `^9`, lock `9.39.5`, eslint-config-next `16.3.6`; config de TypeScript estricta |
| Pruebas | No se encontraron specs ni script de test o framework de pruebas declarado |

El [lock](../package-lock.json) refleja resoluciones, no paquetes instalados en esta revisión. [AGENTS.md](../AGENTS.md) solicita consultar las guías incluidas en node_modules/next antes de escribir código; esta fase solo crea Markdown y no implementa código Next.

## Funcionalidades implementadas

La [página login](../app/login/page.tsx) monta [LoginForm](../app/login/login-form.tsx), con email, contraseña, mensajes accesibles y botón deshabilitado durante envío. La [acción login](../app/actions/auth.ts) valida datos, llama realmente al backend, obtiene un access token, crea cookie y redirige a `/`. La [página inicial](../app/page.tsx) muestra Hello world y botón para cerrar sesión. No hay dashboards o módulos de condominios.

[lib/session.ts](../lib/session.ts) guarda la cookie session, HttpOnly, SameSite lax, Secure en producción y vigencia de siete días. [proxy.ts](../proxy.ts) comprueba si existe cookie para redirigir al login o al inicio. Esto constituye una implementación parcial de sesión; no prueba autenticación válida ni roles.

La especificación PDF describe una pantalla genérica sin mecanismo de autenticación de fondo. El commit encontrado ya añade petición de login y cookies. Se documenta esta diferencia para evitar rehacer trabajo o asumir que el flujo completo ya está resuelto.

## Herramientas y configuración

[tsconfig.json](../tsconfig.json) usa target ES2017, resolución bundler, strict, noEmit, JSX de React y alias `@/*` a la raíz. Incluye tipos generados por Next. [eslint.config.mjs](../eslint.config.mjs) combina reglas core-web-vitals y TypeScript; ignora `.next`, out, build y next-env.d.ts. [next.config.ts](../next.config.ts) exporta configuración vacía; [postcss.config.mjs](../postcss.config.mjs) activa Tailwind.

El [layout raíz](../app/layout.tsx) configura español, metadatos y fuentes Geist/Geist Mono mediante next/font/google. La compilación puede depender de obtener esas fuentes según el entorno; no se intentó build. El CSS body declara Arial/Helvetica aunque el layout también define variables de fuentes.

## Entorno y límites de validación

El README contiene instrucciones genéricas de Next; no documenta todavía la integración del proyecto. [.env.example](../.env.example) define únicamente API_URL, con puerto 8000 y sin `/api/v1`. El repositorio no contiene Dockerfile ni Compose para frontend. La base de Docker de la cátedra pertenece al backend y debe conservarse según el PDF.

En esta sesión no se encontraron node, npm o docker en PATH. No se instalaron dependencias ni se ejecutaron lint, build, servidor o pruebas. Se verifican documentos y Git; no se afirma que exista una demo funcionando. Los ajustes de entorno y pruebas se proponen para la siguiente fase en [integración](04-integracion-backend.md).

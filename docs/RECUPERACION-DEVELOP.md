# Recuperación temporal de develop

H19 importaba un componente y tipos desde archivos vacíos. H20/H21 dependían
de una API de asambleas y votaciones cuya base de datos no estaba completa.
Un merge sin conflictos de texto no garantiza que el proyecto compile.

Esta recuperación retira temporalmente pantallas, acciones, tipos y enlaces
de paquetes, asambleas y votaciones. Conserva login, temas, reservas y
visitas H13. El trabajo original permanece en sus ramas y commits.

## Verificación

Con Node 24 y el entorno configurado según `.env.example`:

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm test
```

Para la prueba manual, apuntar `API_URL` a un backend con las dependencias
resueltas o con su PR de recuperación temporal. Verificar login, áreas,
reservas y visitantes con los usuarios del seed local.

## Reintegración

Completar PaquetesClient y los tipos de paquetes, corregir las rutas y
permisos de asambleas y coordinar los contratos con backend. Preparar un
PR desde develop que restaure el código retirado junto con las correcciones.
Volver a fusionar las mismas ramas no restaura automáticamente código que
Git ya considera integrado y que después fue revertido.

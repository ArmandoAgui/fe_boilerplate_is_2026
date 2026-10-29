# Archivos de la entrega H5–H8

## Creados

- `docs/screenshots/confirmacion-escritorio.png`
- `docs/screenshots/confirmacion-movil.png`
- `docs/screenshots/confirmacion-grafito.png`

- `components/theme-provider.tsx`
- `e2e/tema.spec.ts`
- `docs/screenshots/tema-claro.png`
- `docs/screenshots/tema-oscuro.png`

- `.github/workflows/reservas.yml`
- `app/(plataforma)/admin/areas/page.tsx`
- `app/(plataforma)/areas/[id]/disponibilidad/page.tsx`
- `app/(plataforma)/areas/page.tsx`
- `app/(plataforma)/error.tsx`
- `app/(plataforma)/layout.tsx`
- `app/(plataforma)/loading.tsx`
- `app/(plataforma)/not-found.tsx`
- `app/(plataforma)/page.tsx`
- `app/(plataforma)/reservas/nueva/page.tsx`
- `app/(plataforma)/reservas/page.tsx`
- `app/actions/reservas.ts`
- `app/error.tsx`
- `components/auth-provider.tsx`
- `components/reservas/admin-areas.tsx`
- `components/reservas/disponibilidad.tsx`
- `components/reservas/mis-reservas.tsx`
- `components/reservas/nueva-reserva.tsx`
- `components/reservas/ui.tsx`
- `docs/archivos-modulo-02.md`
- `docs/modulo-02-reservas.md`
- `docs/screenshots/admin-areas.png`
- `docs/screenshots/disponibilidad-escritorio.png`
- `docs/screenshots/disponibilidad-movil.png`
- `docs/screenshots/reserva-escritorio.png`
- `docs/screenshots/reserva-movil.png`
- `e2e/reservas.spec.ts`
- `lib/api.ts`
- `lib/reservas.ts`
- `playwright.config.ts`
- `tests/reservas.test.tsx`
- `tests/setup.ts`
- `vitest.config.mts`

## Modificados o trasladados

- `app/login/page.tsx` (selector y superficies por tema)
- `app/login/login-form.tsx` (controles compartidos y foco)

- `M	.env.example`
- `M	.gitignore`
- `M	README.md`
- `M	app/globals.css`
- `M	app/layout.tsx`
- `D	app/page.tsx`
- `M	package-lock.json`
- `M	package.json`
- `M	proxy.ts`

`app/page.tsx` se trasladó a `app/(plataforma)/page.tsx` para compartir layout autenticado. No se reemplaza el login.

Detalles de páginas, componentes, integración y pruebas: [modulo-02-reservas.md](modulo-02-reservas.md).

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiFixture = "http://127.0.0.1:3100";

async function resetFixture(request: APIRequestContext) {
  await request.post(`${apiFixture}/__test/reset`);
}

async function login(page: Page, usuario: "residente" | "admin" | "seguridad" = "residente") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(`${usuario}@condominio.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
}

async function estadoFixture(request: APIRequestContext) {
  return (await (await request.get(`${apiFixture}/__test/state`)).json());
}

test.beforeEach(async ({ request }) => resetFixture(request));

test("residente consulta, filtra, lee y abre el destino disponible", async ({ page, request }) => {
  await login(page);
  await page.getByRole("link", { name: "Avisos", exact: true }).click();
  await expect(page).toHaveURL(/\/avisos$/);
  await expect(page.getByRole("heading", { name: "Avisos", exact: true })).toBeVisible();
  await expect(page.locator("aside nav a[href='/avisos']")).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Módulo de origen")).toBeVisible();
  await expect(page.getByText("5 avisos, 3 no leídos")).toBeVisible();
  await expect(page.getByRole("button", { name: "3 avisos sin leer" })).toBeVisible();
  await page.screenshot({ path: "test-results/h27-avisos-escritorio.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("header nav[aria-label='Principal'] a[href='/avisos']")).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/h27-avisos-movil.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  const antesDeAbrir = await estadoFixture(request);
  const botonCampana = page.getByRole("button", { name: "3 avisos sin leer" });
  await botonCampana.click();
  const panel = page.getByRole("region", { name: "Avisos recientes" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Llegó un paquete para tu unidad")).toBeVisible();
  await expect(panel.getByText("Nuevo comunicado")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Ver todos los avisos" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(botonCampana).toBeFocused();
  expect((await estadoFixture(request)).parches).toBe(antesDeAbrir.parches);

  await page.getByLabel("Módulo de origen").selectOption("PAQUETERIA");
  await expect(page).toHaveURL(/moduloOrigen=PAQUETERIA/);
  await page.getByLabel("Estado").selectOption("NO_LEIDA");
  await expect(page).toHaveURL(/estado=NO_LEIDA/);
  await page.goBack();
  await expect(page).toHaveURL(/moduloOrigen=PAQUETERIA$/);
  await expect(page.getByLabel("Estado")).toHaveValue("");
  await page.goForward();
  await expect(page).toHaveURL(/estado=NO_LEIDA/);
  await expect(page.getByRole("heading", { name: "Llegó un paquete para tu unidad" })).toBeVisible();

  await page.getByRole("button", { name: "Ver paquete: Llegó un paquete para tu unidad" }).click();
  await expect(page).toHaveURL(/\/paquetes$/);
  await expect(page.getByText("No tienes paquetes pendientes")).toBeVisible();
  await expect(page.getByRole("button", { name: "2 avisos sin leer" })).toBeVisible();
  expect((await estadoFixture(request)).parches).toBe(1);
});

test("aviso sin pantalla de H12/H24 se puede leer y conserva la bandeja", async ({ page }) => {
  await login(page);
  await page.goto("/avisos?moduloOrigen=COMUNICADOS&estado=NO_LEIDA");
  await expect(page.getByRole("heading", { name: "Nuevo comunicado" })).toBeVisible();
  await page.getByRole("button", { name: "Marcar como leída: Nuevo comunicado" }).click();
  await expect(page.getByText("Aviso leído. El módulo relacionado aún no está disponible.")).toBeVisible();
  await expect(page).toHaveURL(/\/avisos\?/);
  await expect(page.getByText("No hay avisos que coincidan con estos filtros")).toBeVisible();
});

test("normaliza filtros inválidos y responde con caché privada", async ({ page, request }) => {
  await login(page);
  await page.goto("/avisos?moduloOrigen=FALSO&estado=TODOS&pagina=0&extra=x");
  await expect(page).toHaveURL(/\/avisos$/);

  const respuesta = await page.request.get("/api/notificaciones/mias");
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["cache-control"]).toBe("private, no-store");
  expect((await respuesta.json()).datos).toHaveLength(5);
  expect((await estadoFixture(request)).lecturas).toBeGreaterThan(0);

  const desconocida = await page.request.get("/api/notificaciones/mias?unexpected=1");
  expect(desconocida.status()).toBe(400);
  const repetida = await page.request.get("/api/notificaciones/mias?estado=LEIDA&estado=NO_LEIDA");
  expect(repetida.status()).toBe(400);
  const uuidInvalido = await page.request.patch("/api/notificaciones/no-es-uuid/lectura");
  expect(uuidInvalido.status()).toBe(404);
});

test("administración no obtiene campana ni acceso a la bandeja", async ({ page, request }) => {
  await login(page, "admin");
  await expect(page.getByRole("button", { name: /avisos sin leer/i })).toHaveCount(0);
  await page.goto("/avisos");
  await expect(page.getByText("No tienes permiso para ver esta página")).toBeVisible();
  await expect(page.getByRole("button", { name: "Anterior" })).toHaveCount(0);
  expect((await estadoFixture(request)).lecturas).toBe(0);
});

test("seguridad tampoco recibe campana ni acceso a la bandeja", async ({ page, request }) => {
  await login(page, "seguridad");
  await expect(page.getByRole("button", { name: /avisos sin leer/i })).toHaveCount(0);
  await page.goto("/avisos");
  await expect(page.getByText("No tienes permiso para ver esta página")).toBeVisible();
  expect((await estadoFixture(request)).lecturas).toBe(0);
});

test("la campana representa correctamente 0, 1, 99 y más de 99 sin leer", async ({ page, request }) => {
  await login(page);
  for (const cantidad of [0, 1, 99, 100]) {
    await request.post(`${apiFixture}/__test/unread/${cantidad}`);
    await page.goto("/avisos");
    const nombre = cantidad === 1 ? "1 aviso sin leer" : `${cantidad} avisos sin leer`;
    const boton = page.getByRole("button", { name: nombre });
    await expect(boton).toBeVisible();
    if (cantidad === 100) await expect(boton.locator("span").last()).toHaveText("99+");
    if (cantidad > 0 && cantidad < 100)
      await expect(boton.locator("span").last()).toHaveText(String(cantidad));
    await boton.click();
    const panel = page.getByRole("region", { name: "Avisos recientes" });
    await expect(panel).toBeVisible();
    const titulo = `${cantidad} ${cantidad === 1 ? "aviso" : "avisos"} sin leer`;
    await expect(panel.getByRole("heading", { name: titulo })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Ver todos los avisos" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(boton).toBeFocused();
  }
});

test("la campana refresca a los treinta segundos mientras la pestaña está visible", async ({ page, request }) => {
  await page.clock.install({ time: new Date("2026-11-14T16:30:00.000Z") });
  await login(page);
  await expect(page.getByRole("button", { name: "3 avisos sin leer" })).toBeVisible();
  const antes = await estadoFixture(request);
  await page.clock.fastForward(30_000);
  await expect.poll(async () => (await estadoFixture(request)).lecturas).toBeGreaterThan(antes.lecturas);
});

test("la bandeja conserva contraste en los temas claro, oscuro y sistema", async ({ page }) => {
  await login(page);
  await page.goto("/avisos");
  const apariencia = page.getByLabel("Apariencia");
  await apariencia.selectOption("light");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(241, 243, 237)");
  await expect.poll(() => page.locator(".aviso-no-leida").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(229, 237, 242)");

  await apariencia.selectOption("dark");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(30, 32, 36)");
  await expect.poll(() => page.locator(".aviso-no-leida").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(52, 69, 84)");

  await page.emulateMedia({ colorScheme: "dark" });
  await apariencia.selectOption("system");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(30, 32, 36)");
  await expect.poll(() => page.locator(".aviso-no-leida").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(52, 69, 84)");

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(241, 243, 237)");
  await expect.poll(() => page.locator(".aviso-no-leida").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(229, 237, 242)");
});

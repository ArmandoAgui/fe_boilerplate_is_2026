import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiFixture = "http://127.0.0.1:3100";
const idAbierta = "52c3a7e4-7f3f-41fb-b908-2f85bf2572ac";
const idResuelta = "f9e40d22-b0e3-46fb-8bed-412da001d48d";
const idAjena = "9c4db782-3faf-4c35-9ad8-2833f0356732";

async function resetFixture(request: APIRequestContext) {
  await request.post(apiFixture + "/__test/reset");
}

async function login(
  page: Page,
  usuario: "residente" | "admin" | "seguridad" = "residente",
) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(usuario + "@condominio.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
}

async function estadoFixture(request: APIRequestContext) {
  return await (await request.get(apiFixture + "/__test/state")).json();
}

test.beforeEach(async ({ request }) => resetFixture(request));

test("residente lista, filtra y abre el seguimiento y sus fotos privadas", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Incidencias", exact: true }).click();
  await expect(page).toHaveURL(/\/incidencias$/);
  await expect(page.getByRole("heading", { name: "Mis incidencias" })).toBeVisible();
  await expect(page.getByText("INC-0009")).toBeVisible();
  await expect(page.getByText("INC-0003")).toBeVisible();
  await expect(page.getByText("INC-0100")).toHaveCount(0);
  await expect(
    page.locator("aside nav a[href='/incidencias']"),
  ).toHaveAttribute("aria-current", "page");

  await page.getByLabel("Estado").selectOption("RESUELTA");
  await page.getByRole("button", { name: "Aplicar filtro" }).click();
  await expect(page).toHaveURL(/estado=RESUELTA/);
  await expect(page.getByText("INC-0003")).toBeVisible();
  await expect(page.getByText("INC-0009")).toHaveCount(0);

  await page.getByRole("link", { name: "Consultar incidencia INC-0003" }).click();
  await expect(page).toHaveURL(new RegExp("/incidencias/" + idResuelta + "\\?estado=RESUELTA"));
  await expect(page.getByRole("heading", { name: /INC-0003, Limpieza en Asador/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seguimiento" })).toBeVisible();
  await expect(page.getByText("Carlos Alvarado marcó la incidencia como Resuelta.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mis incidencias" })).toHaveAttribute(
    "href",
    "/incidencias?estado=RESUELTA",
  );

  await page.goto("/incidencias/" + idAbierta);
  await expect(
    page
      .getByRole("region", { name: "Información de la incidencia" })
      .getByText("Hay una fuga debajo del lavatrastos. El piso amanece mojado.")
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Información de la incidencia" })
      .getByText("Sin asignar")
      .filter({ visible: true }),
  ).toBeVisible();
  const imagen = page.getByRole("img", { name: "Foto 1 de la incidencia" });
  await expect(imagen).toBeVisible();
  await expect(imagen).toHaveAttribute(
    "src",
    /\/api\/seguimiento\/incidencias\/52c3a7e4-7f3f-41fb-b908-2f85bf2572ac\/evidencias\/8ea0bd87-5dfb-4b26-9c38-974ce21dc34e$/,
  );
  const respuestaFoto = await page.request.get(
    "/api/seguimiento/incidencias/" + idAbierta + "/evidencias/8ea0bd87-5dfb-4b26-9c38-974ce21dc34e",
  );
  expect(respuestaFoto.status()).toBe(200);
  expect(respuestaFoto.headers()["content-type"]).toBe("image/png");
  expect(respuestaFoto.headers()["cache-control"]).toBe("private, no-store");
  const fotoAjena = await page.request.get(
    "/api/seguimiento/incidencias/" + idAjena + "/evidencias/8ea0bd87-5dfb-4b26-9c38-974ce21dc34e",
  );
  expect(fotoAjena.status()).toBe(404);

  await page.goto("/incidencias/" + idAjena);
  await expect(page.getByRole("heading", { name: "Incidencia no disponible" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/incidencias/" + idResuelta);
  await expect(page.getByRole("heading", { name: "Seguimiento" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("admin y Seguridad asignada pueden consultar detalle; Seguridad sin asignación no", async ({
  page,
}) => {
  await login(page, "seguridad");
  await page.goto("/incidencias/" + idResuelta);
  await expect(page.getByRole("heading", { name: /INC-0003, Limpieza en Asador/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  await page.goto("/incidencias/" + idAbierta);
  await expect(page.getByRole("heading", { name: "Incidencia no disponible" })).toBeVisible();

  await page.context().clearCookies();
  await login(page, "admin");
  await page.goto("/incidencias/" + idResuelta);
  await expect(page.getByRole("heading", { name: /INC-0003, Limpieza en Asador/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a incidencias" })).toHaveAttribute(
    "href",
    "/admin/incidencias",
  );
  await page.goto("/incidencias");
  await expect(page.getByText("No tienes permiso para ver esta página")).toBeVisible();
});

test("abre «Ver incidencia» desde avisos y no vuelve a marcarla si ya está leída", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/avisos?moduloOrigen=INCIDENCIAS");
  const enlace = page.getByRole("button", {
    name: "Ver incidencia: Tu incidencia fue resuelta",
  });
  await expect(enlace).toBeVisible();
  await enlace.click();
  await expect(page).toHaveURL(new RegExp("/incidencias/" + idResuelta + "$"));
  await expect(page.getByRole("heading", { name: /INC-0003, Limpieza en Asador/ })).toBeVisible();
  expect((await estadoFixture(request)).parches).toBe(1);

  await page.goBack();
  const avisoLeido = page.getByRole("button", {
    name: "Ver incidencia: Tu incidencia fue resuelta",
  });
  await expect(avisoLeido).toBeVisible();
  await expect(page.getByRole("listitem").getByText("Leída")).toBeVisible();
  await avisoLeido.click();
  await expect(page).toHaveURL(new RegExp("/incidencias/" + idResuelta + "$"));
  expect((await estadoFixture(request)).parches).toBe(1);
});

test("la campana abre el detalle resuelto de H28", async ({ page, request }) => {
  await request.post(apiFixture + "/__test/h28-first");
  await login(page);
  await page.getByRole("button", { name: /avisos sin leer/i }).click();
  const panel = page.getByRole("region", { name: "Avisos recientes" });
  const aviso = panel.getByRole("button", { name: /Tu incidencia fue resuelta/ });
  await expect(aviso).toBeVisible();
  await aviso.click();
  await expect(page).toHaveURL(new RegExp("/incidencias/" + idResuelta + "$"));
  await expect(page.getByRole("heading", { name: /INC-0003, Limpieza en Asador/ })).toBeVisible();
  expect((await estadoFixture(request)).parches).toBe(1);
});

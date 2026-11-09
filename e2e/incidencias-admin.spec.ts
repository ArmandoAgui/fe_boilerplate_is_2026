import { test, expect, type Page } from "@playwright/test";

async function iniciarSesion(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("H10: administrador filtra y consulta incidencias en escritorio y móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await iniciarSesion(page, "admin@condominio.test");
  await page.goto("/admin/incidencias");

  await expect(
    page.getByRole("heading", { name: "Incidencias", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Estado")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Filtros de incidencias" }).getByLabel("Prioridad"),
  ).toBeVisible();
  await expect(page.getByText("Ordenadas por prioridad y luego por antigüedad.")).toBeVisible();

  await page.getByLabel("Estado").selectOption("ASIGNADA");
  await expect(page).toHaveURL(/estado=ASIGNADA/);
  await expect(page.getByLabel("Estado")).toHaveValue("ASIGNADA");
  await page.getByLabel("Estado").selectOption("");
  await expect(page).not.toHaveURL(/estado=/);

  const codigo = page.getByRole("link", { name: /^Ver incidencia INC-/ }).first();
  if (await codigo.count()) {
    await codigo.click();
    await expect(page.getByRole("complementary", { name: /^Detalle de INC-/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  } else {
    await expect(
      page.getByText("No hay incidencias para los filtros elegidos"),
    ).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  if (await page.getByRole("button", { name: "← Volver al listado" }).count()) {
    await page.getByRole("button", { name: "← Volver al listado" }).click();
    await expect(page.getByRole("region", { name: "Listado de incidencias" })).toBeVisible();
  }
});

test("H10: restringe el módulo a administradores y requiere una sesión", async ({
  page,
}) => {
  await page.goto("/admin/incidencias");
  await expect(page).toHaveURL(/\/login$/);
  await iniciarSesion(page, "seguridad@condominio.test");
  await page.goto("/admin/incidencias");
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para ver esta página",
    }),
  ).toBeVisible();
});

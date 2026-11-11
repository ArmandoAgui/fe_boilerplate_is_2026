import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const api = process.env.E2E_API_URL ?? "http://localhost:3140/api/v1";
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
for (const mobile of [false, true]) {
  test(`H23/H24 ${mobile ? "móvil" : "escritorio"}: publicar, filtrar por audiencia y registrar lectura`, async ({
    page,
    request,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const titulo = `Comunicado E2E ${randomUUID().slice(0, 8)}`;
    const contenido =
      "Mantenimiento oficial\n<script>window.comunicadoInyectado=true</script>";
    const auth = await request.post(`${api}/auth/login`, {
      data: { email: "admin@condominio.test", password: "Prueba123!" },
    });
    const token = (await auth.json()).accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    const torres = (
      await (await request.get(`${api}/torres`, { headers })).json()
    ).datos;
    const torreA = torres.find(
      (t: { nombre: string }) => t.nombre === "Torre A",
    );
    const previa = await request.get(
      `${api}/comunicados/destinatarios?alcance=TORRE&destinoId=${torreA.id}`,
      { headers },
    );
    const cantidad = (await previa.json()).destinatarios;
    await login(page, "admin@condominio.test");
    await page.goto("/admin/comunicados/nuevo");
    await page.getByLabel("Título", { exact: true }).fill(titulo);
    await page.getByLabel("Contenido", { exact: true }).fill(contenido);
    await expect(page.getByText(`${contenido.length}/2000`)).toBeVisible();
    await page.getByRole("radio", { name: "Torre", exact: true }).check();
    await page.getByLabel("Destino").selectOption(torreA.id);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      `Se enviará a ${cantidad} residentes. ¿Publicar?`,
    );
    await page.getByRole("button", { name: "Confirmar publicación" }).click();
    await expect(page.getByRole("status")).toHaveText(
      `Comunicado publicado a ${cantidad} residentes`,
    );
    await page.goto("/admin/comunicados");
    const fila = page.getByRole("row").filter({ hasText: titulo });
    await expect(fila).toContainText(`Leído por 0 de ${cantidad}`);
    const listado = await request.get(
      `${api}/comunicados/administracion?tamanoPagina=50`,
      { headers },
    );
    const id = (await listado.json()).datos.find(
      (c: { titulo: string }) => c.titulo === titulo,
    ).id;
    await logout(page);
    await login(page, "residente1@condominio.test");
    await page.goto("/comunicados");
    await expect(
      page.getByRole("article").filter({ hasText: titulo }),
    ).toContainText("Sin leer");
    await page.getByRole("link", { name: titulo, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/comunicados/${id}$`));
    await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
    await expect(page.getByRole("article")).toContainText(contenido);
    expect(await page.evaluate(() => "comunicadoInyectado" in window)).toBe(
      false,
    );
    await page.reload();
    await page.getByRole("link", { name: "Volver a comunicados" }).click();
    await expect(
      page.getByRole("article").filter({ hasText: titulo }),
    ).toContainText("Leído");
    if (process.env.E2E_SCREENSHOTS_DIR) {
      await mkdir(process.env.E2E_SCREENSHOTS_DIR, { recursive: true });
      await page.screenshot({
        path: `${process.env.E2E_SCREENSHOTS_DIR}/comunicados-${mobile ? "movil" : "escritorio"}.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await logout(page);
    await login(page, "residente4@condominio.test");
    await page.goto("/comunicados");
    await expect(
      page.getByRole("link", { name: titulo, exact: true }),
    ).toHaveCount(0);
    await page.goto(`/comunicados/${id}`);
    await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);
    await logout(page);
    await login(page, "admin@condominio.test");
    await page.goto("/admin/comunicados");
    await expect(
      page.getByRole("row").filter({ hasText: titulo }),
    ).toContainText(`Leído por 1 de ${cantidad}`);
  });
}
test("H23/H24 restringe pantallas por rol", async ({ page }) => {
  await login(page, "residente1@condominio.test");
  await page.goto("/admin/comunicados/nuevo");
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para ver esta página",
    }),
  ).toBeVisible();
  await logout(page);
  await login(page, "seguridad@condominio.test");
  await page.goto("/comunicados");
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para ver esta página",
    }),
  ).toBeVisible();
});

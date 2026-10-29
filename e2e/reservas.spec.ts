import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const api = process.env.E2E_API_URL ?? "http://localhost:3100/api/v1";
const fecha = new Date(Date.now() + 86400000 - 6 * 3600000)
  .toISOString()
  .slice(0, 10);
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
  test(`H5–H8 flujo integrado ${mobile ? "móvil" : "escritorio"}: administrar, reservar, cancelar y conservar formulario en 409`, async ({
    page,
    request,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await mkdir("docs/screenshots", { recursive: true });
    const nombre = `Área E2E ${randomUUID().slice(0, 8)}`;
    const adminLogin = await request.post(`${api}/auth/login`, {
      data: { email: "admin@condominio.test", password: "Prueba123!" },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = (await adminLogin.json()).accessToken;
    let areaId: string | undefined;
    let reservaConflicto: string | undefined;
    let token: string | undefined;
    try {
      await login(page, "admin@condominio.test");
      await page.goto("/admin/areas");
      await page
        .getByRole("button", { name: "Nueva área", exact: true })
        .click();
      await page.getByLabel("Nombre", { exact: true }).fill(nombre);
      await page.getByLabel("Capacidad", { exact: true }).fill("25");
      await page
        .getByRole("button", { name: "Aplicar 06:00–22:00 a toda la semana" })
        .click();
      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Área guardada");
      const areas = await request.get(`${api}/areas`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      areaId = (await areas.json()).datos.find(
        (a: { nombre: string }) => a.nombre === nombre,
      ).id;
      if (!mobile)
        await page.screenshot({
          path: "docs/screenshots/admin-areas.png",
          fullPage: true,
        });
      await logout(page);
      await login(page, "residente1@condominio.test");
      await page.goto("/areas");
      await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
      await page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: nombre }) })
        .getByRole("link", { name: /Consultar disponibilidad/ })
        .click();
      await page.getByLabel("Fecha", { exact: true }).fill(fecha);
      await expect(page).toHaveURL(new RegExp(`fecha=${fecha}`));
      await page
        .getByRole("link", { name: "Reservar 12:00, disponible" })
        .click();
      await expect(
        page.getByLabel("Hora de inicio", { exact: true }),
      ).toHaveValue("12:00");
      await page.getByLabel("Asistentes", { exact: true }).fill("3");
      await page.getByRole("button", { name: "Confirmar reserva" }).click();
      await expect(page).toHaveURL(/\/reservas\?confirmada=RES-/);
      await expect(page.getByText(/Reserva confirmada · RES-/)).toBeVisible();
      const card = page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: nombre }) });
      await expect(card).toContainText("A-101");
      await expect(card).toContainText("Confirmada");
      await page.screenshot({
        path: `docs/screenshots/reserva-${mobile ? "movil" : "escritorio"}.png`,
        fullPage: true,
      });
      await card.getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText(
        "Esta acción no se puede deshacer",
      );
      await page
        .getByRole("button", { name: "Cancelar reserva", exact: true })
        .click();
      await expect(card).toContainText("Cancelada");
      await expect(
        page.getByText("Reserva cancelada", { exact: true }),
      ).toBeVisible();
      await page.goto(`/areas/${areaId}/disponibilidad?fecha=${fecha}`);
      await expect(
        page.getByRole("link", { name: "Reservar 12:00, disponible" }),
      ).toBeVisible();
      await page.screenshot({
        path: `docs/screenshots/disponibilidad-${mobile ? "movil" : "escritorio"}.png`,
        fullPage: true,
      });
      await page
        .getByRole("link", { name: "Reservar 12:00, disponible" })
        .click();
      const auth = await request.post(`${api}/auth/login`, {
        data: { email: "residente1@condominio.test", password: "Prueba123!" },
      });
      token = (await auth.json()).accessToken;
      const units = await request.get(`${api}/unidades/mias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const unidadId = (await units.json()).datos[0].id;
      const choque = await request.post(`${api}/reservas`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          areaId,
          unidadId,
          inicio: `${fecha}T12:00:00-06:00`,
          duracionHoras: 1,
          asistentes: 1,
        },
      });
      expect(choque.status()).toBe(201);
      reservaConflicto = (await choque.json()).id;
      await page.getByRole("button", { name: "Confirmar reserva" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "Ese horario ya fue reservado. Elija otro.",
      );
      await expect(
        page.getByLabel("Hora de inicio", { exact: true }),
      ).toHaveValue("12:00");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
    } finally {
      if (reservaConflicto && token)
        await request.patch(`${api}/reservas/${reservaConflicto}/cancelacion`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      if (areaId)
        await request.patch(`${api}/areas/${areaId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { activa: false },
        });
    }
  });
}
test("sesión, permisos y navegación por rol", async ({ page, context }) => {
  await page.goto("/areas");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "seguridad@condominio.test");
  await expect(page.getByRole("navigation")).not.toContainText("Mis reservas");
  await page.goto("/admin/areas");
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para ver esta página",
    }),
  ).toBeVisible();
  await context.addCookies([
    {
      name: "session",
      value: "sesion-invalida",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/areas");
  await expect(page).toHaveURL(/\/login\?expired=1/);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});

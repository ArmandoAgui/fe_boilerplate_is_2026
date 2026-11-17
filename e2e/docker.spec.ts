import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

const root = process.env.E2E_DOCKER_ROOT;
test.skip(!root, "Requiere el stack aislado creado por smoke-docker.py --keep");
test.use({ ignoreHTTPSErrors: true }); // Local CA only; the Python smoke validates its chain.
if (root && !root.startsWith("/tmp/sonnet5-smoke-"))
  throw new Error("Solo se aceptan fixtures Docker locales");
const base = process.env.E2E_BASE_URL ?? "";
if (
  root &&
  (!base.startsWith("https://") || new URL(base).hostname !== "localhost")
)
  throw new Error("La prueba Docker requiere HTTPS en localhost");
async function configuration() {
  const lines = (await readFile(`${root}/platform.env`, "utf8"))
    .split("\n")
    .filter((l) => l.includes("="));
  return Object.fromEntries(
    lines.map((l) => {
      const at = l.indexOf("=");
      return [l.slice(0, at), l.slice(at + 1)];
    }),
  );
}

test("Docker: login con cookie segura y Server Action detrás de HTTPS", async ({
  page,
  context,
}) => {
  const config = await configuration();
  const password = (
    await readFile(`${root}/secrets/admin_password`, "utf8")
  ).trim();
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(config.ADMIN_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  const cookie = (await context.cookies()).find((c) => c.name === "session");
  expect(cookie).toMatchObject({
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
  await page.goto("/admin/comunicados/nuevo");
  await page
    .getByLabel("Título", { exact: true })
    .fill("Comunicado Docker " + randomUUID().slice(0, 8));
  await page
    .getByLabel("Contenido", { exact: true })
    .fill("Publicación desde una Server Action a través de Caddy y HTTPS.");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar publicación" }).click();
  await expect(page.getByRole("status")).toContainText("Comunicado publicado");
});

test("Docker: foto restaurada privada y navegación de residente en móvil", async ({
  page,
  browser,
}) => {
  const snapshot = JSON.parse(await readFile(`${root}/snapshot.json`, "utf8"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("residente@smoke.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("PruebaDocker123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(`/incidencias/${snapshot.incidenciaId}`);
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  const path = `/api/incidencias/${snapshot.incidenciaId}/evidencias/${snapshot.fotoId}`;
  const foto = await page.request.get(path);
  expect(foto.status()).toBe(200);
  expect(
    createHash("sha256")
      .update(await foto.body())
      .digest("hex"),
  ).toBe(snapshot.sha256);
  const anonymous = await browser.newContext({
    baseURL: base,
    ignoreHTTPSErrors: true,
  });
  expect((await anonymous.request.get(path)).status()).toBe(401);
  await anonymous.close();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

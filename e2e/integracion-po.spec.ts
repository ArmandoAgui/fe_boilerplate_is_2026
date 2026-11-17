import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
const api = process.env.E2E_API_URL ?? "http://127.0.0.1:3112/api/v1";
if (!["localhost", "127.0.0.1"].includes(new URL(api).hostname))
  throw new Error("Esta suite necesita una API local de pruebas");
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}
async function logout(page: Page) {
  await page.getByRole("button", {name:"Cerrar sesión"}).click();
  await expect(page).toHaveURL(/\/login$/);
}
async function auth(request: APIRequestContext, rol: string) {
  const r = await request.post(`${api}/auth/login`, {
    data: { email: `${rol}@condominio.test`, password: "Prueba123!" },
  });
  expect(r.ok()).toBe(true);
  return { Authorization: `Bearer ${(await r.json()).accessToken}` };
}
test("PO: administración consulta indicadores, descarga PDF y valida períodos", async ({
  page,
}) => {
  await login(page, "admin@condominio.test");
  await page.goto("/admin/reportes");
  await expect(
    page.getByRole("heading", { name: "Indicadores del condominio" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("link", { name: "Compartir reporte" }).click();
  await expect(
    page.getByRole("heading", { name: "Compartir reporte", exact: true }),
  ).toBeVisible();
  const descargar = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const pdf = await descargar;
  expect(pdf.suggestedFilename()).toMatch(
    /^reporte_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  await page.goto("/admin/reportes?desde=2026-12-01&hasta=2026-01-01");
  await expect(
    page.getByRole("alert").filter({ hasText: "Desde" }),
  ).toContainText("Desde no puede ser posterior a Hasta");
  await page.goto("/admin/residentes");
  await expect(
    page.getByRole("heading", { name: "Residentes y unidades" }),
  ).toBeVisible();
  await page.goto("/admin/cuotas");
  await expect(
    page.getByRole("heading", { name: "Administrar cuotas" }),
  ).toBeVisible();
});
test("PO: seguridad entrega a un residente y la entrega aparece en su historial", async ({
  page,
  request,
}) => {
  const headers = await auth(request, "seguridad");
  const catalogo = await request.get(`${api}/unidades?buscar=A-101`, {
    headers,
  });
  const unidad = (await catalogo.json()).datos.find(
    (u: { codigo: string }) => u.codigo === "A-101",
  );
  const nuevo = await request.post(`${api}/paquetes`, {
    headers,
    data: {
      unidadId: unidad.id,
      empresa: "PO Playwright " + randomUUID().slice(0, 6),
    },
  });
  expect(nuevo.status()).toBe(201);
  const paquete = await nuevo.json();
  await login(page, "seguridad@condominio.test");
  await page.goto(`/seguridad/paquetes?buscar=${paquete.codigo}`);
  await page.getByRole("button", { name: "Entregar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Solo residentes activos");
  const select = dialog.getByLabel("Residente que retira");
  await expect(select.locator("option")).toHaveCount(3);
  await select.selectOption({
    label: "residente1 · residente1@condominio.test",
  });
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByText("Entrega registrada", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(paquete.codigo, { exact: true })).toHaveCount(0);
  await logout(page);
  await login(page, "residente1@condominio.test");
  await page.goto("/paquetes");
  await page.getByRole("tab", { name: "Historial" }).click();
  await expect(page.getByText(paquete.codigo, { exact: true })).toBeVisible();
});
test("PO: una visita en recepción espera confirmación real del residente", async ({
  page,
  request,
}) => {
  const headers = await auth(request, "seguridad");
  const lista = await request.get(`${api}/unidades?buscar=A-101`, { headers });
  const unidad = (await lista.json()).datos.find(
    (u: { codigo: string }) => u.codigo === "A-101",
  );
  const vecinos = await request.get(
    `${api}/administracion/unidades/${unidad.id}/residentes`,
    { headers },
  );
  const residente = (await vecinos.json()).datos.find(
    (u: { nombre: string }) => u.nombre === "residente1",
  );
  const nombre = "Visitante " + randomUUID().slice(0, 8);
  const solicitud = await request.post(
    `${api}/visitas/autorizaciones/solicitudes`,
    {
      headers,
      data: {
        unidadId: unidad.id,
        residenteId: residente.id,
        visitanteNombre: nombre,
      },
    },
  );
  expect(solicitud.status()).toBe(201);
  await login(page, "residente1@condominio.test");
  await page.goto("/visitas");
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toContainText("Pendiente de confirmación");
  await fila.getByRole("button", { name: "Autorizar ingreso" }).click();
  await expect(fila).toContainText("Vigente");
  await logout(page);
  await login(page, "seguridad@condominio.test");
  await page.goto("/seguridad/accesos");
  await page.getByLabel("Nombre o documento del visitante").fill(nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Registrar entrada de ${nombre}` })
    .click();
  await expect(
    page.getByText(`Entrada registrada · ${nombre}`, { exact: true }),
  ).toBeVisible();
});
test("PO: navegación de residente y directorio para seguridad en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "residente1@condominio.test");
  await page.goto("/incidencias");
  await expect(
    page.getByRole("heading", { name: "Mis incidencias" }),
  ).toBeVisible();
  await page.goto("/comunicados");
  await expect(
    page.getByRole("heading", { name: "Comunicados", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/reportes");
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para ver esta página",
    }),
  ).toBeVisible();
  await logout(page);
  await login(page, "seguridad@condominio.test");
  await page.goto("/directorio");
  await expect(
    page.getByRole("heading", { name: "Directorio", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("PO: administración atiende y resuelve; el residente ve historial privado", async ({
  page,
  request,
}) => {
  const residente = await auth(request, "residente1"),
    admin = await auth(request, "admin");
  const unidades = await request.get(`${api}/unidades/mias`, {
    headers: residente,
  });
  const unidad = (await unidades.json()).datos[0];
  const creado = await request.post(`${api}/incidencias`, {
    headers: residente,
    multipart: {
      lugarTipo: "UNIDAD",
      unidadId: unidad.id,
      categoria: "OTRO",
      descripcion: "Reporte privado de prueba " + randomUUID(),
    },
  });
  expect(creado.status()).toBe(201);
  const id = (await creado.json()).id;
  const me = await request.get(`${api}/auth/me`, { headers: admin });
  const actor = await me.json();
  const asignar = await request.patch(`${api}/incidencias/${id}/asignacion`, {
    headers: admin,
    data: { responsableId: actor.id, prioridad: "MEDIA" },
  });
  expect(asignar.status()).toBe(200);
  await login(page, "admin@condominio.test");
  await page.goto(`/admin/incidencias?id=${id}`);
  await page.getByRole("button", { name: "Iniciar atención" }).click();
  await page.getByRole("button", { name: "Marcar como resuelta" }).waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Marcar como resuelta" }).click();
  await expect(
    page.getByRole("button", { name: "Marcar como resuelta" }),
  ).toHaveCount(0);
  await logout(page);
  await login(page, "residente1@condominio.test");
  await page.goto(`/incidencias/${id}`);
  await expect(page.getByRole("article").getByText(/^Resuelta · /)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
});

import { crc32, deflateSync } from "node:zlib";
import { test, expect, type Page } from "@playwright/test";

const ruta = "/incidencias/nueva";
const tamanoFotoGrande = 5 * 1024 * 1024 - 1;

async function login(page: Page, usuario: string) {
  await page.goto("/login");
  await page
    .getByLabel("Correo electrónico")
    .fill(`${usuario}@condominio.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
}

async function abrirReporte(page: Page) {
  const enlace = page.getByRole("link", { name: "Incidencias", exact: true });
  await enlace.click();
  await expect(page).toHaveURL(ruta, { timeout: 20000 });
  await expect(enlace).toHaveAttribute("aria-current", "page");
}

async function confirmar(page: Page, timeout = 20000) {
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  const resultado = page
    .getByRole("status")
    .filter({ hasText: "Incidencia registrada" });
  await expect(resultado).toContainText(/INC-\d+/, { timeout });
  await expect(resultado).toContainText("Abierta");
}

function pngGrande() {
  function segmento(tipo: string, datos: Buffer) {
    const bloque = Buffer.alloc(datos.length + 12);
    bloque.writeUInt32BE(datos.length, 0);
    bloque.write(tipo, 4, 4, "ascii");
    datos.copy(bloque, 8);
    bloque.writeUInt32BE(crc32(bloque.subarray(4, -4)), bloque.length - 4);
    return bloque;
  }
  const ancho = 1300;
  const alto = 1330;
  const encabezado = Buffer.alloc(13);
  encabezado.writeUInt32BE(ancho, 0);
  encabezado.writeUInt32BE(alto, 4);
  encabezado[8] = 8;
  encabezado[9] = 2;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    segmento("IHDR", encabezado),
    segmento(
      "IDAT",
      deflateSync(Buffer.alloc(alto * (ancho * 3 + 1)), { level: 0 }),
    ),
    segmento("IEND", Buffer.alloc(0)),
  ]);
}

async function jpegGrande(page: Page) {
  const base64 = await page.evaluate(
    () =>
      document.createElement("canvas").toDataURL("image/jpeg").split(",")[1],
  );
  const jpeg = Buffer.from(base64, "base64");
  // Los segmentos de comentario aumentan el peso sin invalidar el JPEG.
  const extra = Buffer.alloc(tamanoFotoGrande - jpeg.length);
  for (let pos = 0; pos < extra.length;) {
    const pendiente = extra.length - pos;
    const tamano =
      pendiente > 65537 && pendiente < 65541
        ? pendiente - 4
        : Math.min(pendiente, 65537);
    extra.writeUInt16BE(0xfffe, pos);
    extra.writeUInt16BE(tamano - 2, pos + 2);
    pos += tamano;
  }
  return Buffer.concat([jpeg.subarray(0, 2), extra, jpeg.subarray(2)]);
}

test("H9 permite reportar desde una unidad sin fotos", async ({ page }) => {
  await login(page, "residente1");
  await abrirReporte(page);
  await expect(page.getByRole("radio", { name: "Mi unidad" })).toBeChecked();
  await expect(
    page.getByRole("option", { name: "A-101", exact: true }),
  ).toHaveJSProperty("selected", true);
  await page.getByLabel("Categoría").selectOption("FUGA");
  await page
    .getByLabel("Descripción")
    .fill("Hay una fuga debajo del lavatrastos.");
  await confirmar(page);
  await page.getByRole("button", { name: "Reportar otra incidencia" }).click();
  await expect(page.getByLabel("Descripción")).toHaveValue("");
});

test("H9 en móvil permite reportar un área común con tres fotos cercanas a 15 MiB", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "residente1");
  await abrirReporte(page);
  await page.getByRole("radio", { name: "Área común" }).check();
  await page
    .getByRole("combobox", { name: "Área común" })
    .selectOption({ label: "Gimnasio" });
  await page.getByLabel("Categoría").selectOption("ELECTRICIDAD");
  await page
    .getByLabel("Descripción")
    .fill("La luz del gimnasio dejó de funcionar.");

  const png = pngGrande();
  await page.getByLabel("Agregar foto").setInputFiles([
    { name: "entrada.png", mimeType: "image/png", buffer: png },
    {
      name: "lampara.jpg",
      mimeType: "image/jpeg",
      buffer: await jpegGrande(page),
    },
    { name: "interruptor.png", mimeType: "image/png", buffer: png },
  ]);
  for (const nombre of ["entrada.png", "lampara.jpg", "interruptor.png"]) {
    await expect(page.getByRole("img", { name: nombre })).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await confirmar(page, 55_000);
});

test("H9 requiere sesión y rol de residente", async ({ page }) => {
  await page.goto(ruta);
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "admin");
  await expect(
    page.getByRole("link", { name: "Incidencias", exact: true }),
  ).toHaveCount(0);
  await page.goto(ruta);
  await expect(
    page.getByText("No tienes permiso para ver esta página"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar reporte" }),
  ).toHaveCount(0);
});

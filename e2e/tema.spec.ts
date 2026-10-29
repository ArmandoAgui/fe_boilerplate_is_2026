import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "residente1@condominio.test") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function comprobarContraste(page: Page) {
  const resultados = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    function luminancia(hex: string) {
      const rgb = hex
        .trim()
        .replace("#", "")
        .match(/../g)!
        .map((x) => parseInt(x, 16) / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    const pares = [
      ["--foreground", "--background"],
      ["--foreground", "--surface"],
      ["--muted", "--background"],
      ["--muted", "--surface"],
      ["--accent-contrast", "--accent"],
      ["--accent-contrast", "--accent-hover"],
      ["--success-text", "--success-soft"],
      ["--occupied-text", "--occupied"],
      ["--danger", "--surface"],
    ];
    return pares.map(([texto, fondo]) => {
      const a = luminancia(style.getPropertyValue(texto));
      const b = luminancia(style.getPropertyValue(fondo));
      return {
        texto,
        fondo,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
  });
  for (const r of resultados)
    expect(r.ratio, `${r.texto} sobre ${r.fondo}`).toBeGreaterThanOrEqual(4.5);
}

test("el tema elegido persiste al recargar, navegar y cerrar sesión; contraste de texto en ambos modos", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  const picker = page.getByRole("combobox", { name: "Apariencia" });
  for (const theme of ["light", "dark"]) {
    await picker.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await comprobarContraste(page);
    await page.reload();
    await expect(picker).toHaveValue(theme);
    const html = await (await page.request.get("/login")).text();
    expect(html).toContain(`data-theme="${theme}"`);
  }
  await login(page);
  await expect(picker).toHaveValue("dark");
  for (const path of ["/areas", "/reservas/nueva", "/reservas"]) {
    await page.goto(path);
    await expect(picker).toHaveValue("dark");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(24, 35, 30)",
    );
  }
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(picker).toHaveValue("dark");
  await login(page, "admin@condominio.test");
  await page.goto("/admin/areas");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Nueva área", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expect(picker).toHaveValue("dark");
});

test("Sistema sigue la preferencia del dispositivo; selector usable con teclado y sin desbordamiento móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/login");
  const picker = page.getByRole("combobox", { name: "Apariencia" });
  await expect(picker).toHaveValue("system");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(24, 35, 30)",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(241, 243, 237)",
  );
  await picker.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveValue("dark");
  await expect(picker).toBeFocused();
  expect(await picker.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  await login(page);
  await page.goto("/areas");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await comprobarContraste(page);
});

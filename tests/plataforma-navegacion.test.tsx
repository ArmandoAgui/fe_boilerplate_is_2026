import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { EstructuraPlataforma } from "@/components/plataforma/estructura";
import type { Rol } from "@/lib/reservas";

const route = vi.hoisted(() => ({ pathname: "/avisos" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/components/theme-provider", () => ({
  ThemePicker: () => <select aria-label="Apariencia"><option>Claro</option></select>,
}));
vi.mock("@/components/notificaciones/campana", () => ({
  CampanaAvisos: () => <button aria-label="Avisos sin leer">Avisos</button>,
}));

describe("Navegación compartida de la plataforma", () => {
  it.each<[string, Rol]>([
    ["/avisos", "RESIDENTE"],
    ["/incidencias", "RESIDENTE"],
    ["/incidencias/nueva", "RESIDENTE"],
    ["/incidencias/ejemplo", "RESIDENTE"],
    ["/admin/incidencias", "ADMINISTRADOR"],
    ["/seguridad/paquetes", "SEGURIDAD"],
  ])("%s usa la cabecera común para %s", (pathname, rol) => {
    route.pathname = pathname;
    const { container } = render(
      <EstructuraPlataforma usuario={{ id: "qa", email: "qa@example.test", nombre: "Usuario QA", rol }}>
        <h1>Contenido de la página</h1>
      </EstructuraPlataforma>,
    );
    const header = screen.getByRole("banner");
    const nav = within(header).getByRole("navigation", { name: "Principal" });
    expect(nav).toHaveClass("default-navigation");
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(within(header).getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    expect(within(header).getByLabelText("Apariencia")).toBeVisible();
    expect(within(screen.getByRole("main")).getByRole("heading")).toHaveTextContent("Contenido de la página");
    if (rol === "RESIDENTE") {
      expect(within(header).getByRole("button", { name: "Avisos sin leer" })).toBeVisible();
      expect(within(nav).queryByRole("link", { name: "Generar cuotas" })).toBeNull();
      const activeHref = pathname.startsWith("/incidencias") ? "/incidencias" : "/avisos";
      expect(nav.querySelector(`[href="${activeHref}"]`)).toHaveAttribute("aria-current", "page");
    } else {
      expect(within(header).queryByRole("button", { name: "Avisos sin leer" })).toBeNull();
    }
  });
});

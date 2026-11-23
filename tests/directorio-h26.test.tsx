import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuscadorDirectorio } from "@/components/directorio/buscador";
import Page from "@/app/(plataforma)/directorio/page";
import { buscarDirectorio, obtenerFicha } from "@/app/actions/directorio";
import { usuarioActual } from "@/lib/api";

vi.mock("@/app/actions/directorio", () => ({
  buscarDirectorio: vi.fn(),
  obtenerFicha: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ usuarioActual: vi.fn() }));

const ana = { id: "1", nombre: "Ana Pérez", telefono: "7000-0000", correo: null, unidad: null };
const pagina = (datos: (typeof ana)[]) => ({ datos, total: datos.length, pagina: 1, tamanoPagina: 20 });
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Sesion = Awaited<ReturnType<typeof usuarioActual>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("H26 ruta /directorio", () => {
  it("un residente ve el buscador", async () => {
    vi.mocked(usuarioActual).mockResolvedValue({ id: "u", email: "r@x.test", nombre: "Rosa", rol: "RESIDENTE" } as Sesion);
    render(await Page());
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
  });
  it("otro rol ve Sin permiso y no el buscador", async () => {
    vi.mocked(usuarioActual).mockResolvedValue({ id: "a", email: "a@x.test", nombre: "Admin", rol: "ADMINISTRADOR" } as Sesion);
    render(await Page());
    expect(screen.getByText("No tienes permiso para ver esta página")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar")).not.toBeInTheDocument();
  });
});

describe("H26 búsqueda en el directorio", () => {
  it("con menos de 3 caracteres avisa y no consulta", async () => {
    render(<BuscadorDirectorio />);
    await userEvent.setup().type(screen.getByLabelText("Buscar"), "an");
    expect(screen.getByText("Escriba al menos 3 caracteres")).toBeInTheDocument();
    await esperar(450);
    expect(buscarDirectorio).not.toHaveBeenCalled();
  });
  it("consulta tras 300 ms y muestra solo los datos autorizados", async () => {
    vi.mocked(buscarDirectorio).mockResolvedValue({ data: pagina([ana]) });
    render(<BuscadorDirectorio />);
    await userEvent.setup().type(screen.getByLabelText("Buscar"), "ana");
    expect(buscarDirectorio).not.toHaveBeenCalled();
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(buscarDirectorio).toHaveBeenCalledTimes(1);
    expect(buscarDirectorio).toHaveBeenCalledWith("ana", 1);
    expect(screen.getByText("Teléfono: 7000-0000")).toBeInTheDocument();
    expect(screen.queryByText(/Correo:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unidad:/)).not.toBeInTheDocument();
  });
  it("sin coincidencias muestra el mensaje con el texto buscado", async () => {
    vi.mocked(buscarDirectorio).mockResolvedValue({ data: pagina([]) });
    render(<BuscadorDirectorio />);
    await userEvent.setup().type(screen.getByLabelText("Buscar"), "zzz");
    expect(await screen.findByText("Sin resultados para «zzz»")).toBeInTheDocument();
  });
  it("al elegir una tarjeta consulta la ficha por ID y la muestra", async () => {
    vi.mocked(buscarDirectorio).mockResolvedValue({ data: pagina([ana]) });
    vi.mocked(obtenerFicha).mockResolvedValue({ data: { ...ana, correo: "ana@condominio.test" } });
    render(<BuscadorDirectorio />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Buscar"), "ana");
    await user.click(await screen.findByRole("button", { name: /Ana Pérez/ }));
    expect(obtenerFicha).toHaveBeenCalledWith("1");
    expect(await screen.findByRole("heading", { name: "Ana Pérez" })).toBeInTheDocument();
    expect(screen.getAllByText("Correo: ana@condominio.test")).toHaveLength(1);
  });
  it("si el perfil quedó oculto muestra el error y ningún dato", async () => {
    vi.mocked(buscarDirectorio).mockResolvedValue({ data: pagina([ana]) });
    vi.mocked(obtenerFicha).mockResolvedValue({ error: "Perfil inexistente u oculto" });
    render(<BuscadorDirectorio />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Buscar"), "ana");
    await user.click(await screen.findByRole("button", { name: /Ana Pérez/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Perfil inexistente u oculto");
    expect(screen.queryByRole("heading", { name: "Ana Pérez" })).not.toBeInTheDocument();
  });
});

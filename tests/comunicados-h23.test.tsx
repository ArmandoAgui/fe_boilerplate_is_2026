import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuevoComunicado } from "@/components/comunicados/nuevo-comunicado";
import { erroresComunicado } from "@/lib/comunicados";
import { previaComunicado, publicarComunicado } from "@/app/actions/comunicados";
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/comunicados", () => ({ previaComunicado: vi.fn(), publicarComunicado: vi.fn() }));
const torres = [{ id: "t1", nombre: "Torre A", secciones: [{ id: "s1", nombre: "Norte" }] }, { id: "t2", nombre: "Torre B", secciones: [{ id: "s2", nombre: "Norte" }] }];
beforeEach(() => { vi.clearAllMocks(); vi.mocked(previaComunicado).mockResolvedValue({ destinatarios: 2 }); vi.mocked(publicarComunicado).mockResolvedValue({ destinatarios: 2 }); });
async function llenar() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Título"), "Aviso oficial");
  await user.type(screen.getByLabelText("Contenido"), "Mañana habrá mantenimiento");
  return user;
}
describe("H23 publicación segmentada", () => {
  it("comienza en Todos, muestra contador y evita publicar vacío", () => {
    render(<NuevoComunicado torres={torres} />);
    expect(screen.getByRole("radio", { name: "Todos" })).toBeChecked();
    expect(screen.getByText("0/2000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
    expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();
  });
  it("cambia el destino y distingue secciones homónimas por torre", async () => {
    render(<NuevoComunicado torres={torres} />);
    const user = await llenar();
    await user.click(screen.getByRole("radio", { name: "Torre" }));
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Destino"), "t1");
    await user.click(screen.getByRole("radio", { name: "Sección" }));
    expect(screen.getByLabelText("Destino")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Torre A · Norte" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Torre B · Norte" })).toBeInTheDocument();
  });
  it("consulta la cantidad en el servidor y exige confirmar antes de publicar", async () => {
    render(<NuevoComunicado torres={torres} />);
    const user = await llenar();
    await user.click(screen.getByRole("radio", { name: "Torre" }));
    await user.selectOptions(screen.getByLabelText("Destino"), "t1");
    await user.click(screen.getByRole("button", { name: "Publicar" }));
    expect(await screen.findByRole("heading", { name: "Se enviará a 2 residentes. ¿Publicar?" })).toBeInTheDocument();
    expect(previaComunicado).toHaveBeenCalledWith("TORRE", "t1");
    expect(publicarComunicado).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar publicación" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Comunicado publicado a 2 residentes"));
    expect(publicarComunicado).toHaveBeenCalledWith({ titulo: "Aviso oficial", contenido: "Mañana habrá mantenimiento", alcance: "TORRE", destinoId: "t1" });
    expect(screen.getByLabelText("Título")).toHaveValue("");
  });
  it("conserva el formulario y el diálogo al fallar la publicación", async () => {
    vi.mocked(publicarComunicado).mockResolvedValue({ error: "Destino inexistente" });
    render(<NuevoComunicado torres={torres} />);
    const user = await llenar();
    await user.click(screen.getByRole("button", { name: "Publicar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar publicación" }));
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Destino inexistente");
    expect(screen.getByLabelText("Título")).toHaveValue("Aviso oficial");
    expect(screen.getByRole("status")).not.toHaveTextContent("Comunicado publicado");
  });
  it("un fallo de la consulta previa no permite confirmar publicación", async () => {
    vi.mocked(previaComunicado).mockResolvedValue({ error: "No se pudo consultar" });
    render(<NuevoComunicado torres={torres} />);
    const user = await llenar(); await user.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(screen.getAllByRole("alert")[0]).toHaveTextContent("No se pudo consultar"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(publicarComunicado).not.toHaveBeenCalled();
  });
  it("rechaza texto vacío tras recortar y límites excedidos", () => {
    expect(erroresComunicado({ titulo: "    ", contenido: "  ", alcance: "TODOS" })).toMatchObject({ titulo: expect.any(String), contenido: expect.any(String) });
    expect(erroresComunicado({ titulo: "x".repeat(101), contenido: "x".repeat(2001), alcance: "TORRE" }).destino).toBeTruthy();
  });
});

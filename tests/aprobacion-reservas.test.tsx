import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AprobarReservas } from "@/components/reservas/aprobar-reservas";
import { MisReservas } from "@/components/reservas/mis-reservas";
import { aprobarReserva } from "@/app/actions/reservas";
import { Navegacion } from "@/components/reservas/ui";
import type { ListaReservas } from "@/lib/reservas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/reservas", () => ({
  aprobarReserva: vi.fn(),
  cancelarReserva: vi.fn(),
}));
const lista: ListaReservas = {
  datos: [
    {
      id: "r1",
      codigo: "RES-000001",
      areaId: "a1",
      areaNombre: "Salón",
      residenteNombre: "Ana",
      inicio: "2099-01-02T18:00:00Z",
      fin: "2099-01-02T19:00:00Z",
      asistentes: 4,
      estado: "PENDIENTE",
    },
  ],
  total: 1,
  pagina: 1,
  tamanoPagina: 20,
};
beforeEach(() => vi.clearAllMocks());
describe("Aprobación administrativa de reservas", () => {
  it("el residente ve pendiente y no recibe una confirmación automática", () => {
    render(<MisReservas lista={lista} solicitada="RES-000001" />);
    expect(screen.getByText("Pendiente de aprobación")).toBeInTheDocument();
    expect(screen.getByText(/Solicitud enviada/)).toHaveTextContent(
      /solo cuando el administrador/,
    );
    expect(screen.queryByText("Confirmada")).not.toBeInTheDocument();
  });
  it("requiere confirmación, aprueba y retira la solicitud de la lista", async () => {
    vi.mocked(aprobarReserva).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<AprobarReservas lista={lista} />);
    expect(screen.getByText("Residente: Ana")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(aprobarReserva).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Aprobar reserva" }));
    await waitFor(() =>
      expect(
        screen.getByText("Reserva RES-000001 aprobada"),
      ).toBeInTheDocument(),
    );
    expect(aprobarReserva).toHaveBeenCalledWith("r1");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
  });
  it("conserva la solicitud y muestra el conflicto cuando otro administrador ocupa el horario", async () => {
    vi.mocked(aprobarReserva).mockResolvedValue({
      error: "Ese horario ya fue reservado. Elija otro.",
      status: 409,
    });
    const user = userEvent.setup();
    render(<AprobarReservas lista={lista} />);
    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    await user.click(screen.getByRole("button", { name: "Aprobar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese horario ya fue reservado",
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });
  it("el acceso a aprobaciones aparece solo en el menú del administrador", () => {
    const { rerender } = render(<Navegacion rol="ADMINISTRADOR" />);
    expect(
      screen.getByRole("link", { name: "Aprobar reservas" }),
    ).toHaveAttribute("href", "/admin/reservas");
    rerender(<Navegacion rol="RESIDENTE" />);
    expect(
      screen.queryByRole("link", { name: "Aprobar reservas" }),
    ).not.toBeInTheDocument();
  });
});

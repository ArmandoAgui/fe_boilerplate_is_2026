import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AprobarReservas } from "@/components/reservas/aprobar-reservas";
import { MisReservas } from "@/components/reservas/mis-reservas";
import { rechazarReserva, eliminarReserva } from "@/app/actions/reservas";
import {
  puedeEliminar,
  puedeCancelar,
  type ListaReservas,
  type Reserva,
} from "@/lib/reservas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/reservas", () => ({
  aprobarReserva: vi.fn(),
  rechazarReserva: vi.fn(),
  cancelarReserva: vi.fn(),
  eliminarReserva: vi.fn(),
}));
const reserva: Reserva = {
  id: "r1",
  codigo: "RES-000001",
  areaId: "a1",
  areaNombre: "Salón",
  residenteNombre: "Ana",
  inicio: "2099-01-02T18:00:00Z",
  fin: "2099-01-02T19:00:00Z",
  asistentes: 2,
  estado: "PENDIENTE",
};
const lista = (r: Reserva): ListaReservas => ({
  datos: [r],
  total: 1,
  pagina: 1,
  tamanoPagina: 20,
});
beforeEach(() => vi.clearAllMocks());

describe("H6/H7: rechazo y eliminación del listado", () => {
  it("exige motivo, confirma el rechazo y retira la solicitud", async () => {
    vi.mocked(rechazarReserva).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<AprobarReservas lista={lista(reserva)} />);
    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(rechazarReserva).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Rechazar solicitud" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("entre 3 y 500");
    expect(rechazarReserva).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Motivo del rechazo"),
      "  Mantenimiento del área  ",
    );
    await user.click(
      screen.getByRole("button", { name: "Rechazar solicitud" }),
    );
    await waitFor(() =>
      expect(rechazarReserva).toHaveBeenCalledWith(
        "r1",
        "Mantenimiento del área",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("rechazada");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("conserva motivo y solicitud cuando el rechazo falla", async () => {
    vi.mocked(rechazarReserva).mockResolvedValue({
      error: "La solicitud ya fue aprobada",
      status: 409,
    });
    const user = userEvent.setup();
    render(<AprobarReservas lista={lista(reserva)} />);
    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    await user.type(
      screen.getByLabelText("Motivo del rechazo"),
      "Mantenimiento",
    );
    await user.click(
      screen.getByRole("button", { name: "Rechazar solicitud" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ya fue aprobada",
    );
    expect(screen.getByLabelText("Motivo del rechazo")).toHaveValue(
      "Mantenimiento",
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
  it("muestra rechazo y motivo; confirma antes de eliminar del listado", async () => {
    vi.mocked(eliminarReserva).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <MisReservas
        lista={lista({
          ...reserva,
          estado: "RECHAZADA",
          motivoRechazo: "Mantenimiento",
        })}
      />,
    );
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(
      screen.getByText(/Motivo del rechazo: Mantenimiento/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Eliminar del listado" }),
    );
    expect(eliminarReserva).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Confirmar eliminación" }),
    );
    expect(
      await screen.findByText(/Reserva eliminada de tu listado/),
    ).toBeInTheDocument();
    expect(eliminarReserva).toHaveBeenCalledWith("r1");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("conserva la reserva si falla la eliminación", async () => {
    vi.mocked(eliminarReserva).mockResolvedValue({
      error: "No se pudo guardar",
    });
    const user = userEvent.setup();
    render(<MisReservas lista={lista({ ...reserva, estado: "CANCELADA" })} />);
    await user.click(
      screen.getByRole("button", { name: "Eliminar del listado" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar eliminación" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo guardar",
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
  it("explica por qué una reserva próxima no se puede cancelar ni eliminar", () => {
    const inicio = new Date(Date.now() + 3600000).toISOString();
    const fin = new Date(Date.now() + 7200000).toISOString();
    render(
      <MisReservas
        lista={lista({ ...reserva, estado: "CONFIRMADA", inicio, fin })}
      />,
    );
    expect(screen.getByText(/Ya no puedes cancelar/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Eliminar del listado" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
  });
  it("vuelve a la página anterior al eliminar su último registro", async () => {
    vi.mocked(eliminarReserva).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <MisReservas
        lista={{
          ...lista({ ...reserva, estado: "CANCELADA" }),
          pagina: 2,
          total: 21,
        }}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Eliminar del listado" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar eliminación" }),
    );
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("?pagina=1"),
    );
  });
  it("solo habilita eliminar canceladas, rechazadas o con fin alcanzado; conserva el umbral de cancelación", () => {
    const ahora = Date.parse("2099-01-02T18:30:00Z");
    expect(puedeEliminar({ ...reserva, estado: "CONFIRMADA" }, ahora)).toBe(
      false,
    );
    expect(puedeEliminar(reserva, ahora)).toBe(false);
    for (const estado of ["CANCELADA", "RECHAZADA"] as const)
      expect(puedeEliminar({ ...reserva, estado }, ahora)).toBe(true);
    expect(puedeEliminar(reserva, Date.parse(reserva.fin))).toBe(true);
    const limite = Date.parse(reserva.inicio) - 24 * 3600000;
    expect(puedeCancelar(reserva, limite)).toBe(true);
    expect(puedeCancelar(reserva, limite + 1)).toBe(false);
    expect(puedeCancelar({ ...reserva, estado: "RECHAZADA" }, limite)).toBe(
      false,
    );
  });
});

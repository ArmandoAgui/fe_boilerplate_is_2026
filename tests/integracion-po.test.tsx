import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CambiarEstado } from "@/components/integracion/estado-incidencia";
import { ListaAsambleas } from "@/components/asambleas/lista-asambleas";
import { GestionPaquetes } from "@/components/integracion/paquetes";
import { operacion, cargarResidentes } from "@/app/actions/integracion";
import { estadoVoto } from "@/app/actions/asamblea";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions/integracion", () => ({
  operacion: vi.fn().mockResolvedValue({ ok: true }),
  cargarResidentes: vi.fn(),
}));
vi.mock("@/app/actions/asamblea", () => ({
  estadoVoto: vi.fn(),
  emitirVoto: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
describe("Reglas PO en la interfaz", () => {
  it("no resuelve una incidencia si el administrador cancela la confirmación", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    render(<CambiarEstado id="i1" estado="EN_PROCESO" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Marcar como resuelta" }),
    );
    expect(operacion).not.toHaveBeenCalled();
  });
  it("carga automáticamente la participación y bloquea opciones de una unidad que ya votó", async () => {
    vi.mocked(estadoVoto).mockResolvedValue({
      ok: true,
      data: { yaVoto: true, fecha: "2026-11-15T18:00:00Z" },
    });
    render(
      <ListaAsambleas
        rol="RESIDENTE"
        unidades={[{ id: "u1", codigo: "A-101" }]}
        asambleas={[
          {
            id: "a1",
            titulo: "Asamblea",
            fechaAt: "2026-11-15T18:00:00Z",
            descripcion: null,
            estado: "PUBLICADA",
            temas: [
              {
                id: "t1",
                pregunta: "Pregunta",
                aperturaAt: "2026-11-15T18:00:00Z",
                cierreAt: "2026-11-15T20:00:00Z",
                estado: "ABIERTO",
                opciones: [
                  { id: "o1", texto: "A" },
                  { id: "o2", texto: "B" },
                ],
              },
            ],
          },
        ]}
      />,
    );
    expect(await screen.findByText(/Tu unidad ya votó el/)).toBeInTheDocument();
    expect(estadoVoto).toHaveBeenCalledWith("t1", "u1");
    expect(
      screen.queryByRole("button", { name: "Votar" }),
    ).not.toBeInTheDocument();
  });
  it("entrega únicamente con el ID de un residente del catálogo y conserva errores del servidor", async () => {
    vi.mocked(cargarResidentes).mockResolvedValue({
      datos: [{ id: "r1", nombre: "Ana Perez", email: "ana@po.test" }],
    });
    vi.mocked(operacion).mockResolvedValueOnce({
      error: "El paquete ya no está pendiente",
    });
    render(
      <GestionPaquetes
        puedeEntregar
        datos={[
          {
            id: "p1",
            codigo: "PAQ-1",
            empresa: "Empresa",
            unidadCodigo: "A-101",
            estado: "PENDIENTE",
            recibidoAt: "2026-11-15T18:00:00Z",
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Entregar" }),
    );
    await screen.findByRole("option", { name: "Ana Perez · ana@po.test" });
    expect(
      await screen.findByRole("button", { name: "Confirmar" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Residente que retira"), {
      target: { value: "r1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar" }),
    );
    await waitFor(() =>
      expect(operacion).toHaveBeenCalledWith("entrega", "p1", {
        residenteId: "r1",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El paquete ya no está pendiente",
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });
});

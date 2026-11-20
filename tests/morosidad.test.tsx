import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Morosidad } from "@/components/cuotas/morosidad";
import { obtenerDetalleMorosidad } from "@/app/actions/cuotas";
import { sumarMontos, torresDe, type FilaMorosidad } from "@/lib/cuotas";

vi.mock("@/app/actions/cuotas", () => ({
  obtenerDetalleMorosidad: vi.fn(),
}));

const fila = (
  codigo: string,
  torre: string,
  vence: string,
  dias: number,
  saldo = "50.00",
): FilaMorosidad => ({
  unidadId: `id-${codigo}`,
  codigo,
  torre,
  cuotasVencidas: 1,
  saldoVencido: saldo,
  vencimientoMasAntiguo: vence,
  diasAtraso: dias,
});

// Ya vienen ordenadas por el backend: más antigua primero, luego por código.
const filas = [
  fila("A-101", "Torre A", "2026-09-10", 59),
  fila("A-201", "Torre A", "2026-10-10", 29, "55.00"),
  fila("B-102", "Torre B", "2026-10-10", 29, "45.00"),
];

beforeEach(() => vi.clearAllMocks());

describe("H4: utilidades", () => {
  it("obtiene las torres sin repetir", () => {
    expect(torresDe(filas)).toEqual(["Torre A", "Torre B"]);
  });

  it("suma montos sin errores de punto flotante", () => {
    expect(sumarMontos(["0.10", "0.20"])).toBe("0.30");
    expect(sumarMontos(["50.00", "55.00", "45.00"])).toBe("150.00");
  });
});

describe("H4: pantalla Morosidad", () => {
  it("muestra las unidades en el orden del backend con sus datos", () => {
    render(<Morosidad filas={filas} />);
    const filasTabla = screen.getAllByRole("row").slice(1);
    expect(within(filasTabla[0]).getByText("A-101")).toBeInTheDocument();
    expect(within(filasTabla[0]).getByText("10/09/2026")).toBeInTheDocument();
    expect(within(filasTabla[0]).getByText("59")).toBeInTheDocument();
    expect(within(filasTabla[1]).getByText("A-201")).toBeInTheDocument();
    expect(within(filasTabla[2]).getByText("B-102")).toBeInTheDocument();
    expect(screen.getByText(/3 unidades morosas/)).toHaveTextContent("$150.00");
  });

  it("filtra por torre", () => {
    render(<Morosidad filas={filas} />);
    fireEvent.change(screen.getByLabelText("Torre"), {
      target: { value: "Torre B" },
    });
    const filasTabla = screen.getAllByRole("row").slice(1);
    expect(filasTabla).toHaveLength(1);
    expect(within(filasTabla[0]).getByText("B-102")).toBeInTheDocument();
  });

  it("abre el panel con las cuotas vencidas de la unidad", async () => {
    vi.mocked(obtenerDetalleMorosidad).mockResolvedValue({
      datos: {
        unidadId: "id-A-101",
        codigo: "A-101",
        cuotas: [
          {
            id: "c1",
            periodo: "2026-11",
            monto: "50.00",
            fechaVencimiento: "2026-09-10",
            diasAtraso: 59,
          },
        ],
      },
    });
    render(<Morosidad filas={filas} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver cuotas vencidas de A-101" }),
    );
    expect(screen.getByRole("heading", { name: "Unidad A-101" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("59 días")).toBeInTheDocument(),
    );
    expect(obtenerDetalleMorosidad).toHaveBeenCalledWith("id-A-101");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(
      screen.queryByRole("heading", { name: "Unidad A-101" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el mensaje vacío de la card", () => {
    render(<Morosidad filas={[]} />);
    expect(screen.getByText("No hay unidades morosas")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  EstadoDeCuenta,
  urlCuotas,
  type FiltrosCuotas,
} from "@/components/cuotas/estado-de-cuenta";
import { fechaCorta, type Cuota, type ListaCuotas } from "@/lib/cuotas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const unidades = [
  { id: "u1", codigo: "A-101" },
  { id: "u2", codigo: "A-102" },
];
const filtros: FiltrosCuotas = { unidadId: "u1", periodo: "", estado: "" };
const cuota = (periodo: string, estado: Cuota["estado"]): Cuota => ({
  id: `c-${periodo}`,
  concepto: "Cuota de mantenimiento",
  periodo,
  monto: "50.00",
  fechaVencimiento: `${periodo}-10`,
  estado,
});
const lista = (datos: Cuota[], totalPendiente = "100.00"): ListaCuotas => ({
  datos,
  totalPendiente,
  total: datos.length,
  pagina: 1,
  tamanoPagina: 20,
});

beforeEach(() => vi.clearAllMocks());

describe("H1: utilidades", () => {
  it("muestra el vencimiento como DD/MM/AAAA sin correr el día", () => {
    expect(fechaCorta("2026-11-10")).toBe("10/11/2026");
  });

  it("arma la URL solo con los filtros que tienen valor", () => {
    expect(urlCuotas(filtros)).toBe("/cuotas?unidadId=u1");
    expect(
      urlCuotas({ unidadId: "u1", periodo: "2026-11", estado: "VENCIDA" }, 2),
    ).toBe("/cuotas?unidadId=u1&periodo=2026-11&estado=VENCIDA&pagina=2");
  });
});

describe("H1: pantalla Estado de cuenta", () => {
  it("muestra las cuotas con su estado y el total pendiente de la unidad", () => {
    render(
      <EstadoDeCuenta
        unidades={unidades}
        filtros={filtros}
        lista={lista([
          cuota("2026-10", "VENCIDA"),
          cuota("2026-11", "PENDIENTE"),
          cuota("2026-09", "PAGADA"),
        ])}
      />,
    );
    expect(screen.getByText("Total pendiente, unidad A-101")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    const filas = screen.getAllByRole("row").slice(1);
    expect(within(filas[0]).getByText("Vencida")).toBeInTheDocument();
    expect(within(filas[0]).getByText("10/10/2026")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Pendiente")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Pagada")).toBeInTheDocument();
  });

  it("muestra el selector de unidad solo con dos o más unidades", () => {
    const { rerender } = render(
      <EstadoDeCuenta unidades={unidades} filtros={filtros} lista={lista([])} />,
    );
    expect(screen.getByLabelText("Unidad")).toBeInTheDocument();
    rerender(
      <EstadoDeCuenta
        unidades={[unidades[0]]}
        filtros={filtros}
        lista={lista([])}
      />,
    );
    expect(screen.queryByLabelText("Unidad")).not.toBeInTheDocument();
  });

  it("muestra el mensaje vacío de la card", () => {
    render(
      <EstadoDeCuenta
        unidades={unidades}
        filtros={filtros}
        lista={lista([], "0.00")}
      />,
    );
    expect(
      screen.getByText("No tienes cuotas registradas para esta unidad"),
    ).toBeInTheDocument();
  });

  it("vuelve a consultar al cambiar unidad o estado", () => {
    render(
      <EstadoDeCuenta unidades={unidades} filtros={filtros} lista={lista([])} />,
    );
    fireEvent.change(screen.getByLabelText("Unidad"), {
      target: { value: "u2" },
    });
    expect(navigation.push).toHaveBeenCalledWith("/cuotas?unidadId=u2");
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "VENCIDA" },
    });
    expect(navigation.push).toHaveBeenCalledWith(
      "/cuotas?unidadId=u1&estado=VENCIDA",
    );
  });
});

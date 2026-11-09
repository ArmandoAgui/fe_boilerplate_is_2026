import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GenerarCuotas } from "@/components/cuotas/generar-cuotas";
import { generarCuotas, obtenerPrevia } from "@/app/actions/cuotas";
import {
  dinero,
  errorPeriodo,
  mesLocal,
  mesSiguiente,
  type PreviaGeneracion,
} from "@/lib/cuotas";

vi.mock("@/app/actions/cuotas", () => ({
  obtenerPrevia: vi.fn(),
  generarCuotas: vi.fn(),
}));

const previa = (unidadesAGenerar: number, totalUsd = "400.00") =>
  ({
    periodo: "2026-11",
    unidadesAGenerar,
    unidadesOmitidas: 8 - unidadesAGenerar,
    totalUsd,
  }) satisfies PreviaGeneracion;

const pantalla = (p: PreviaGeneracion = previa(8)) =>
  render(
    <GenerarCuotas
      previaInicial={p}
      mesActual="2026-11"
      mesSiguiente="2026-12"
    />,
  );

/** El botón de la pantalla y el del diálogo se llaman igual. */
const botonDialogo = () =>
  screen.getAllByRole("button", { name: "Generar cuotas" }).at(-1)!;

beforeEach(() => vi.clearAllMocks());

describe("H3: reglas de período en el cliente", () => {
  it("usa la hora de El Salvador para saber el mes actual", () => {
    // 1 de diciembre 03:00 UTC todavía es 30 de noviembre en El Salvador.
    expect(mesLocal(Date.parse("2026-12-01T03:00:00Z"))).toBe("2026-11");
  });

  it("calcula el mes siguiente con cambio de año", () => {
    expect(mesSiguiente("2026-12")).toBe("2027-01");
  });

  it("acepta solo el mes actual o el siguiente", () => {
    expect(errorPeriodo("2026-11", "2026-11")).toBe("");
    expect(errorPeriodo("2026-12", "2026-11")).toBe("");
    expect(errorPeriodo("2026-10", "2026-11")).toBe(
      "Seleccione el mes actual o el siguiente",
    );
  });

  it("muestra montos con signo de dólar y 2 decimales", () => {
    expect(dinero("400.00")).toBe("$400.00");
    expect(dinero("12500.5")).toBe("$12,500.50");
  });
});

describe("H3: pantalla Generar cuotas", () => {
  it("muestra el resumen previo del período", () => {
    pantalla();
    expect(screen.getByText("Unidades a generar")).toBeInTheDocument();
    expect(screen.getByText("$400.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generar cuotas" }),
    ).toBeEnabled();
  });

  it("deshabilita el botón si todas las unidades ya tienen cuota", () => {
    pantalla(previa(0, "0.00"));
    expect(
      screen.getByText("Todas las unidades ya tienen cuota para este período"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generar cuotas" }),
    ).toBeDisabled();
  });

  it("rechaza un período fuera de rango sin llamar al servidor", () => {
    pantalla();
    fireEvent.change(screen.getByLabelText("Período"), {
      target: { value: "2027-03" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Seleccione el mes actual o el siguiente",
    );
    expect(obtenerPrevia).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Generar cuotas" }),
    ).toBeDisabled();
  });

  it("pide confirmación y muestra cuántas cuotas creó", async () => {
    vi.mocked(generarCuotas).mockResolvedValue({
      datos: {
        periodo: "2026-11",
        creadas: 7,
        omitidas: [{ unidadId: "u1", codigo: "A-101", motivo: "YA_EXISTE" }],
      },
    });
    vi.mocked(obtenerPrevia).mockResolvedValue({ datos: previa(0, "0.00") });
    pantalla();

    fireEvent.click(screen.getByRole("button", { name: "Generar cuotas" }));
    expect(
      screen.getByText("¿Generar cuotas del período 2026-11 para 8 unidades?"),
    ).toBeInTheDocument();
    fireEvent.click(botonDialogo());

    await waitFor(() =>
      expect(
        screen.getByText("Se crearon 7 cuotas, 1 omitidas"),
      ).toBeInTheDocument(),
    );
    expect(generarCuotas).toHaveBeenCalledWith("2026-11");
    expect(
      screen.getByText("A-101: Ya tiene cuota en este período"),
    ).toBeInTheDocument();
  });

  it("muestra el error del servidor, por ejemplo un 409", async () => {
    vi.mocked(generarCuotas).mockResolvedValue({
      error: "Todas las unidades ya tienen cuota para este período",
      status: 409,
    });
    pantalla();
    fireEvent.click(screen.getByRole("button", { name: "Generar cuotas" }));
    fireEvent.click(botonDialogo());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Todas las unidades ya tienen cuota para este período",
      ),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultadosVotacion } from "@/components/asambleas/resultados-votacion";
import { obtenerResultados } from "@/app/actions/asamblea";

vi.mock("@/app/actions/asamblea", () => ({
  obtenerResultados: vi.fn(),
}));

const temaCerrado = {
  id: "tema-cerrado",
  pregunta: "Tema de prueba H22",
  aperturaAt: "2026-11-01T10:00:00.000Z",
  cierreAt: "2026-11-01T12:00:00.000Z",
  estado: "CERRADO" as const,
  opciones: [
    { id: "opcion-si", texto: "Sí" },
    { id: "opcion-no", texto: "No" },
    { id: "opcion-abstencion", texto: "Abstención" },
  ],
};

const temaAbierto = {
  ...temaCerrado,
  id: "tema-abierto",
  pregunta: "Tema todavía abierto",
  estado: "ABIERTO" as const,
};

const resultados = {
  temaId: "tema-cerrado",
  titulo: "Tema de prueba H22",
  opciones: [
    { opcionId: "opcion-si", texto: "Sí", votos: 2, porcentaje: 66.7 },
    { opcionId: "opcion-no", texto: "No", votos: 1, porcentaje: 33.3 },
    { opcionId: "opcion-abstencion", texto: "Abstención", votos: 0, porcentaje: 0 },
  ],
  totalVotos: 3,
  unidadesHabilitadas: 10,
  participacion: 30,
  unidadesVotantes: [
    { unidadId: "unidad-1", codigo: "A-101", fecha: "2026-11-01T11:00:00.000Z" },
    { unidadId: "unidad-2", codigo: "A-102", fecha: "2026-11-01T11:10:00.000Z" },
    { unidadId: "unidad-3", codigo: "B-201", fecha: "2026-11-01T11:20:00.000Z" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("H22. Consultar resultados auditables", () => {
  it("AC1: presenta conteos, porcentajes, total y participación del tema cerrado", async () => {
    vi.mocked(obtenerResultados).mockResolvedValue({
      ok: true,
      data: resultados,
    });

    render(<ResultadosVotacion temas={[temaCerrado]} />);

    expect(await screen.findByRole("heading", { name: "Tema de prueba H22" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Opción" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Votos" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Porcentaje" })).toBeInTheDocument();

    expect(screen.getByText("Sí")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Abstención")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText("Participación: 3 de 10 unidades (30.0%)")).toBeInTheDocument();

    const total = screen.getByRole("row", { name: /Total 3 100.0%/ });
    expect(total).toBeInTheDocument();
    expect(obtenerResultados).toHaveBeenCalledWith("tema-cerrado");
  });

  it("AC2: lista unidades y fechas sin revelar la opción elegida", async () => {
    vi.mocked(obtenerResultados).mockResolvedValue({
      ok: true,
      data: resultados,
    });

    render(<ResultadosVotacion temas={[temaCerrado]} />);

    const region = await screen.findByRole("region", { name: "Unidades que votaron" });
    expect(within(region).getByText("A-101")).toBeInTheDocument();
    expect(within(region).getByText("A-102")).toBeInTheDocument();
    expect(within(region).getByText("B-201")).toBeInTheDocument();

    // Los nombres de opciones aparecen en la tabla de resultados, no asociados a unidades.
    expect(within(region).queryByText("Sí")).not.toBeInTheDocument();
    expect(within(region).queryByText("No")).not.toBeInTheDocument();
    expect(within(region).queryByText("Abstención")).not.toBeInTheDocument();
  });

 it("AC3: un tema abierto muestra el aviso y no consulta resultados", async () => {
  render(<ResultadosVotacion temas={[temaAbierto]} />);

  expect(screen.getByRole("status")).toHaveTextContent(
    "Los resultados estarán disponibles al cierre de la votación",
  );

  expect(obtenerResultados).not.toHaveBeenCalled();
});

  it("AC3: al cambiar de un tema cerrado a uno abierto oculta los resultados y muestra el aviso", async () => {
    vi.mocked(obtenerResultados).mockResolvedValue({
      ok: true,
      data: resultados,
    });

    render(<ResultadosVotacion temas={[temaCerrado, temaAbierto]} />);
    await screen.findByText("Participación: 3 de 10 unidades (30.0%)");

    await userEvent.setup().selectOptions(screen.getByLabelText("Tema"), "tema-abierto");

    expect(
      screen.getByText("Los resultados estarán disponibles al cierre de la votación"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Participación: 3 de 10 unidades (30.0%)")).not.toBeInTheDocument();
  });
});

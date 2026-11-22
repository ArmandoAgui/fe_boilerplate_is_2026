import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FiltroPeriodo } from "@/components/reportes/filtro-periodo";
import {
  TarjetasIndicadores,
  tarjetasDe,
} from "@/components/reportes/tarjetas-indicadores";
import PaginaReportes from "@/app/(plataforma)/admin/reportes/page";
import { api, usuarioActual } from "@/lib/api";
import {
  errorRango,
  numero,
  rangoPorDefecto,
  type ResumenIndicadores,
} from "@/lib/reportes";

// H29: criterios de interfaz (AC1 y AC2). Los de backend (AC3 a AC6) están en
// src/reportes/services/reportes.entrega.spec.ts del backend. La API se simula.

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  usuarioActual: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const llamarApi = vi.mocked(api);
const usuario = vi.mocked(usuarioActual);

const resumen = (
  cambios: Partial<ResumenIndicadores> = {},
): ResumenIndicadores => ({
  desde: "2026-11-01",
  hasta: "2026-11-20",
  generadoAt: "2026-11-21T00:30:00.000Z",
  morosidad: {
    estado: "DATOS",
    unidadesMorosas: 1,
    unidadesActivas: 6,
    porcentaje: 16.7,
    saldoVencido: "52.50",
  },
  usoAreas: {
    estado: "DATOS",
    horasReservadas: 0,
    horasHabilitadas: 1600,
    porcentaje: 0,
  },
  incidenciasAbiertas: { estado: "SIN_DATOS", abiertas: 0, creadas: 0 },
  participacion: {
    estado: "SIN_DATOS",
    temasCerrados: 0,
    porcentajePromedio: null,
  },
  ...cambios,
});

beforeEach(() => vi.clearAllMocks());

describe("H29. Consultar indicadores consolidados", () => {
  it("AC1: /admin/reportes consulta el período y muestra las cuatro tarjetas", async () => {
    usuario.mockResolvedValue({ rol: "ADMINISTRADOR" } as never);
    llamarApi.mockResolvedValue(resumen());
    render(
      await PaginaReportes({
        searchParams: Promise.resolve({
          desde: "2026-11-01",
          hasta: "2026-11-20",
        }),
      }),
    );
    expect(llamarApi).toHaveBeenCalledWith(
      "reportes/resumen?desde=2026-11-01&hasta=2026-11-20",
    );
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-20");
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("AC1: cada tarjeta muestra su valor, el período y el módulo de origen", () => {
    render(<TarjetasIndicadores resumen={resumen()} />);
    const tarjetas = screen.getAllByRole("article");
    expect(
      tarjetas.map((t) => within(t).getByRole("heading").textContent),
    ).toEqual([
      "Morosidad",
      "Uso de áreas",
      "Incidencias abiertas",
      "Participación en votaciones",
    ]);
    const morosidad = within(tarjetas[0]);
    expect(morosidad.getByText("16.7 %")).toBeInTheDocument();
    expect(
      morosidad.getByText("1 de 6 unidades activas, saldo vencido $52.50"),
    ).toBeInTheDocument();
    expect(morosidad.getByText("01/11/2026 al 20/11/2026")).toBeInTheDocument();
    expect(morosidad.getByText("Cuotas y pagos")).toBeInTheDocument();
  });

  it("AC1: por defecto va del primer día del mes a hoy (El Salvador)", () => {
    expect(rangoPorDefecto(Date.parse("2026-12-01T03:00:00Z"))).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
  });

  it("AC1: no permite aplicar un rango inválido ni mayor a 366 días", () => {
    expect(errorRango("2026-11-16", "2026-11-15")).toBe(
      "Desde no puede ser posterior a Hasta",
    );
    expect(errorRango("2028-01-01", "2028-12-31")).toBe("");
    render(<FiltroPeriodo desde="2026-11-01" hasta="2026-11-20" />);
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2025-11-01" },
    });
    expect(
      screen.getByText("El rango no puede superar 366 días"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled();
  });

  it("AC1: Aplicar vuelve a consultar los indicadores", () => {
    render(<FiltroPeriodo desde="2026-11-01" hasta="2026-11-20" />);
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-11-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(navigation.push).toHaveBeenCalledWith(
      "/admin/reportes?desde=2026-11-01&hasta=2026-11-14",
    );
  });

  it("AC2: sin base de cálculo la tarjeta muestra Sin datos", () => {
    render(<TarjetasIndicadores resumen={resumen()} />);
    const [, , incidencias, participacion] = screen.getAllByRole("article");
    expect(within(incidencias).getByText("Sin datos")).toBeInTheDocument();
    expect(within(participacion).getByText("Sin datos")).toBeInTheDocument();
  });

  it("AC2: un cero real se muestra como 0", () => {
    expect(numero(0)).toBe("0");
    const [, uso, incidencias] = tarjetasDe(
      resumen({
        incidenciasAbiertas: { estado: "DATOS", abiertas: 0, creadas: 5 },
      }),
    );
    expect(uso.valor).toBe("0 %");
    expect(incidencias.valor).toBe("0");
    expect(incidencias.detalle).toBe("De 5 incidencias creadas en el período");
  });
});

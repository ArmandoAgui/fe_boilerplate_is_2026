import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FiltroPeriodo } from "@/components/reportes/filtro-periodo";
import {
  TarjetasIndicadores,
  tarjetasDe,
} from "@/components/reportes/tarjetas-indicadores";
import {
  errorRango,
  numero,
  rangoPorDefecto,
  type ResumenIndicadores,
} from "@/lib/reportes";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const resumen = (
  cambios: Partial<ResumenIndicadores> = {},
): ResumenIndicadores => ({
  desde: "2026-11-01",
  hasta: "2026-11-15",
  generadoAt: "2026-11-16T14:00:00.000Z",
  morosidad: {
    estado: "DATOS",
    unidadesMorosas: 6,
    unidadesActivas: 8,
    porcentaje: 75,
    saldoVencido: "300.00",
  },
  usoAreas: {
    estado: "DATOS",
    horasReservadas: 0,
    horasHabilitadas: 960,
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

describe("H29: reglas del período", () => {
  it("por defecto va del primer día del mes a hoy, en hora de El Salvador", () => {
    // 1 de diciembre 03:00 UTC sigue siendo 30 de noviembre en El Salvador.
    expect(rangoPorDefecto(Date.parse("2026-12-01T03:00:00Z"))).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
  });

  it("usa los mismos mensajes que el backend", () => {
    expect(errorRango("2026-11-01", "2026-11-15")).toBe("");
    expect(errorRango("2026-11-16", "2026-11-15")).toBe(
      "Desde no puede ser posterior a Hasta",
    );
    expect(errorRango("2026-01-01", "2027-01-02")).toBe(
      "El rango no puede superar 366 días",
    );
    expect(errorRango("2028-01-01", "2028-12-31")).toBe("");
    expect(errorRango("", "2026-11-15")).toBe(
      "Seleccione las fechas Desde y Hasta",
    );
  });

  it("muestra hasta 1 decimal y el cero como 0", () => {
    expect(numero(75)).toBe("75");
    expect(numero(33.3)).toBe("33.3");
    expect(numero(0)).toBe("0");
  });
});

describe("H29: tarjetas", () => {
  it("muestra las cuatro tarjetas con valor, período y origen", () => {
    render(<TarjetasIndicadores resumen={resumen()} />);
    const tarjetas = screen.getAllByRole("article");
    expect(tarjetas).toHaveLength(4);
    const morosidad = within(tarjetas[0]);
    expect(morosidad.getByText("Morosidad")).toBeInTheDocument();
    expect(morosidad.getByText("75 %")).toBeInTheDocument();
    expect(
      morosidad.getByText(
        "6 de 8 unidades activas, saldo vencido $300.00",
      ),
    ).toBeInTheDocument();
    expect(morosidad.getByText("01/11/2026 al 15/11/2026")).toBeInTheDocument();
    expect(morosidad.getByText("Cuotas y pagos")).toBeInTheDocument();
  });

  it("distingue un cero real de Sin datos", () => {
    const [, uso, incidencias, participacion] = tarjetasDe(resumen());
    expect(uso.valor).toBe("0 %");
    expect(incidencias.valor).toBeNull();
    expect(participacion.valor).toBeNull();

    render(<TarjetasIndicadores resumen={resumen()} />);
    expect(screen.getAllByText("Sin datos")).toHaveLength(2);
  });

  it("5 incidencias creadas y todas resueltas muestra 0", () => {
    const [, , incidencias] = tarjetasDe(
      resumen({
        incidenciasAbiertas: { estado: "DATOS", abiertas: 0, creadas: 5 },
      }),
    );
    expect(incidencias.valor).toBe("0");
    expect(incidencias.detalle).toBe("De 5 incidencias creadas en el período");
  });
});

describe("H29: filtro Desde y Hasta", () => {
  it("deshabilita Aplicar y avisa con un rango mayor a 366 días", () => {
    render(<FiltroPeriodo desde="2026-11-01" hasta="2026-11-15" />);
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2025-01-01" },
    });
    expect(
      screen.getByText("El rango no puede superar 366 días"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled();
  });

  it("Aplicar consulta el nuevo rango", () => {
    render(<FiltroPeriodo desde="2026-11-01" hasta="2026-11-15" />);
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-11-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(navigation.push).toHaveBeenCalledWith(
      "/admin/reportes?desde=2026-11-01&hasta=2026-11-10",
    );
  });

  it("Aplicar con el mismo rango vuelve a consultar", () => {
    render(<FiltroPeriodo desde="2026-11-01" hasta="2026-11-15" />);
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(navigation.refresh).toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });
});

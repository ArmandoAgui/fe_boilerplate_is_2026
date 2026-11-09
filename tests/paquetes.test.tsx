import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { NuevoPaquete } from "@/components/paquetes/nuevo-paquete";
import { registrarPaquete } from "@/app/actions/paquetes";
import {
  errorDescripcion,
  errorEmpresa,
  errorUnidad,
  filtrarUnidades,
  type PaqueteRegistrado,
  type UnidadOpcion,
} from "@/lib/paquetes";

vi.mock("@/app/actions/paquetes", () => ({ registrarPaquete: vi.fn() }));

const unidades: UnidadOpcion[] = [
  { id: "u1", codigo: "A-101", torre: "Torre Norte" },
  { id: "u2", codigo: "A-102", torre: "Torre Norte" },
  { id: "u3", codigo: "B-201", torre: "Torre Sur" },
];

const paquete: PaqueteRegistrado = {
  id: "p1",
  codigo: "PAQ-000001",
  unidadId: "u1",
  unidadCodigo: "A-101",
  empresa: "Urbano Express",
  descripcion: null,
  estado: "PENDIENTE",
  recibidoAt: "2026-11-09T02:30:00Z",
};

const pantalla = () => render(<NuevoPaquete unidades={unidades} />);

const llenar = (empresa = "Urbano Express", unidad = "u1") => {
  fireEvent.change(screen.getByLabelText("Unidad de destino"), {
    target: { value: unidad },
  });
  fireEvent.change(screen.getByLabelText("Empresa"), {
    target: { value: empresa },
  });
};

const enviar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Registrar paquete" }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(registrarPaquete).mockResolvedValue({ paquete });
});

describe("Validaciones de H16", () => {
  it.each([
    ["", "La empresa debe tener entre 2 y 60 caracteres"],
    ["D", "La empresa debe tener entre 2 y 60 caracteres"],
    ["  D  ", "La empresa debe tener entre 2 y 60 caracteres"],
    ["DH", ""],
    ["a".repeat(60), ""],
    ["a".repeat(61), "La empresa debe tener entre 2 y 60 caracteres"],
  ])("errorEmpresa(%o)", (valor, esperado) =>
    expect(errorEmpresa(valor)).toBe(esperado),
  );

  it("acepta 120 caracteres de descripción y rechaza 121", () => {
    expect(errorDescripcion("a".repeat(120))).toBe("");
    expect(errorDescripcion("a".repeat(121))).toBe(
      "La descripción admite hasta 120 caracteres",
    );
  });

  it("exige elegir unidad con un texto distinto al de la opción vacía", () => {
    expect(errorUnidad("")).toBe("Seleccione una unidad de destino");
    expect(errorUnidad("u1")).toBe("");
  });

  describe("filtrarUnidades", () => {
    it("devuelve todas sin búsqueda", () =>
      expect(filtrarUnidades(unidades, "  ")).toHaveLength(3));

    it("filtra por código sin distinguir mayúsculas", () =>
      expect(filtrarUnidades(unidades, "b-2").map((u) => u.id)).toEqual([
        "u3",
      ]));

    it("filtra por torre", () =>
      expect(filtrarUnidades(unidades, "norte").map((u) => u.id)).toEqual([
        "u1",
        "u2",
      ]));
  });
});

describe("Recepción de paquetes", () => {
  it("lista las unidades con su torre", () => {
    pantalla();
    const select = screen.getByLabelText("Unidad de destino");
    expect(within(select).getAllByRole("option")).toHaveLength(4);
    expect(within(select).getByText("B-201 · Torre Sur")).toBeTruthy();
  });

  it("el buscador reduce la lista sin consultar al servidor", () => {
    pantalla();
    fireEvent.change(screen.getByLabelText("Buscar unidad"), {
      target: { value: "sur" },
    });
    const select = screen.getByLabelText("Unidad de destino");
    // Queda la opción vacía más la única coincidencia.
    expect(within(select).getAllByRole("option")).toHaveLength(2);
  });

  it("avisa cuando ninguna unidad coincide", () => {
    pantalla();
    fireEvent.change(screen.getByLabelText("Buscar unidad"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Ninguna unidad coincide con esa búsqueda"),
    ).toBeTruthy();
  });

  it("muestra la hora de recepción después de montar", async () => {
    pantalla();
    await waitFor(() =>
      expect(
        (screen.getByLabelText(/Fecha y hora de recepción/) as HTMLInputElement)
          .value,
      ).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/),
    );
  });

  it("no envía con el formulario vacío y marca cada campo", () => {
    pantalla();
    enviar();
    expect(
      screen.getByText("Seleccione una unidad de destino"),
    ).toBeTruthy();
    expect(
      screen.getByText("La empresa debe tener entre 2 y 60 caracteres"),
    ).toBeTruthy();
    expect(registrarPaquete).not.toHaveBeenCalled();
  });

  it("deshabilita el botón mientras haya errores", () => {
    pantalla();
    enviar();
    expect(
      screen.getByRole("button", { name: "Registrar paquete" }),
    ).toBeDisabled();
  });

  it("registra recortando los espacios y sin descripción vacía", async () => {
    pantalla();
    llenar("  DHL  ");
    enviar();
    await waitFor(() =>
      expect(registrarPaquete).toHaveBeenCalledWith({
        unidadId: "u1",
        empresa: "DHL",
        descripcion: undefined,
      }),
    );
  });

  it("envía la descripción cuando se escribe", async () => {
    pantalla();
    llenar();
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: "Caja mediana" },
    });
    enviar();
    await waitFor(() =>
      expect(registrarPaquete).toHaveBeenCalledWith({
        unidadId: "u1",
        empresa: "Urbano Express",
        descripcion: "Caja mediana",
      }),
    );
  });

  // La tarjeta lo pide: en la recepción se registran varios seguidos.
  it("muestra el código y limpia el formulario", async () => {
    pantalla();
    llenar();
    enviar();
    expect(
      await screen.findByText("Paquete registrado · PAQ-000001"),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Empresa") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Unidad de destino") as HTMLSelectElement).value,
    ).toBe("");
  });

  it("ante un error del servidor conserva lo escrito", async () => {
    vi.mocked(registrarPaquete).mockResolvedValue({
      error: "La unidad no existe",
      status: 404,
    });
    pantalla();
    llenar("DHL");
    enviar();
    expect(await screen.findByText("La unidad no existe")).toBeTruthy();
    expect(
      (screen.getByLabelText("Empresa") as HTMLInputElement).value,
    ).toBe("DHL");
  });
});

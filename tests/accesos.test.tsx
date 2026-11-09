import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Accesos } from "@/components/visitas/accesos";
import {
  buscarAutorizaciones,
  registrarEntrada,
  registrarSalida,
} from "@/app/actions/visitas";
import {
  errorBusqueda,
  hora,
  type AutorizacionBuscada,
  type Presente,
} from "@/lib/visitas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/visitas", () => ({
  buscarAutorizaciones: vi.fn(),
  registrarEntrada: vi.fn(),
  registrarSalida: vi.fn(),
}));

const autorizacion: AutorizacionBuscada = {
  id: "a1",
  visitanteNombre: "Andres Lopez",
  visitanteDocumento: "045678912",
  unidadCodigo: "A-101",
  inicio: "2026-11-08T16:00:00Z",
  fin: "2026-11-08T22:00:00Z",
};
const presente: Presente = {
  id: "m1",
  visitanteNombre: "Pedro Castillo",
  visitanteDocumento: "023456789",
  unidadCodigo: "A-102",
  condicion: "SIN_AUTORIZACION",
  ingresoAt: "2026-11-08T21:30:00Z",
};
const unidades = [
  { id: "u1", codigo: "A-101" },
  { id: "u2", codigo: "A-102" },
];

const pantalla = (presentes: Presente[] = []) =>
  render(<Accesos presentes={presentes} unidades={unidades} />);

beforeEach(() => vi.clearAllMocks());

describe("Validación del buscador", () => {
  it("no exige nada con el campo vacío", () =>
    expect(errorBusqueda("")).toBe(""));

  it("pide el mínimo de la card con menos de 3 caracteres", () =>
    expect(errorBusqueda("an")).toBe("Escriba al menos 3 caracteres"));

  it("acepta 3 caracteres", () => expect(errorBusqueda("and")).toBe(""));

  it("rechaza más de 100 caracteres", () =>
    expect(errorBusqueda("a".repeat(101))).toBe(
      "La búsqueda admite hasta 100 caracteres",
    ));

  it("muestra la hora del condominio, no la UTC", () =>
    // 21:30 UTC son 15:30 en El Salvador, que es UTC−6 todo el año.
    expect(hora("2026-11-08T21:30:00Z")).toBe("15:30"));
});

describe("Control de accesos", () => {
  it("no busca con menos de 3 caracteres", () => {
    pantalla();
    fireEvent.change(screen.getByLabelText(/nombre o documento/i), {
      target: { value: "an" },
    });
    expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
    expect(screen.getByText("Escriba al menos 3 caracteres")).toBeTruthy();
    expect(buscarAutorizaciones).not.toHaveBeenCalled();
  });

  it("lista las autorizaciones encontradas", async () => {
    vi.mocked(buscarAutorizaciones).mockResolvedValue({
      datos: [autorizacion],
    });
    pantalla();
    fireEvent.change(screen.getByLabelText(/nombre o documento/i), {
      target: { value: "andres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(buscarAutorizaciones).toHaveBeenCalledWith("andres"),
    );
    expect(await screen.findByText("Andres Lopez")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Registrar entrada de Andres Lopez",
      }),
    ).toBeTruthy();
  });

  it("muestra el estado vacío de la card cuando no hay nada", async () => {
    vi.mocked(buscarAutorizaciones).mockResolvedValue({ datos: [] });
    pantalla();
    fireEvent.change(screen.getByLabelText(/nombre o documento/i), {
      target: { value: "nadie" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(
      await screen.findByText(
        "No hay autorizaciones vigentes para esa búsqueda",
      ),
    ).toBeTruthy();
  });

  it("registra la entrada preautorizada y saca la autorización de la lista", async () => {
    vi.mocked(buscarAutorizaciones).mockResolvedValue({
      datos: [autorizacion],
    });
    vi.mocked(registrarEntrada).mockResolvedValue({
      ok: true,
      nombre: "Andres Lopez",
    });
    pantalla();
    fireEvent.change(screen.getByLabelText(/nombre o documento/i), {
      target: { value: "andres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    const boton = await screen.findByRole("button", {
      name: "Registrar entrada de Andres Lopez",
    });
    // Todos los botones comparten el pendiente del useTransition, así que
    // mientras corre la búsqueda este queda deshabilitado. Hay que esperar a
    // que se habilite, igual que esperaría quien está en la puerta.
    await waitFor(() => expect(boton).not.toBeDisabled());
    fireEvent.click(boton);
    await waitFor(() =>
      expect(registrarEntrada).toHaveBeenCalledWith({ autorizacionId: "a1" }),
    );
    expect(
      await screen.findByText(/Entrada registrada · Andres Lopez/),
    ).toBeTruthy();
    // De uso único: ya no debe quedar el botón que daría 409 al reintentar.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Registrar entrada de Andres Lopez",
        }),
      ).toBeNull(),
    );
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("muestra el conflicto que devuelve el servidor", async () => {
    vi.mocked(buscarAutorizaciones).mockResolvedValue({
      datos: [autorizacion],
    });
    vi.mocked(registrarEntrada).mockResolvedValue({
      error: "La autorización no está vigente",
      status: 409,
    });
    pantalla();
    fireEvent.change(screen.getByLabelText(/nombre o documento/i), {
      target: { value: "andres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    const boton = await screen.findByRole("button", {
      name: "Registrar entrada de Andres Lopez",
    });
    // Todos los botones comparten el pendiente del useTransition, así que
    // mientras corre la búsqueda este queda deshabilitado. Hay que esperar a
    // que se habilite, igual que esperaría quien está en la puerta.
    await waitFor(() => expect(boton).not.toBeDisabled());
    fireEvent.click(boton);
    expect(
      await screen.findByText("La autorización no está vigente"),
    ).toBeTruthy();
  });

  it("valida los tres campos de una visita sin autorización", async () => {
    pantalla();
    fireEvent.click(
      screen.getByRole("button", { name: "Visita sin autorización" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar entrada" }),
    );
    expect(
      await screen.findByText(
        "El nombre debe tener entre 3 y 100 caracteres",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "El documento debe tener de 5 a 20 caracteres alfanuméricos",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Seleccione una unidad de destino")).toBeTruthy();
    expect(registrarEntrada).not.toHaveBeenCalled();
  });

  it("registra una visita sin autorización con los tres datos", async () => {
    vi.mocked(registrarEntrada).mockResolvedValue({
      ok: true,
      nombre: "Pedro Castillo",
    });
    pantalla();
    fireEvent.click(
      screen.getByRole("button", { name: "Visita sin autorización" }),
    );
    fireEvent.change(screen.getByLabelText("Nombre del visitante"), {
      target: { value: "Pedro Castillo" },
    });
    fireEvent.change(screen.getByLabelText("Documento"), {
      target: { value: "023456789" },
    });
    fireEvent.change(screen.getByLabelText("Unidad de destino"), {
      target: { value: "u2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar entrada" }),
    );
    await waitFor(() =>
      expect(registrarEntrada).toHaveBeenCalledWith({
        visitanteNombre: "Pedro Castillo",
        visitanteDocumento: "023456789",
        unidadId: "u2",
      }),
    );
    expect(
      await screen.findByText(/Entrada registrada · Pedro Castillo/),
    ).toBeTruthy();
  });

  it("avisa cuando no hay nadie dentro", () => {
    pantalla();
    expect(
      screen.getByText("No hay visitantes dentro del condominio"),
    ).toBeTruthy();
  });

  it("muestra a los presentes con su hora de ingreso y condición", () => {
    pantalla([presente]);
    expect(screen.getByText("Pedro Castillo")).toBeTruthy();
    expect(screen.getByText("023456789")).toBeTruthy();
    expect(screen.getByText("A-102")).toBeTruthy();
    expect(screen.getByText("15:30")).toBeTruthy();
    expect(screen.getByText("Sin autorización")).toBeTruthy();
    expect(screen.getByText("Visitantes dentro: 1")).toBeTruthy();
  });

  it("registra la salida", async () => {
    vi.mocked(registrarSalida).mockResolvedValue({ ok: true });
    pantalla([presente]);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Registrar salida de Pedro Castillo",
      }),
    );
    await waitFor(() => expect(registrarSalida).toHaveBeenCalledWith("m1"));
    expect(
      await screen.findByText(/Salida registrada · Pedro Castillo/),
    ).toBeTruthy();
    expect(navigation.refresh).toHaveBeenCalled();
  });
});

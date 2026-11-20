import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { Presentes } from "@/components/visitas/presentes";
import { listarPresentes } from "@/app/actions/visitas";
import {
  errorBuscarPresentes,
  horaConSegundos,
  type Presente,
} from "@/lib/visitas";

vi.mock("@/app/actions/visitas", () => ({ listarPresentes: vi.fn() }));

const marta: Presente = {
  id: "m1",
  visitanteNombre: "Marta Reyes",
  visitanteDocumento: "098765432",
  unidadCodigo: "A-101",
  condicion: "PREAUTORIZADA",
  ingresoAt: "2026-11-08T19:00:00Z",
};
const carlos: Presente = {
  id: "m2",
  visitanteNombre: "Carlos Mejia",
  visitanteDocumento: "011223344",
  unidadCodigo: "A-102",
  condicion: "SIN_AUTORIZACION",
  ingresoAt: "2026-11-08T21:30:00Z",
};
const unidades = [
  { id: "u1", codigo: "A-101" },
  { id: "u2", codigo: "A-102" },
];

const pantalla = (inicial: Presente[] = []) =>
  render(<Presentes inicial={inicial} unidades={unidades} />);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarPresentes).mockResolvedValue({ datos: [], total: 0 });
});

describe("Reglas de la búsqueda de presentes", () => {
  it("acepta el campo vacío", () => expect(errorBuscarPresentes("")).toBe(""));

  it("acepta 50 caracteres", () =>
    expect(errorBuscarPresentes("a".repeat(50))).toBe(""));

  it("rechaza 51 caracteres con el límite de la card", () =>
    expect(errorBuscarPresentes("a".repeat(51))).toBe(
      "La búsqueda admite hasta 50 caracteres",
    ));

  it("muestra la hora con segundos en hora del condominio", () =>
    // 21:30:05 UTC son 15:30:05 en El Salvador.
    expect(horaConSegundos(new Date("2026-11-08T21:30:05Z"))).toBe("15:30:05"));
});

describe("Visitantes presentes", () => {
  it("muestra la tabla con el contador y respeta el orden recibido", () => {
    pantalla([marta, carlos]);
    expect(screen.getByText("Visitantes dentro: 2")).toBeTruthy();

    // Los códigos de unidad también están en el desplegable de filtros, así
    // que las celdas se buscan dentro de la tabla y no en toda la página.
    const tabla = within(screen.getByRole("table"));
    expect(tabla.getByText("098765432")).toBeTruthy();
    expect(tabla.getByText("A-102")).toBeTruthy();
    expect(tabla.getByText("13:00")).toBeTruthy();
    expect(tabla.getByText("15:30")).toBeTruthy();
    expect(tabla.getByText("Preautorizada")).toBeTruthy();
    expect(tabla.getByText("Sin autorización")).toBeTruthy();

    const filas = tabla.getAllByRole("rowheader").map((f) => f.textContent);
    expect(filas).toEqual(["Marta Reyes", "Carlos Mejia"]);
  });

  it("muestra el vacío de la card cuando no hay nadie", () => {
    pantalla();
    expect(
      screen.getByText("No hay visitantes dentro del condominio"),
    ).toBeTruthy();
    expect(screen.getByText("Visitantes dentro: 0")).toBeTruthy();
  });

  // Los datos iniciales ya vienen del servidor: pedirlos otra vez al montar
  // sería una consulta de más.
  it("no consulta al montar, pero sí sella la hora", async () => {
    pantalla([marta]);
    expect(listarPresentes).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Última actualización: \d{2}:\d{2}:\d{2}/),
    ).toBeTruthy();
  });

  it("el botón Actualizar vuelve a consultar", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({
      datos: [marta, carlos],
      total: 2,
    });
    pantalla([marta]);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() =>
      expect(listarPresentes).toHaveBeenCalledWith(undefined, undefined),
    );
    expect(await screen.findByText("Visitantes dentro: 2")).toBeTruthy();
  });

  it("filtra por texto al enviar el formulario", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({ datos: [marta], total: 1 });
    pantalla([marta, carlos]);
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "marta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(listarPresentes).toHaveBeenCalledWith("marta", undefined),
    );
  });

  it("filtra por unidad al elegirla", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({ datos: [carlos], total: 1 });
    pantalla([marta, carlos]);
    fireEvent.change(screen.getByLabelText("Unidad"), {
      target: { value: "u2" },
    });
    await waitFor(() =>
      expect(listarPresentes).toHaveBeenCalledWith(undefined, "u2"),
    );
    expect(await screen.findByText("Visitantes dentro: 1")).toBeTruthy();
  });

  it("no consulta con una búsqueda de más de 50 caracteres", () => {
    pantalla([marta]);
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "a".repeat(51) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(
      screen.getByText("La búsqueda admite hasta 50 caracteres"),
    ).toBeTruthy();
    expect(listarPresentes).not.toHaveBeenCalled();
  });

  // En la puerta es peor quedarse sin lista que mirar datos de hace unos
  // segundos, así que un fallo no borra lo que ya estaba.
  it("ante un error conserva la última lista buena", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({
      error: "No se pudo completar la operación. Intente de nuevo.",
    });
    pantalla([marta]);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(
      await screen.findByText(
        "No se pudo completar la operación. Intente de nuevo.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Marta Reyes")).toBeTruthy();
    expect(screen.getByText("Visitantes dentro: 1")).toBeTruthy();
  });
});

describe("Refresco automático", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("vuelve a consultar cada 10 segundos", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({ datos: [marta], total: 1 });
    pantalla([marta]);
    expect(listarPresentes).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(listarPresentes).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(listarPresentes).toHaveBeenCalledTimes(2);
  });

  it("deja de consultar al desmontar", async () => {
    vi.mocked(listarPresentes).mockResolvedValue({ datos: [marta], total: 1 });
    const { unmount } = pantalla([marta]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(listarPresentes).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(listarPresentes).toHaveBeenCalledTimes(1);
  });
});

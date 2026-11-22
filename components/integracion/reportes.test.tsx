import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Reporte } from "@/components/integracion/reportes";
import { PantallaCompleta } from "@/components/integracion/pantalla-completa";
import { GET as descargarPdf } from "@/app/api/reportes/pdf/route";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";

// H30: criterios de interfaz (AC1 y AC2) de /admin/reportes/compartir. Los de
// backend (AC3 a AC6) están en src/reportes/services/reporte-pdf.entrega.spec.ts
// del backend. La API, la sesión y fetch se simulan.

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const llamarApi = vi.mocked(api);
const sesion = vi.mocked(getSession);

// Misma forma que GET /administracion/reportes, que reutiliza el cálculo de H29.
const reporte = {
  desde: "2026-11-01",
  hasta: "2026-11-20",
  generadoAt: "2026-11-21T00:42:00.000Z",
  generadoPor: "Administración QA",
  criterio: "Estado actual; período en America/El_Salvador.",
  indicadores: [
    {
      clave: "morosidad",
      titulo: "Morosidad",
      valor: 16.7,
      unidad: "%",
      origen: "Cuotas (H4)",
      formula: "Unidades morosas ÷ unidades activas × 100.",
      saldoVencido: "52.50",
    },
    {
      clave: "uso",
      titulo: "Uso de áreas",
      valor: 0.3,
      unidad: "%",
      origen: "Reservas (H5-H7)",
      formula: "Horas reservadas ÷ horas habilitadas × 100.",
    },
    {
      clave: "incidencias",
      titulo: "Incidencias abiertas",
      valor: 4,
      unidad: "",
      origen: "Incidencias (H9-H11)",
      formula: "Creadas en el período que no están Resueltas.",
    },
    {
      clave: "participacion",
      titulo: "Participación en votaciones",
      valor: null,
      unidad: "%",
      origen: "Asambleas (H22)",
      formula: "Promedio por tema cerrado.",
    },
  ],
};

const q = { desde: "2026-11-01", hasta: "2026-11-20" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.API_URL = "http://api.test/api/v1/";
});
afterEach(() => vi.unstubAllGlobals());

describe("H30. Compartir resultados administrativos", () => {
  it("AC1: el administrador elige el período y ve el reporte de solo lectura con los indicadores de H29", async () => {
    llamarApi.mockResolvedValue(reporte);
    render(await Reporte({ q, compartir: true }));
    expect(llamarApi).toHaveBeenCalledWith(
      "administracion/reportes?desde=2026-11-01&hasta=2026-11-20",
    );
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-20");
    const tarjetas = screen.getAllByRole("article");
    expect(tarjetas).toHaveLength(4);
    expect(within(tarjetas[0]).getByText("16.7%")).toBeInTheDocument();
    expect(within(tarjetas[3]).getByText("Sin datos")).toBeInTheDocument();
    // Solo lectura: ningún campo editable de los indicadores.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("AC1: un período inválido muestra el mensaje del servidor y no el reporte", async () => {
    const { ApiError } = await import("@/lib/api");
    llamarApi.mockRejectedValue(
      new ApiError(400, "El rango no puede superar 366 días"),
    );
    render(
      await Reporte({ q: { desde: "2025-01-01", hasta: "2026-11-20" }, compartir: true }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El rango no puede superar 366 días",
    );
    expect(screen.queryByText("Descargar PDF")).not.toBeInTheDocument();
  });

  it("AC2: los botones Presentar en pantalla completa y Descargar PDF están en la parte superior", async () => {
    llamarApi.mockResolvedValue(reporte);
    render(await Reporte({ q, compartir: true }));
    const presentar = screen.getByRole("button", {
      name: "Presentar en pantalla completa",
    });
    const descargar = screen.getByRole("link", { name: "Descargar PDF" });
    const primeraTarjeta = screen.getAllByRole("article")[0];
    // Ambos van antes que el formulario y las tarjetas en el documento.
    for (const boton of [presentar, descargar])
      expect(
        boton.compareDocumentPosition(primeraTarjeta) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    expect(descargar).toHaveAttribute(
      "href",
      "/api/reportes/pdf?desde=2026-11-01&hasta=2026-11-20",
    );
  });

  it("AC2: Presentar en pantalla completa abre la vista a pantalla completa", () => {
    const pedir = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = pedir;
    render(<PantallaCompleta />);
    fireEvent.click(
      screen.getByRole("button", { name: "Presentar en pantalla completa" }),
    );
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it("AC2: Descargar PDF entrega el archivo reporte_AAAA-MM-DD_AAAA-MM-DD.pdf", async () => {
    sesion.mockResolvedValue("token-de-prueba");
    const fetchSimulado = vi
      .fn()
      .mockResolvedValue(new Response("%PDF-1.3 contenido", { status: 200 }));
    vi.stubGlobal("fetch", fetchSimulado);
    const r = await descargarPdf(
      new Request(
        "http://localhost/api/reportes/pdf?desde=2026-11-01&hasta=2026-11-20",
      ),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reporte_2026-11-01_2026-11-20.pdf"',
    );
    expect(String(fetchSimulado.mock.calls[0][0])).toBe(
      "http://api.test/api/v1/reportes/administrativos/pdf?desde=2026-11-01&hasta=2026-11-20",
    );
  });

  it("AC2: sin sesión o con período mal escrito no descarga nada", async () => {
    sesion.mockResolvedValue(undefined as never);
    const sinSesion = await descargarPdf(
      new Request("http://localhost/api/reportes/pdf?desde=2026-11-01&hasta=2026-11-20"),
    );
    expect(sinSesion.status).toBe(401);
    sesion.mockResolvedValue("token-de-prueba");
    const malFormato = await descargarPdf(
      new Request("http://localhost/api/reportes/pdf?desde=01/11/2026&hasta=2026-11-20"),
    );
    expect(malFormato.status).toBe(400);
  });
});

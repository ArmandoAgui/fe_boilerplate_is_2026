import { describe, expect, it } from "vitest";
import {
  crearQueryAvisos,
  crearUrlAvisos,
  esEstadoAviso,
  esModuloAviso,
  formatearFechaAviso,
  rutaDestinoAviso,
  type Aviso,
} from "@/lib/notificaciones";

const avisoBase: Aviso = {
  id: "c9f9a0a1-1111-4111-8111-000000000001",
  moduloOrigen: "PAQUETERIA",
  tipoEvento: "PAQUETE_RECIBIDO",
  titulo: "Llegó un paquete",
  mensaje: "PAQ-27 recibido.",
  referenciaId: null,
  estado: "NO_LEIDA",
  creadaAt: "2026-11-14T16:25:00.000Z",
};

describe("contrato de avisos H27", () => {
  it("construye los filtros combinados y usa 20 por página", () => {
    expect(
      crearQueryAvisos({ moduloOrigen: "PAQUETERIA", estado: "NO_LEIDA", pagina: 3 }).toString(),
    ).toBe("moduloOrigen=PAQUETERIA&estado=NO_LEIDA&pagina=3&tamanoPagina=20");
  });

  it("mantiene limpia la URL omitiendo valores por defecto", () => {
    expect(
      crearUrlAvisos({ moduloOrigen: "", estado: "", pagina: 1 }).toString(),
    ).toBe("");
    expect(
      crearUrlAvisos({ moduloOrigen: "CUOTAS", estado: "LEIDA", pagina: 2 }).toString(),
    ).toBe("moduloOrigen=CUOTAS&estado=LEIDA&pagina=2");
  });

  it("reconoce solo los módulos y estados del contrato", () => {
    expect(esModuloAviso("INCIDENCIAS")).toBe(true);
    expect(esModuloAviso("ADMIN")).toBe(false);
    expect(esEstadoAviso("LEIDA")).toBe(true);
    expect(esEstadoAviso("PENDIENTE")).toBe(false);
  });

  it("formatea hora local, minutos recientes y fechas anteriores en El Salvador", () => {
    const ahora = new Date("2026-11-14T16:30:00.000Z");
    expect(formatearFechaAviso("2026-11-14T16:25:00.000Z", ahora)).toBe("Hace 5 min");
    expect(formatearFechaAviso("2026-11-14T15:00:00.000Z", ahora)).toBe("Hoy 09:00");
    expect(formatearFechaAviso("2026-11-13T16:00:00.000Z", ahora)).toBe("Ayer 10:00");
    expect(formatearFechaAviso("2026-11-12T16:00:00.000Z", ahora)).toBe("12/11/2026");
  });

  it("apunta a los módulos existentes y deja H12/H24 como lectura sin navegación", () => {
    expect(rutaDestinoAviso(avisoBase)).toEqual({ href: "/paquetes", etiqueta: "Ver paquete" });
    expect(rutaDestinoAviso({ ...avisoBase, tipoEvento: "CUOTA_POR_VENCER" } )?.href).toBe("/cuotas");
    expect(rutaDestinoAviso({ ...avisoBase, tipoEvento: "VOTACION_ABIERTA" } )?.href).toBe("/asambleas");
    expect(rutaDestinoAviso({ ...avisoBase, tipoEvento: "COMUNICADO_NUEVO" })).toBeNull();
    expect(rutaDestinoAviso({ ...avisoBase, tipoEvento: "INCIDENCIA_RESUELTA" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  categoriaIncidencia,
  crearQueryIncidenciasMias,
  crearQueryRetornoIncidencias,
  esEstadoSeguimiento,
  fechaHoraSeguimiento,
  idValidoIncidencia,
  nombreActor,
  normalizarPagina,
} from "@/lib/incidencias-seguimiento";

describe("contrato de seguimiento de incidencias H12", () => {
  it("usa páginas de 20 y construye el listado con filtros permitidos", () => {
    expect(crearQueryIncidenciasMias(2, "EN_PROCESO").toString()).toBe(
      "pagina=2&tamanoPagina=20&estado=EN_PROCESO",
    );
    expect(crearQueryIncidenciasMias(1).toString()).toBe(
      "pagina=1&tamanoPagina=20",
    );
    expect(crearQueryRetornoIncidencias("RESUELTA", 3).toString()).toBe(
      "estado=RESUELTA&pagina=3",
    );
    expect(crearQueryRetornoIncidencias(undefined, 1).toString()).toBe("");
  });

  it("normaliza estados y páginas inválidas antes de llamar al backend", () => {
    expect(esEstadoSeguimiento("ABIERTA")).toBe(true);
    expect(esEstadoSeguimiento("EN_PROCESO")).toBe(true);
    expect(esEstadoSeguimiento("PENDIENTE")).toBe(false);
    expect(normalizarPagina(undefined)).toBe(1);
    expect(normalizarPagina("0")).toBe(1);
    expect(normalizarPagina("1.5")).toBe(1);
    expect(normalizarPagina("9007199254740991")).toBe(1);
    expect(normalizarPagina("4")).toBe(4);
  });

  it("presenta categorías, nombres y fechas sin exponer identificadores", () => {
    expect(categoriaIncidencia("FUGA")).toBe("Fuga");
    expect(categoriaIncidencia("OTRA_CATEGORIA")).toBe("otra categoria");
    expect(nombreActor({ id: "uuid", nombre: "Rosa Martínez" })).toBe(
      "Rosa Martínez",
    );
    expect(nombreActor(null)).toBeNull();
    expect(idValidoIncidencia("f9e40d22-b0e3-46fb-8bed-412da001d48d")).toBe(
      true,
    );
    expect(idValidoIncidencia("invalido")).toBe(false);
    expect(fechaHoraSeguimiento("2026-11-03T14:14:00.000Z")).toBe(
      "03/11/2026, 08:14",
    );
    expect(fechaHoraSeguimiento("no-es-fecha")).toBe("Fecha no disponible");
  });
});

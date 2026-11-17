import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, usuarioActual } from "@/lib/api";
import { actualizarEstadoIncidencia } from "@/app/actions/incidencias-admin";

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public campo?: string,
    ) {
      super(message);
    }
  },
  api: vi.fn(),
  usuarioActual: vi.fn(),
}));

const incidenciaId = "a71ddc0a-23d9-4ff2-9211-8d40a090adee";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioActual).mockResolvedValue({
    id: "admin-id",
    email: "admin@condominio.test",
    nombre: "Carlos Alvarado",
    rol: "ADMINISTRADOR",
  });
});

describe("acción H11 de actualización de estado", () => {
  it("autoriza al administrador y envía solo el estado al backend", async () => {
    const respuesta = {
      id: incidenciaId,
      estado: "EN_PROCESO" as const,
      actualizadaAt: "2026-11-03T14:14:00.000Z",
    };
    vi.mocked(api).mockResolvedValue(respuesta);

    const resultado = await actualizarEstadoIncidencia(
      incidenciaId,
      "EN_PROCESO",
    );

    expect(resultado.datos).toEqual(respuesta);
    expect(api).toHaveBeenCalledWith(`incidencias/${incidenciaId}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "EN_PROCESO" }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/incidencias");
  });

  it("rechaza transiciones fuera del contrato y roles no administrativos", async () => {
    const estadoInvalido = await actualizarEstadoIncidencia(
      incidenciaId,
      "ABIERTA",
    );
    expect(estadoInvalido.status).toBe(400);
    expect(api).not.toHaveBeenCalled();

    vi.mocked(usuarioActual).mockResolvedValue({
      id: "residente-id",
      email: "residente@condominio.test",
      nombre: "Rosa Martínez",
      rol: "RESIDENTE",
    });
    const sinPermiso = await actualizarEstadoIncidencia(
      incidenciaId,
      "RESUELTA",
    );
    expect(sinPermiso.status).toBe(403);
    expect(api).not.toHaveBeenCalled();
  });

  it("verifica el estado persistido si el backend falla después de actualizar", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new ApiError(500, "Aviso H28 no confirmado"))
      .mockResolvedValueOnce({ estado: "RESUELTA" });

    const resultado = await actualizarEstadoIncidencia(
      incidenciaId,
      "RESUELTA",
    );

    expect(resultado.status).toBe(500);
    expect(resultado.estadoActual).toBe("RESUELTA");
    expect(resultado.estadoVerificado).toBe(true);
    expect(api).toHaveBeenNthCalledWith(2, `incidencias/${incidenciaId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/incidencias");
  });
});

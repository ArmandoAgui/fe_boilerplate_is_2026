import { ApiError, api } from "@/lib/api";
import { UUID_AVISO } from "@/lib/notificaciones";
import type { Usuario } from "@/lib/reservas";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_AVISO.test(id)) {
    try {
      const usuario = await api<Usuario>("auth/me", undefined, {
        onUnauthorized: "throw",
      });
      if (usuario.rol !== "RESIDENTE")
        return json({ message: "No tienes permiso para consultar avisos." }, 403);
    } catch (error) {
      return json(
        {
          message:
            error instanceof ApiError && error.status === 401
              ? "La sesión expiró. Inicia sesión de nuevo."
              : "No se pudo conectar con el servicio de avisos.",
        },
        error instanceof ApiError ? error.status : 502,
      );
    }
    return json({ message: "El aviso ya no está disponible." }, 404);
  }

  try {
    const resultado = await api<{ id: string; estado: "LEIDA"; leidaAt: string }>(
      `notificaciones/${encodeURIComponent(id)}/lectura`,
      { method: "PATCH", body: undefined },
      { onUnauthorized: "throw" },
    );
    return json(resultado);
  } catch (error) {
    if (error instanceof ApiError)
      return json(
        {
          message:
            error.status === 401
              ? "La sesión expiró. Inicia sesión de nuevo."
              : error.status === 403
                ? "No tienes permiso para consultar avisos."
                : error.status === 404
                  ? "El aviso ya no está disponible."
                  : "No se pudo marcar el aviso como leído.",
        },
        error.status,
      );
    return json({ message: "No se pudo conectar con el servicio de avisos." }, 502);
  }
}

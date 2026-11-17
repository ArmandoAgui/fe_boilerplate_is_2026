import { ApiError, api } from "@/lib/api";
import { esUuid } from "@/lib/incidencias-admin";
import { getSession } from "@/lib/session";
import type { Usuario } from "@/lib/reservas";

function respuestaError(status: number, message: string) {
  return Response.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; evidenciaId: string }> },
) {
  const { id, evidenciaId } = await context.params;
  if (!esUuid(id) || !esUuid(evidenciaId))
    return respuestaError(400, "La evidencia solicitada no es válida.");

  const token = await getSession();
  if (!token) return respuestaError(401, "La sesión no está disponible.");

  try {
    const usuario = await api<Usuario>("auth/me", undefined, {
      onUnauthorized: "throw",
    });
    if (usuario.rol !== "ADMINISTRADOR")
      return respuestaError(403, "No tienes permiso para consultar esta evidencia.");

    const base = process.env.API_URL;
    if (!base) return respuestaError(500, "No se pudo consultar la evidencia.");

    const upstream = await fetch(
      new URL(
        `incidencias/${id}/evidencias/${evidenciaId}`,
        base.replace(/\/?$/, "/"),
      ),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!upstream.ok)
      return respuestaError(
        upstream.status >= 400 && upstream.status < 500
          ? upstream.status
          : 502,
        "No se pudo consultar la evidencia.",
      );

    const contentType = upstream.headers.get("content-type")?.split(";")[0];
    if (contentType !== "image/jpeg" && contentType !== "image/png")
      return respuestaError(502, "El formato de la evidencia no es válido.");

    return new Response(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiError)
      return respuestaError(
        error.status === 401 ? 401 : error.status === 403 ? 403 : 502,
        error.status === 401
          ? "La sesión expiró. Inicia sesión de nuevo."
          : "No se pudo consultar la evidencia.",
      );
    return respuestaError(502, "No se pudo conectar con el servicio de incidencias.");
  }
}

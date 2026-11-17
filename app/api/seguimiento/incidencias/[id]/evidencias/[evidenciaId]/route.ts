import { getSession } from "@/lib/session";
import { esUuid } from "@/lib/incidencias-admin";

const headersPrivados = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function errorFoto(status: number) {
  return Response.json(
    { message: status === 404 ? "Foto no disponible." : "No se pudo cargar la foto." },
    { status, headers: headersPrivados },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; evidenciaId: string }> },
) {
  const { id, evidenciaId } = await params;
  if (!esUuid(id) || !esUuid(evidenciaId)) return errorFoto(404);

  const token = await getSession();
  if (!token) return errorFoto(401);
  const base = process.env.API_URL;
  if (!base) return errorFoto(503);

  let destino: URL;
  try {
    destino = new URL(
      "incidencias/" +
        encodeURIComponent(id) +
        "/evidencias/" +
        encodeURIComponent(evidenciaId),
      base.replace(/\/?$/, "/"),
    );
  } catch {
    return errorFoto(503);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(destino, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return errorFoto(502);
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401) return errorFoto(401);
    if (respuesta.status === 403 || respuesta.status === 404) return errorFoto(404);
    return errorFoto(502);
  }
  const mime = respuesta.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mime !== "image/jpeg" && mime !== "image/png") return errorFoto(502);

  return new Response(respuesta.body, {
    status: 200,
    headers: {
      ...headersPrivados,
      "Content-Type": mime,
      "Content-Disposition": "inline",
    },
  });
}

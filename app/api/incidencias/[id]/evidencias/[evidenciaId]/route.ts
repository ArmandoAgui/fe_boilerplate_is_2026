import { getSession } from "@/lib/session";
import { esUuid } from "@/lib/incidencias-admin";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; evidenciaId: string }> },
) {
  const token = await getSession();
  if (!token) return new Response("Sesión requerida", { status: 401 });
  const { id, evidenciaId } = await params;
  if (!esUuid(id) || !esUuid(evidenciaId))
    return new Response("No encontrada", { status: 404 });
  const base = process.env.API_URL;
  if (!base) return new Response("Servicio no disponible", { status: 503 });
  const r = await fetch(
    new URL(
      `incidencias/${id}/evidencias/${evidenciaId}`,
      base.replace(/\/?$/, "/"),
    ),
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!r.ok)
    return new Response("No se pudo consultar la fotografía", {
      status: r.status,
    });
  return new Response(r.body, {
    headers: {
      "Content-Type":
        r.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

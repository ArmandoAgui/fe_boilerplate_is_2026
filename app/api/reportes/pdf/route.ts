import { getSession } from "@/lib/session";
export async function GET(req: Request) {
  const token = await getSession();
  if (!token) return new Response("Sesión requerida", { status: 401 });
  const q = new URL(req.url).searchParams,
    desde = q.get("desde") ?? "",
    hasta = q.get("hasta") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta))
    return new Response("Período inválido", { status: 400 });
  const base = process.env.API_URL;
  if (!base) return new Response("Servicio no disponible", { status: 503 });
  const r = await fetch(
    new URL(
      `administracion/reportes/pdf?${new URLSearchParams({ desde, hasta })}`,
      base.replace(/\/?$/, "/"),
    ),
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!r.ok)
    return new Response("No se pudo descargar el reporte", {
      status: r.status,
    });
  return new Response(r.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_${desde}_${hasta}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

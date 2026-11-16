// Liveness público: no expone versión, sesión ni configuración.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

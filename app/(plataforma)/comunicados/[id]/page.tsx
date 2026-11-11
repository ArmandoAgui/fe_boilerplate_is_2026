import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import { SinPermiso } from "@/components/reservas/ui";
import { ContenidoComunicado } from "@/components/comunicados/mis-comunicados";
import type { DetalleComunicado } from "@/lib/comunicados";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if ((await usuarioActual()).rol !== "RESIDENTE") return <SinPermiso />;
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  let comunicado: DetalleComunicado;
  try {
    comunicado = await api<DetalleComunicado>(
      `comunicados/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <>
      <p className="mb-5">
        <Link href="/comunicados">Volver a comunicados</Link>
      </p>
      <ContenidoComunicado comunicado={comunicado} />
    </>
  );
}

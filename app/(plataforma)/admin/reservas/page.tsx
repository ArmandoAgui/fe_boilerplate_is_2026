import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { AprobarReservas } from "@/components/reservas/aprobar-reservas";
import type { ListaReservas } from "@/lib/reservas";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;
  const pagina = Number((await searchParams).pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida.{" "}
        <Link href="/admin/reservas">Volver a solicitudes</Link>
      </p>
    );
  const lista = await api<ListaReservas>(
    `reservas/pendientes?pagina=${pagina}&tamanoPagina=20`,
  );
  return (
    <>
      <Titulo
        titulo="Aprobar reservas"
        detalle="Las solicitudes pendientes no apartan el horario. Al aprobar se comprueban disponibilidad, capacidad y cupo del residente."
      />
      <AprobarReservas lista={lista} />
    </>
  );
}

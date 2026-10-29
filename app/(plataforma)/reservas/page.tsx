import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { Titulo, SinPermiso } from "@/components/reservas/ui";
import { MisReservas } from "@/components/reservas/mis-reservas";
import type { ListaReservas } from "@/lib/reservas";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; confirmada?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const query = await searchParams;
  const pagina = Number(query.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida. <Link href="/reservas">Volver a mis reservas</Link>
      </p>
    );
  const lista = await api<ListaReservas>(
    `reservas/mias?pagina=${pagina}&tamanoPagina=20`,
  );
  return (
    <>
      <Titulo
        titulo="Mis reservas"
        detalle="Reservas de tus unidades, ordenadas por fecha de inicio. Puedes cancelar hasta dos horas antes."
      />
      <MisReservas lista={lista} confirmada={query.confirmada} />
    </>
  );
}

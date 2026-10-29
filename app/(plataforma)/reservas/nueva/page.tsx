import { api, usuarioActual } from "@/lib/api";
import { Titulo, SinPermiso } from "@/components/reservas/ui";
import { NuevaReserva } from "@/components/reservas/nueva-reserva";
import { hoyLocal, type Area } from "@/lib/reservas";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ areaId?: string; fecha?: string; hora?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const { datos } = await api<{ datos: Area[] }>("areas");
  return (
    <>
      <Titulo
        titulo="Nueva reserva"
        detalle="Elige tu espacio, horario y unidad. Te confirmaremos la disponibilidad al reservar."
      />
      <NuevaReserva
        areas={datos.filter((a) => a.activa)}
        hoy={hoyLocal()}
        inicial={await searchParams}
      />
    </>
  );
}

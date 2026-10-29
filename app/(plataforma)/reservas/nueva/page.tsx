import { redirect } from "next/navigation";
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
  const seleccion = await searchParams;
  if (!seleccion.areaId || !seleccion.fecha || !seleccion.hora)
    redirect("/areas");
  const { datos } = await api<{ datos: Area[] }>("areas");
  return (
    <>
      <Titulo
        titulo="Nueva reserva"
        detalle="Revisa el horario que elegiste y completa los detalles para confirmar tu reserva."
      />
      <NuevaReserva
        areas={datos.filter((a) => a.activa)}
        hoy={hoyLocal()}
        inicial={seleccion}
      />
    </>
  );
}

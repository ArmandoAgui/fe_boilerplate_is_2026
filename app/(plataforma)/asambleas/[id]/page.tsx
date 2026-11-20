import { notFound } from "next/navigation";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso } from "@/components/reservas/ui";
import { ListaAsambleas } from "@/components/asambleas/lista-asambleas";
import type { Asamblea, Unidad } from "@/lib/asambleas";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await usuarioActual();
  if (user.rol !== "RESIDENTE" && user.rol !== "ADMINISTRADOR")
    return <SinPermiso />;
  const { id } = await params;
  const a = (await api<Asamblea[]>("asambleas")).find((a) => a.id === id);
  if (!a) notFound();
  const unidades =
    user.rol === "RESIDENTE"
      ? (await api<{ datos: Unidad[] }>("unidades/mias")).datos
      : [];
  return <ListaAsambleas asambleas={[a]} unidades={unidades} rol={user.rol} />;
}

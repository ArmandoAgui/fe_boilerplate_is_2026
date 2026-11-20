import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { NuevoComunicado } from "@/components/comunicados/nuevo-comunicado";
import type { Torre } from "@/lib/comunicados";
export default async function Page() {
  if ((await usuarioActual()).rol !== "ADMINISTRADOR") return <SinPermiso />;
  const { datos } = await api<{ datos: Torre[] }>("torres");
  return (
    <>
      <Titulo
        titulo="Nuevo comunicado"
        detalle="Publica un aviso oficial para todos los residentes, una torre o una sección."
      />
      <p className="mb-5">
        <Link href="/admin/comunicados">Ver comunicados publicados</Link>
      </p>
      <NuevoComunicado torres={datos} />
    </>
  );
}

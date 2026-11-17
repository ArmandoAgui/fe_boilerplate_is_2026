import { usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { Reporte } from "@/components/integracion/reportes";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  if ((await usuarioActual()).rol !== "ADMINISTRADOR") return <SinPermiso />;
  return (
    <>
      <Titulo
        titulo="Compartir reporte"
        detalle="Vista de solo lectura para presentar o descargar."
      />
      <Reporte q={await searchParams} compartir />
    </>
  );
}

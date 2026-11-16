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
        titulo="Indicadores del condominio"
        detalle="Consulta resultados generales de cuotas, reservas, incidencias y votaciones."
      />
      <Reporte q={await searchParams} />
    </>
  );
}

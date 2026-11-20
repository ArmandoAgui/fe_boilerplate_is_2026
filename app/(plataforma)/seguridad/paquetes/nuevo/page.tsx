import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, TituloPaquetes } from "@/components/paquetes/ui";
import { NuevoPaquete } from "@/components/paquetes/nuevo-paquete";
import type { UnidadOpcion } from "@/lib/paquetes";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "SEGURIDAD") return <SinPermiso />;
  const unidades = await api<{ datos: UnidadOpcion[] }>("unidades");
  return (
    <>
      <TituloPaquetes
        titulo="Recepción de paquetes"
        detalle="Registra la llegada de un paquete para una unidad."
      />
      <NuevoPaquete unidades={unidades.datos} />
    </>
  );
}

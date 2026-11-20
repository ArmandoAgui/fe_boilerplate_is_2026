import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, TituloVisitas } from "@/components/visitas/ui";
import { Accesos } from "@/components/visitas/accesos";
import type { Presente, UnidadOpcion } from "@/lib/visitas";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "SEGURIDAD") return <SinPermiso />;
  // Las dos consultas son independientes, así que no tiene sentido encadenarlas
  // y hacer esperar a quien está en la puerta.
  const [presentes, unidades] = await Promise.all([
    api<{ datos: Presente[]; total: number }>("visitas/presentes"),
    api<{ datos: UnidadOpcion[] }>("visitas/unidades"),
  ]);
  return (
    <>
      <TituloVisitas
        titulo="Control de accesos"
        detalle="Registra la entrada y la salida de cualquier visitante, autorizado o no."
      />
      <Accesos presentes={presentes.datos} unidades={unidades.datos} />
    </>
  );
}

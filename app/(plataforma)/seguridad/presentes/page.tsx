import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, TituloVisitas } from "@/components/visitas/ui";
import { Presentes } from "@/components/visitas/presentes";
import type { Presente, UnidadOpcion } from "@/lib/visitas";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "SEGURIDAD" && usuario.rol !== "ADMINISTRADOR")
    return <SinPermiso />;
  const [presentes, unidades] = await Promise.all([
    api<{ datos: Presente[]; total: number }>("visitas/presentes"),
    api<{ datos: UnidadOpcion[] }>("visitas/unidades"),
  ]);
  return (
    <>
      <TituloVisitas
        titulo="Visitantes presentes"
        detalle="Quiénes se encuentran dentro del condominio en este momento."
      />
      <Presentes inicial={presentes.datos} unidades={unidades.datos} />
    </>
  );
}

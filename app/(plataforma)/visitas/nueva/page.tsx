import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, TituloVisitas } from "@/components/visitas/ui";
import { NuevaVisita } from "@/components/visitas/nueva-visita";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const { datos } = await api<{ datos: { id: string; codigo: string }[] }>(
    "unidades/mias",
  );
  return (
    <>
      <TituloVisitas
        titulo="Autorizar visita"
        detalle="Registra a tu visitante antes de que llegue para agilizar su ingreso."
      />
      <NuevaVisita unidades={datos} />
    </>
  );
}

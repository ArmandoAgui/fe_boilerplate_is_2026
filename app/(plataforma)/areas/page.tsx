import { api, usuarioActual } from "@/lib/api";
import { Catalogo, SinPermiso, Titulo } from "@/components/reservas/ui";
import type { Area } from "@/lib/reservas";
export default async function AreasPage() {
  const user = await usuarioActual();
  if (user.rol === "SEGURIDAD") return <SinPermiso />;
  const { datos } = await api<{ datos: Area[] }>("areas");
  return (
    <>
      <Titulo
        titulo="Áreas comunes"
        detalle="Encuentra el espacio ideal. Consulta disponibilidad hasta 30 días de anticipación."
      />
      <Catalogo areas={datos.filter((a) => a.activa)} />
    </>
  );
}

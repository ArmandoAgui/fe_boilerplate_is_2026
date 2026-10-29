import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { AdminAreas } from "@/components/reservas/admin-areas";
import type { Area } from "@/lib/reservas";
export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;
  const { datos } = await api<{ datos: Area[] }>("areas");
  return (
    <>
      <Titulo
        titulo="Administrar áreas"
        detalle="Configura espacios, capacidades y horarios. Los cambios se aplican a nuevas reservas."
      />
      <AdminAreas areas={datos} />
    </>
  );
}

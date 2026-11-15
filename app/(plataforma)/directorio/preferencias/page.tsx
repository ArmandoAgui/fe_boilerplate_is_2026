import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { PreferenciasDirectorio } from "@/components/directorio/preferencias";
import type { Preferencias } from "@/lib/directorio";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const [preferencias, unidades] = await Promise.all([
    api<Preferencias>("directorio/mis-preferencias"),
    api<{ datos: { id: string; codigo: string }[] }>("unidades/mias"),
  ]);
  return (
    <>
      <Titulo
        titulo="Mi privacidad del directorio"
        detalle="Decide si apareces en el directorio y qué datos compartes."
      />
      <PreferenciasDirectorio
        inicial={preferencias}
        nombre={usuario.nombre}
        correo={usuario.email}
        unidades={unidades.datos.map((u) => u.codigo)}
      />
    </>
  );
}

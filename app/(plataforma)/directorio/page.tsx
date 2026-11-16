import { usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { BuscadorDirectorio } from "@/components/directorio/buscador";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  return (
    <>
      <Titulo
        titulo="Directorio"
        detalle="Busca el contacto de un vecino por nombre, unidad o torre."
      />
      <BuscadorDirectorio />
    </>
  );
}

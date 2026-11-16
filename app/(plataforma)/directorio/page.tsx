import { usuarioActual } from "@/lib/api";
import { Titulo } from "@/components/reservas/ui";
import { BuscadorDirectorio } from "@/components/directorio/buscador";

export default async function Page() {
  await usuarioActual();
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

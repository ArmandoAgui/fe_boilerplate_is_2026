import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { Vinculos } from "@/components/integracion/administracion";
export default async function Page() {
  if ((await usuarioActual()).rol !== "ADMINISTRADOR") return <SinPermiso />;
  const datos = await api<Parameters<typeof Vinculos>[0]>(
    "administracion/vinculos",
  );
  return (
    <>
      <Titulo
        titulo="Residentes y unidades"
        detalle="El administrador controla el registro y las asociaciones del condominio."
      />
      <Vinculos {...datos} />
    </>
  );
}

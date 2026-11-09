import { api, usuarioActual } from "@/lib/api";
import { GenerarCuotas } from "@/components/cuotas/generar-cuotas";
import { SinPermiso, TituloCuotas } from "@/components/cuotas/ui";
import { mesLocal, mesSiguiente, type PreviaGeneracion } from "@/lib/cuotas";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;
  const actual = mesLocal();
  const previa = await api<PreviaGeneracion>(
    `cuotas/generaciones/previa?periodo=${actual}`,
  );
  return (
    <>
      <TituloCuotas
        titulo="Generar cuotas"
        detalle="Crea en un paso las cuotas del período para todas las unidades activas."
      />
      <GenerarCuotas
        previaInicial={previa}
        mesActual={actual}
        mesSiguiente={mesSiguiente(actual)}
      />
    </>
  );
}

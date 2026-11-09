import { api, usuarioActual } from "@/lib/api";
import { Morosidad } from "@/components/cuotas/morosidad";
import { SinPermiso, TituloCuotas } from "@/components/cuotas/ui";
import type { FilaMorosidad, ListaMorosidad } from "@/lib/cuotas";

// Máximo que acepta el backend por página.
const TAMANO = 50;

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;

  // Se traen todas las unidades morosas para filtrar por torre en la
  // pantalla: aún no existe un endpoint que liste las torres con su id
  // (GET /torres pertenece a H23). Un condominio tiene pocas unidades, así
  // que son una o dos consultas.
  const filas: FilaMorosidad[] = [];
  for (let pagina = 1; ; pagina++) {
    const lista = await api<ListaMorosidad>(
      `administracion/morosidad?pagina=${pagina}&tamanoPagina=${TAMANO}`,
    );
    filas.push(...lista.datos);
    if (filas.length >= lista.total || lista.datos.length === 0) break;
  }

  return (
    <>
      <TituloCuotas
        titulo="Morosidad"
        detalle="Unidades con al menos una cuota vencida, de la más antigua a la más reciente."
      />
      <Morosidad filas={filas} />
    </>
  );
}

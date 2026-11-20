import Link from "next/link";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  EstadoDeCuenta,
  type FiltrosCuotas,
} from "@/components/cuotas/estado-de-cuenta";
import { SinPermiso, TituloCuotas } from "@/components/cuotas/ui";
import { ESTADOS_CUOTA, type EstadoCuota, type ListaCuotas } from "@/lib/cuotas";

type Unidad = { id: string; codigo: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    unidadId?: string;
    periodo?: string;
    estado?: string;
    pagina?: string;
  }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const query = await searchParams;

  const { datos } = await api<{ datos: Unidad[] }>("unidades/mias");
  const unidades = [...datos].sort((a, b) => a.codigo.localeCompare(b.codigo));
  const titulo = (
    <TituloCuotas
      titulo="Estado de cuenta"
      detalle="Revisa tus cuotas de mantenimiento y lo que tienes pendiente."
    />
  );
  if (unidades.length === 0)
    return (
      <>
        {titulo}
        <p className="panel">No tienes unidades vinculadas.</p>
      </>
    );

  // Si la URL trae una unidad que no es del residente, se usa la primera suya.
  const unidadId = unidades.some((u) => u.id === query.unidadId)
    ? query.unidadId!
    : unidades[0].id;
  const estado = ESTADOS_CUOTA.includes(query.estado as EstadoCuota)
    ? (query.estado as EstadoCuota)
    : "";
  const filtros: FiltrosCuotas = {
    unidadId,
    periodo: query.periodo ?? "",
    estado,
  };
  const pagina = Number(query.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida. <Link href="/cuotas">Volver al estado de cuenta</Link>
      </p>
    );

  const params = new URLSearchParams({
    unidadId,
    pagina: String(pagina),
    tamanoPagina: "20",
  });
  if (filtros.periodo) params.set("periodo", filtros.periodo);
  if (filtros.estado) params.set("estado", filtros.estado);

  let lista: ListaCuotas;
  try {
    lista = await api<ListaCuotas>(`cuotas/mis-cuotas?${params.toString()}`);
  } catch (error) {
    // 400: período con formato inválido escrito a mano en la URL.
    if (error instanceof ApiError && error.status === 400)
      return (
        <>
          {titulo}
          <p role="alert" className="panel field-error">
            {error.message}. <Link href="/cuotas">Quitar filtros</Link>
          </p>
        </>
      );
    throw error;
  }

  return (
    <>
      {titulo}
      <EstadoDeCuenta unidades={unidades} filtros={filtros} lista={lista} />
    </>
  );
}

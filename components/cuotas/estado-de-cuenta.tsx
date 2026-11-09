"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoCuotaBadge } from "@/components/cuotas/ui";
import {
  ESTADOS_CUOTA,
  dinero,
  etiquetaEstadoCuota,
  fechaCorta,
  type EstadoCuota,
  type ListaCuotas,
} from "@/lib/cuotas";

type Unidad = { id: string; codigo: string };

export type FiltrosCuotas = {
  unidadId: string;
  periodo: string;
  estado: "" | EstadoCuota;
};

/** Construye la URL de la pantalla con los filtros, sin parámetros vacíos. */
export function urlCuotas(filtros: FiltrosCuotas, pagina = 1): string {
  const params = new URLSearchParams();
  params.set("unidadId", filtros.unidadId);
  if (filtros.periodo) params.set("periodo", filtros.periodo);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (pagina > 1) params.set("pagina", String(pagina));
  return `/cuotas?${params.toString()}`;
}

export function EstadoDeCuenta({
  unidades,
  filtros,
  lista,
}: {
  unidades: Unidad[];
  filtros: FiltrosCuotas;
  lista: ListaCuotas;
}) {
  const router = useRouter();
  const unidad = unidades.find((u) => u.id === filtros.unidadId);
  const paginas = Math.max(1, Math.ceil(lista.total / lista.tamanoPagina));
  const vencidas = lista.datos.filter((c) => c.estado === "VENCIDA").length;

  // Cambiar un filtro vuelve a consultar: la página de servidor lee la URL.
  function filtrar(cambio: Partial<FiltrosCuotas>) {
    router.push(urlCuotas({ ...filtros, ...cambio }));
  }

  return (
    <>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="panel flex flex-wrap items-start gap-4">
          {unidades.length > 1 && (
            <div className="text-sm">
              <label htmlFor="unidad" className="block font-medium">
                Unidad
              </label>
              <select
                id="unidad"
                className="field mt-1"
                value={filtros.unidadId}
                onChange={(e) => filtrar({ unidadId: e.target.value })}
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Tienes {unidades.length} unidades
              </p>
            </div>
          )}
          <div className="text-sm">
            <label htmlFor="periodo" className="block font-medium">
              Período
            </label>
            <input
              id="periodo"
              type="month"
              className="field mt-1"
              value={filtros.periodo}
              onChange={(e) => filtrar({ periodo: e.target.value })}
            />
          </div>
          <div className="text-sm">
            <label htmlFor="estado" className="block font-medium">
              Estado
            </label>
            <select
              id="estado"
              className="field mt-1"
              value={filtros.estado}
              onChange={(e) =>
                filtrar({ estado: e.target.value as FiltrosCuotas["estado"] })
              }
            >
              <option value="">Todos</option>
              {ESTADOS_CUOTA.map((e) => (
                <option key={e} value={e}>
                  {etiquetaEstadoCuota[e]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section
          className="panel border-l-4"
          style={{ borderLeftColor: "#d97706" }}
          aria-label="Total pendiente"
        >
          <p className="text-sm text-muted">
            Total pendiente{unidad ? `, unidad ${unidad.codigo}` : ""}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {dinero(lista.totalPendiente)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Incluye cuotas pendientes y vencidas de la unidad
          </p>
        </section>
      </div>

      {lista.datos.length === 0 ? (
        <p className="panel">No tienes cuotas registradas para esta unidad</p>
      ) : (
        <div className="panel p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Cuotas de la unidad {unidad?.codigo}
                {vencidas ? `, ${vencidas} vencidas` : ""}
              </caption>
              <thead>
                <tr className="border-b border-line">
                  {["Concepto", "Período", "Monto", "Vencimiento", "Estado", ""].map(
                    (t, i) => (
                      <th
                        key={t || i}
                        scope="col"
                        className={`p-4 font-medium${t === "Monto" ? " text-right" : ""}`}
                      >
                        {t || <span className="sr-only">Acciones</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 font-normal">
                      {c.concepto}
                    </th>
                    <td className="p-4">{c.periodo}</td>
                    <td className="p-4 text-right tabular-nums">
                      {dinero(c.monto)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {fechaCorta(c.fechaVencimiento)}
                    </td>
                    <td className="p-4">
                      <EstadoCuotaBadge estado={c.estado} />
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        className="underline"
                        href={`/cuotas/${c.id}`}
                        aria-label={`Ver detalle de la cuota ${c.periodo}`}
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 p-4">
            {paginas > 1 && (
              <>
                <button
                  className="button-secondary"
                  disabled={lista.pagina <= 1}
                  onClick={() => router.push(urlCuotas(filtros, lista.pagina - 1))}
                >
                  Anterior
                </button>
                <button
                  className="button-secondary"
                  disabled={lista.pagina >= paginas}
                  onClick={() => router.push(urlCuotas(filtros, lista.pagina + 1))}
                >
                  Siguiente
                </button>
              </>
            )}
            <p className="text-sm text-muted">
              Página {lista.pagina} de {paginas}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

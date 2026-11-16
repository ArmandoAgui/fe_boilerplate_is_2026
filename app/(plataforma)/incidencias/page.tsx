import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import {
  fechaIncidencia,
  etiquetaEstado,
  type ListaIncidencias,
} from "@/lib/incidencias-admin";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  if ((await usuarioActual()).rol !== "RESIDENTE") return <SinPermiso />;
  const pagina = Number((await searchParams).pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000)
    return <p role="alert">Página inválida</p>;
  const lista = await api<ListaIncidencias>(
    `incidencias/mias?pagina=${pagina}&tamanoPagina=20`,
  );
  return (
    <>
      <Titulo
        titulo="Mis incidencias"
        detalle="Consulta de forma privada el seguimiento de tus reportes."
      />
      <Link className="button mb-5" href="/incidencias/nueva">
        Reportar incidencia
      </Link>
      {!lista.datos.length ? (
        <p className="panel">Aún no has reportado incidencias</p>
      ) : (
        <div className="panel overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {["Código", "Categoría", "Fecha", "Estado"].map((t) => (
                  <th className="p-3" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.datos.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="p-3">
                    <Link
                      className="text-accent underline"
                      href={`/incidencias/${i.id}`}
                    >
                      {i.codigo}
                    </Link>
                  </td>
                  <td className="p-3">{i.categoria}</td>
                  <td className="p-3">{fechaIncidencia(i.creadaAt)}</td>
                  <td className="p-3">
                    <span
                      className={`incidencia-pill incidencia-estado-${i.estado.toLowerCase()}`}
                    >
                      {etiquetaEstado[i.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav
        className="mt-4 flex justify-between"
        aria-label="Páginas de incidencias"
      >
        {pagina > 1 ? (
          <Link href={`?pagina=${pagina - 1}`}>Anterior</Link>
        ) : (
          <span />
        )}
        {pagina * 20 < lista.total && (
          <Link href={`?pagina=${pagina + 1}`}>Siguiente</Link>
        )}
      </nav>
    </>
  );
}

import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import {
  etiquetasAlcance,
  fechaComunicado,
  type ListaComunicadosAdmin,
} from "@/lib/comunicados";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  if ((await usuarioActual()).rol !== "ADMINISTRADOR") return <SinPermiso />;
  const pagina = Number((await searchParams).pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida. <Link href="/admin/comunicados">Volver</Link>
      </p>
    );
  const lista = await api<ListaComunicadosAdmin>(
    `comunicados/administracion?pagina=${pagina}&tamanoPagina=10`,
  );
  return (
    <>
      <Titulo
        titulo="Comunicados publicados"
        detalle="Avisos oficiales y lectura entre los residentes que corresponden actualmente al alcance."
      />
      <Link className="button mb-5" href="/admin/comunicados/nuevo">
        Nuevo comunicado
      </Link>
      {!lista.datos.length ? (
        <p className="panel">No hay comunicados publicados</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {["Título", "Alcance", "Fecha", "Lecturas"].map((t) => (
                  <th className="p-3" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.datos.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-3">{c.titulo}</td>
                  <td className="p-3">
                    {etiquetasAlcance[c.alcance]}
                    {c.destino ? ` · ${c.destino}` : ""}
                  </td>
                  <td className="p-3">{fechaComunicado(c.creadoAt)}</td>
                  <td className="p-3">
                    Leído por {c.leidoPor} de {c.destinatarios}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav
        aria-label="Páginas de comunicados"
        className="mt-5 flex items-center justify-between gap-4"
      >
        {pagina > 1 ? (
          <Link className="button-secondary" href={`?pagina=${pagina - 1}`}>
            Anterior
          </Link>
        ) : (
          <span />
        )}
        <p>
          Página {pagina} · {lista.total} comunicados
        </p>
        {pagina * lista.tamanoPagina < lista.total ? (
          <Link className="button-secondary" href={`?pagina=${pagina + 1}`}>
            Siguiente
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}

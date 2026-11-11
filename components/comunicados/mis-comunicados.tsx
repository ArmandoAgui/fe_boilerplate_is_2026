import Link from "next/link";
import {
  etiquetasAlcance,
  fechaComunicado,
  type MisComunicados as Lista,
  type DetalleComunicado,
} from "@/lib/comunicados";
export function MisComunicados({ lista }: { lista: Lista }) {
  return (
    <>
      {!lista.datos.length ? (
        <p className="panel">No hay comunicados para tu unidad</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.datos.map((c) => (
            <article key={c.id} className="panel">
              <div className="flex justify-between gap-3 text-sm">
                <span>{etiquetasAlcance[c.alcance]}</span>
                <span>{c.leido ? "Leído" : "Sin leer"}</span>
              </div>
              <h2 className="my-3 text-xl font-semibold">
                <Link
                  className="underline"
                  prefetch={false}
                  href={`/comunicados/${encodeURIComponent(c.id)}`}
                >
                  {c.titulo}
                </Link>
              </h2>
              <time dateTime={c.creadoAt} className="text-sm text-muted">
                {fechaComunicado(c.creadoAt)}
              </time>
            </article>
          ))}
        </div>
      )}
      <nav
        aria-label="Páginas de comunicados"
        className="mt-5 flex items-center justify-between gap-4"
      >
        {lista.pagina > 1 ? (
          <Link
            className="button-secondary"
            href={`?pagina=${lista.pagina - 1}`}
          >
            Anterior
          </Link>
        ) : (
          <span />
        )}
        <p>
          Página {lista.pagina} · {lista.total} comunicados
        </p>
        {lista.pagina * lista.tamanoPagina < lista.total ? (
          <Link
            className="button-secondary"
            href={`?pagina=${lista.pagina + 1}`}
          >
            Siguiente
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
export function ContenidoComunicado({
  comunicado,
}: {
  comunicado: DetalleComunicado;
}) {
  return (
    <article className="panel max-w-3xl">
      <p className="text-sm text-muted">
        {etiquetasAlcance[comunicado.alcance]} ·{" "}
        <time dateTime={comunicado.creadoAt}>
          {fechaComunicado(comunicado.creadoAt)}
        </time>
      </p>
      <h1 className="my-4 text-2xl font-semibold">{comunicado.titulo}</h1>
      <div className="whitespace-pre-wrap break-words">
        {comunicado.contenido}
      </div>
    </article>
  );
}

import Link from "next/link";
import { SinPermiso } from "@/components/reservas/ui";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  categoriaIncidencia,
  crearQueryIncidenciasMias,
  crearQueryRetornoIncidencias,
  esEstadoSeguimiento,
  fechaHoraSeguimiento,
  normalizarPagina,
  TAMANO_PAGINA_INCIDENCIAS,
  type ListaIncidenciasMias,
} from "@/lib/incidencias-seguimiento";
import {
  etiquetaEstado,
  type EstadoIncidencia,
} from "@/lib/incidencias-admin";

type Parametro = string | string[] | undefined;

function valorUnico(valor: Parametro) {
  return typeof valor === "string" ? valor : undefined;
}

function rutaLista(estado?: EstadoIncidencia, pagina = 1) {
  const query = crearQueryRetornoIncidencias(estado, pagina).toString();
  return query ? "/incidencias?" + query : "/incidencias";
}

function consulta(pagina: number, estado?: EstadoIncidencia) {
  return "incidencias/mias?" + crearQueryIncidenciasMias(pagina, estado).toString();
}

function claseEstado(estado: string) {
  return "incidencia-pill incidencia-estado-" + estado.toLowerCase();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: Parametro; pagina?: Parametro }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;

  const params = await searchParams;
  const estadoCrudo = valorUnico(params.estado);
  const estado = esEstadoSeguimiento(estadoCrudo) ? estadoCrudo : undefined;
  const paginaSolicitada = normalizarPagina(valorUnico(params.pagina));

  let listado: ListaIncidenciasMias = {
    datos: [],
    total: 0,
    pagina: 1,
    tamanoPagina: TAMANO_PAGINA_INCIDENCIAS,
  };
  let error = "";
  try {
    listado = await api<ListaIncidenciasMias>(consulta(paginaSolicitada, estado));
    const ultimaPagina = Math.max(
      1,
      Math.ceil(listado.total / TAMANO_PAGINA_INCIDENCIAS),
    );
    if (paginaSolicitada > ultimaPagina)
      listado = await api<ListaIncidenciasMias>(consulta(ultimaPagina, estado));
  } catch (fallo) {
    if (fallo instanceof Error && "digest" in fallo) throw fallo;
    error =
      fallo instanceof ApiError
        ? fallo.message
        : "No se pudieron cargar tus incidencias. Intenta de nuevo.";
  }

  const ultimaPagina = Math.max(
    1,
    Math.ceil(listado.total / TAMANO_PAGINA_INCIDENCIAS),
  );
  const page = Math.min(paginaSolicitada, ultimaPagina);
  const hayFiltro = Boolean(estado);
  const queryDetalle = crearQueryRetornoIncidencias(estado, page).toString();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">Incidencias / Residente</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Mis incidencias</h1>
          <p className="mt-2 text-muted">
            Consulta el estado y seguimiento de los reportes que has realizado.
          </p>
        </div>
        <Link className="button" href="/incidencias/nueva">
          Reportar incidencia
        </Link>
      </header>

      <section
        aria-label="Filtros de mis incidencias"
        className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
      >
        <form action="/incidencias" method="get" className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-52 gap-1.5 text-sm font-semibold" htmlFor="estado-incidencia">
            Estado
            <select className="field" id="estado-incidencia" name="estado" defaultValue={estado ?? ""}>
              <option value="">Todos</option>
              <option value="ABIERTA">Abierta</option>
              <option value="ASIGNADA">Asignada</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="RESUELTA">Resuelta</option>
            </select>
          </label>
          <button className="button-secondary" type="submit">Aplicar filtro</button>
        </form>
        {hayFiltro && (
          <Link className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent underline underline-offset-2" href="/incidencias">
            Limpiar filtro
          </Link>
        )}
      </section>

      {error ? (
        <section className="panel" role="alert">
          <h2 className="text-lg font-semibold">No se pudo cargar el listado</h2>
          <p className="mt-2 text-muted">{error}</p>
          <Link className="button-secondary mt-4" href={rutaLista(estado, page)}>
            Reintentar
          </Link>
        </section>
      ) : !listado.datos.length ? (
        <section className="panel">
          <h2 className="text-lg font-semibold">
            {hayFiltro
              ? "No hay incidencias para el estado seleccionado"
              : "Aún no has reportado incidencias"}
          </h2>
          <p className="mt-2 text-muted">
            {hayFiltro
              ? "Prueba otro estado o vuelve a consultar todos tus reportes."
              : "Cuando envíes un reporte, podrás consultar aquí su avance."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {hayFiltro && (
              <Link className="button-secondary" href="/incidencias">
                Ver todos los estados
              </Link>
            )}
            <Link className="button" href="/incidencias/nueva">
              Reportar incidencia
            </Link>
          </div>
        </section>
      ) : (
        <>
          <ul aria-label="Mis incidencias" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {listado.datos.map((incidencia) => {
              const detalle =
                "/incidencias/" +
                encodeURIComponent(incidencia.id) +
                (queryDetalle ? "?" + queryDetalle : "");
              return (
                <li key={incidencia.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{incidencia.codigo}</h2>
                      <span className={claseEstado(incidencia.estado)}>
                        {etiquetaEstado[incidencia.estado]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {categoriaIncidencia(incidencia.categoria)}
                    </p>
                    <time className="mt-1 block text-xs text-muted" dateTime={incidencia.creadaAt}>
                      Reportada {fechaHoraSeguimiento(incidencia.creadaAt)}
                    </time>
                  </div>
                  <Link
                    className="inline-flex min-h-10 items-center font-semibold text-accent underline underline-offset-2"
                    href={detalle}
                    aria-label={"Consultar incidencia " + incidencia.codigo}
                  >
                    Ver seguimiento
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {listado.total} {listado.total === 1 ? "incidencia" : "incidencias"}
              {hayFiltro ? " para este estado" : ""}
            </p>
            <nav aria-label="Paginación de mis incidencias" className="flex items-center gap-2">
              {page > 1 ? (
                <Link className="button-secondary min-h-10 px-3 py-2" href={rutaLista(estado, page - 1)}>
                  Anterior
                </Link>
              ) : (
                <span aria-disabled="true" className="button-secondary min-h-10 px-3 py-2 opacity-50">
                  Anterior
                </span>
              )}
              <span aria-current="page" className="px-2">
                Página {page} de {ultimaPagina}
              </span>
              {page < ultimaPagina ? (
                <Link className="button-secondary min-h-10 px-3 py-2" href={rutaLista(estado, page + 1)}>
                  Siguiente
                </Link>
              ) : (
                <span aria-disabled="true" className="button-secondary min-h-10 px-3 py-2 opacity-50">
                  Siguiente
                </span>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { EvidenciaSeguimiento } from "@/components/incidencias/evidencia-seguimiento";
import { SinPermiso } from "@/components/reservas/ui";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  categoriaIncidencia,
  crearQueryRetornoIncidencias,
  etiquetaEstadoSeguimiento,
  fechaHoraSeguimiento,
  idValidoIncidencia,
  nombreActor,
  normalizarPagina,
  type EventoSeguimiento,
  type IncidenciaSeguimiento,
} from "@/lib/incidencias-seguimiento";
import { esEstadoSeguimiento } from "@/lib/incidencias-seguimiento";
import { esUuid, etiquetaEstado } from "@/lib/incidencias-admin";

type Parametro = string | string[] | undefined;

function valorUnico(valor: Parametro) {
  return typeof valor === "string" ? valor : undefined;
}

function rutaRegreso(
  rol: "RESIDENTE" | "ADMINISTRADOR" | "SEGURIDAD",
  estado?: string,
  pagina = 1,
) {
  if (rol === "ADMINISTRADOR") return "/admin/incidencias";
  if (rol === "SEGURIDAD") return "/";
  const query = crearQueryRetornoIncidencias(
    estado && esEstadoSeguimiento(estado) ? estado : undefined,
    pagina,
  ).toString();
  return query ? "/incidencias?" + query : "/incidencias";
}

function claseEstado(estado: string) {
  return "incidencia-pill incidencia-estado-" + estado.toLowerCase();
}

function fechaApertura(historial: EventoSeguimiento[]) {
  return historial.find(
    (evento) =>
      evento.campo === "ESTADO" &&
      evento.valorAnterior === null &&
      evento.valorNuevo === "ABIERTA",
  )?.fecha;
}

function descripcionEvento(evento: EventoSeguimiento) {
  const actor = nombreActor(evento.actor);
  const nombre = actor && !esUuid(actor) ? actor : null;
  if (evento.valorAnterior === null && evento.valorNuevo === "ABIERTA")
    return nombre ? nombre + " registró la incidencia." : "Incidencia registrada.";

  const estadoNuevo = etiquetaEstadoSeguimiento(evento.valorNuevo);
  const estadoAnterior = etiquetaEstadoSeguimiento(evento.valorAnterior);
  if (evento.valorNuevo === "EN_PROCESO")
    return nombre
      ? nombre + " inició la atención."
      : "La incidencia pasó a En proceso.";
  if (evento.valorNuevo === "RESUELTA")
    return nombre
      ? nombre + " marcó la incidencia como Resuelta."
      : "La incidencia fue marcada como Resuelta.";
  return nombre
    ? nombre + " cambió el estado de " + estadoAnterior + " a " + estadoNuevo + "."
    : "El estado cambió de " + estadoAnterior + " a " + estadoNuevo + ".";
}

function EnlaceRegreso({ href, texto }: { href: string; texto: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center font-semibold text-accent underline underline-offset-2"
    >
      ← {texto}
    </Link>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: Parametro; pagina?: Parametro }>;
}) {
  const usuario = await usuarioActual();
  if (
    usuario.rol !== "RESIDENTE" &&
    usuario.rol !== "ADMINISTRADOR" &&
    usuario.rol !== "SEGURIDAD"
  )
    return <SinPermiso />;

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const estadoCrudo = valorUnico(query.estado);
  const estado = esEstadoSeguimiento(estadoCrudo) ? estadoCrudo : undefined;
  const pagina = normalizarPagina(valorUnico(query.pagina));
  const regreso = rutaRegreso(usuario.rol, estado, pagina);
  const textoRegreso =
    usuario.rol === "RESIDENTE"
      ? "Mis incidencias"
      : usuario.rol === "ADMINISTRADOR"
        ? "Volver a incidencias"
        : "Volver al inicio";

  if (!idValidoIncidencia(id))
    return (
      <section className="panel mx-auto max-w-3xl" role="alert">
        <EnlaceRegreso href={regreso} texto={textoRegreso} />
        <h1 className="mt-5 text-2xl font-semibold">Incidencia no disponible</h1>
        <p className="mt-2 text-muted">
          No se encontró la incidencia solicitada.
        </p>
      </section>
    );

  let incidencia: IncidenciaSeguimiento | null = null;
  let estadoError: number | null = null;
  let mensajeError = "";
  try {
    incidencia = await api<IncidenciaSeguimiento>(
      "incidencias/" + encodeURIComponent(id),
    );
  } catch (fallo) {
    if (fallo instanceof Error && "digest" in fallo) throw fallo;
    estadoError = fallo instanceof ApiError ? fallo.status : null;
    mensajeError =
      fallo instanceof ApiError
        ? fallo.message
        : "No se pudo cargar el seguimiento. Intenta de nuevo.";
  }

  if (!incidencia) {
    const sinAcceso = estadoError === 403;
    const noDisponible = estadoError === 404;
    const volverAIntentar =
      "/incidencias/" +
      encodeURIComponent(id) +
      (query.estado || query.pagina
        ? "?" + crearQueryRetornoIncidencias(estado, pagina).toString()
        : "");
    return (
      <section className="panel mx-auto max-w-3xl" role={sinAcceso || noDisponible ? "status" : "alert"}>
        <EnlaceRegreso href={regreso} texto={textoRegreso} />
        <h1 className="mt-5 text-2xl font-semibold">
          {sinAcceso
            ? "Acceso restringido"
            : noDisponible
              ? "Incidencia no disponible"
              : "No se pudo cargar el seguimiento"}
        </h1>
        <p className="mt-2 text-muted">
          {sinAcceso
            ? "Tu cuenta no tiene acceso a esta incidencia."
            : noDisponible
              ? "No se encontró la incidencia solicitada."
              : mensajeError}
        </p>
        {!sinAcceso && !noDisponible && (
          <Link className="button-secondary mt-4" href={volverAIntentar}>
            Reintentar
          </Link>
        )}
      </section>
    );
  }

  const fechaReporte = fechaApertura(incidencia.historial);
  const eventosEstado = incidencia.historial.filter(
    (evento) => evento.campo === "ESTADO",
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4">
        <EnlaceRegreso href={regreso} texto={textoRegreso} />
      </div>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {incidencia.codigo}, {categoriaIncidencia(incidencia.categoria)} en {incidencia.lugar}
            </h1>
            {fechaReporte && (
              <p className="mt-2 text-sm text-muted">
                Reportada el {fechaHoraSeguimiento(fechaReporte)}
              </p>
            )}
          </div>
          <span className={claseEstado(incidencia.estado)}>
            {etiquetaEstado[incidencia.estado]}
          </span>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-label="Información de la incidencia"
          className="rounded-xl border border-line bg-surface p-4 sm:p-6"
        >
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Categoría</dt>
              <dd className="mt-1 font-semibold">{categoriaIncidencia(incidencia.categoria)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Lugar</dt>
              <dd className="mt-1 font-semibold">{incidencia.lugar}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Responsable</dt>
              <dd className="mt-1 font-semibold">
                {incidencia.responsable?.nombre ?? "Sin asignar"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-line pt-5">
            <h2 className="text-sm font-semibold">Descripción</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
              {incidencia.descripcion}
            </p>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <h2 className="text-sm font-semibold">Fotos</h2>
            {incidencia.evidencias.length ? (
              <ul className="mt-3 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
                {incidencia.evidencias.map((evidencia, indice) => (
                  <li key={evidencia.id}>
                    <EvidenciaSeguimiento
                      incidenciaId={incidencia.id}
                      evidenciaId={evidencia.id}
                      indice={indice + 1}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Sin fotos adjuntas</p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="titulo-seguimiento"
          className="rounded-xl border border-line bg-surface p-4 sm:p-6"
        >
          <h2 id="titulo-seguimiento" className="text-lg font-semibold">
            Seguimiento
          </h2>
          {eventosEstado.length ? (
            <ol className="mt-5 space-y-0">
              {eventosEstado.map((evento, indice) => (
                <li key={evento.fecha + "-" + indice} className="relative pb-6 pl-7 last:pb-0">
                  {indice < eventosEstado.length - 1 && (
                    <span aria-hidden="true" className="absolute bottom-0 left-[0.4rem] top-3 w-px bg-line" />
                  )}
                  <span
                    aria-hidden="true"
                    className={
                      "absolute left-0 top-1 size-3 rounded-full border-2 border-surface " +
                      (indice === 0 ? "bg-accent" : "bg-muted/50")
                    }
                  />
                  <h3 className="text-sm font-semibold">
                    {etiquetaEstadoSeguimiento(evento.valorNuevo)}
                  </h3>
                  <time className="mt-1 block text-xs text-muted" dateTime={evento.fecha}>
                    {fechaHoraSeguimiento(evento.fecha)}
                  </time>
                  <p className="mt-1 text-sm">{descripcionEvento(evento)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aún no hay movimientos de seguimiento
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

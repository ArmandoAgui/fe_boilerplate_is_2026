"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { guardarAsignacionIncidencia } from "@/app/actions/incidencias-admin";
import {
  ESTADOS_INCIDENCIA,
  PRIORIDADES_INCIDENCIA,
  coincideConFiltros,
  etiquetaEstado,
  etiquetaPrioridad,
  fechaIncidencia,
  type EstadoIncidencia,
  type IncidenciaDetalle,
  type IncidenciaResumen,
  type ListaIncidencias,
  type PrioridadIncidencia,
  type ResponsableIncidencia,
} from "@/lib/incidencias-admin";

function hrefConFiltros({
  estado,
  prioridad,
  pagina,
  id,
  sinSeleccion,
}: {
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  pagina?: number;
  id?: string;
  sinSeleccion?: boolean;
}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (prioridad) params.set("prioridad", prioridad);
  if (pagina && pagina > 1) params.set("pagina", String(pagina));
  if (id) params.set("id", id);
  if (sinSeleccion) params.set("sinSeleccion", "1");
  const consulta = params.toString();
  return "/admin/incidencias" + (consulta ? "?" + consulta : "");
}

function EstadoPill({ estado }: { estado: EstadoIncidencia }) {
  return (
    <span className={"incidencia-pill incidencia-estado-" + estado.toLowerCase()}>
      {etiquetaEstado[estado]}
    </span>
  );
}

function PrioridadPill({ prioridad }: { prioridad: PrioridadIncidencia | null }) {
  if (!prioridad) return <span className="text-muted">Sin prioridad</span>;
  return (
    <span
      className={
        "incidencia-pill incidencia-prioridad-" + prioridad.toLowerCase()
      }
    >
      {etiquetaPrioridad[prioridad]}
    </span>
  );
}

function textoPersona(persona?: string | { nombre?: string } | null) {
  if (typeof persona === "string") return persona;
  return persona?.nombre ?? "";
}

function fechasConHora(valor?: string) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

function ControlesAsignacion({
  incidencia,
  responsables,
  errorResponsables,
  error,
  campoError,
  pending,
  guardado,
  onEditar,
  onGuardar,
}: {
  incidencia: IncidenciaResumen;
  responsables: ResponsableIncidencia[];
  errorResponsables?: string;
  error?: string;
  campoError?: string;
  pending: boolean;
  guardado: boolean;
  onEditar: () => void;
  onGuardar: (cambios: {
    prioridad?: PrioridadIncidencia;
    responsableId?: string;
  }) => void;
}) {
  const [prioridadNueva, setPrioridadNueva] = useState(
    incidencia.prioridad ?? "",
  );
  const [responsableNuevo, setResponsableNuevo] = useState(
    incidencia.responsable?.id ?? "",
  );
  const esResuelta = incidencia.estado === "RESUELTA";
  const prioridadCambio =
    prioridadNueva !== (incidencia.prioridad ?? "");
  const responsableCambio =
    responsableNuevo !== (incidencia.responsable?.id ?? "");
  const hayCambios = prioridadCambio || responsableCambio;
  const actualNoElegible =
    !!incidencia.responsable &&
    !responsables.some(
      (responsable) => responsable.id === incidencia.responsable?.id,
    );

  function guardar() {
    if (!hayCambios || esResuelta || pending) return;
    const cambios: {
      prioridad?: PrioridadIncidencia;
      responsableId?: string;
    } = {};
    if (prioridadCambio && prioridadNueva)
      cambios.prioridad = prioridadNueva as PrioridadIncidencia;
    if (responsableCambio && responsableNuevo)
      cambios.responsableId = responsableNuevo;
    onGuardar(cambios);
  }

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-4">
      <label className="block text-sm font-medium">
        Prioridad
        <select
          className="field mt-1"
          value={prioridadNueva}
          disabled={esResuelta || pending}
          aria-invalid={campoError === "prioridad" || undefined}
          onChange={(event) => {
            setPrioridadNueva(event.target.value as PrioridadIncidencia | "");
            onEditar();
          }}
        >
          {!prioridadNueva && <option value="">Sin prioridad</option>}
          {PRIORIDADES_INCIDENCIA.map((opcion) => (
            <option key={opcion} value={opcion}>
              {etiquetaPrioridad[opcion]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Responsable
        <select
          className="field mt-1"
          value={responsableNuevo}
          disabled={esResuelta || pending}
          aria-invalid={campoError === "responsableId" || undefined}
          onChange={(event) => {
            setResponsableNuevo(event.target.value);
            onEditar();
          }}
        >
          {!responsableNuevo && <option value="">Sin asignar</option>}
          {actualNoElegible && incidencia.responsable && (
            <option value={incidencia.responsable.id}>
              {incidencia.responsable.nombre} · responsable actual
            </option>
          )}
          {responsables.map((responsable) => (
            <option key={responsable.id} value={responsable.id}>
              {responsable.nombre}
            </option>
          ))}
        </select>
        {errorResponsables && (
          <span className="mt-1 block text-xs text-muted">
            No se pudo cargar el catálogo de responsables. Puedes cambiar la prioridad e intentarlo más tarde.
          </span>
        )}
      </label>
      {error && <p role="alert" className="field-error">{error}</p>}
      <button
        className="button min-h-10 w-full rounded-lg py-2"
        disabled={!hayCambios || esResuelta || pending || guardado}
        onClick={guardar}
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
      {esResuelta && (
        <p className="text-xs text-muted">
          Esta incidencia está resuelta y solo se puede consultar.
        </p>
      )}
    </div>
  );
}

export function AdministrarIncidencias({
  incidencias,
  estado,
  prioridad,
  seleccionada,
  responsables,
  errorResponsables,
  detalle,
  errorDetalle,
  estadoDetalle,
  errorInicial,
}: {
  incidencias: ListaIncidencias;
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  seleccionada?: IncidenciaResumen;
  responsables: ResponsableIncidencia[];
  errorResponsables?: string;
  detalle?: IncidenciaDetalle;
  errorDetalle?: string;
  estadoDetalle?: number;
  errorInicial?: string;
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ id: string; texto: string } | null>(
    null,
  );
  const [error, setError] = useState<{
    id: string;
    texto: string;
    campo?: string;
  } | null>(null);
  const [guardadoId, setGuardadoId] = useState("");
  const [pending, startTransition] = useTransition();

  const seleccionadaId = seleccionada?.id;
  useEffect(() => {
    if (!seleccionadaId || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("id")) {
      const nuevaUrl = hrefConFiltros({
        estado,
        prioridad,
        pagina: incidencias.pagina,
        id: seleccionadaId,
      });
      window.history.replaceState(null, "", nuevaUrl);
    }
  }, [
    estado,
    prioridad,
    incidencias.pagina,
    seleccionadaId,
  ]);

  const paginas = Math.max(
    1,
    Math.ceil(incidencias.total / incidencias.tamanoPagina),
  );
  const nombreAutor = detalle
    ? textoPersona(detalle.autor ?? detalle.creadoPor ?? detalle.residente)
    : "";

  function cambiarFiltro(
    campo: "estado" | "prioridad",
    valor: string,
  ) {
    setMensaje(null);
    setError(null);
    router.push(
      hrefConFiltros({
        estado:
          campo === "estado"
            ? (valor as EstadoIncidencia) || undefined
            : estado,
        prioridad:
          campo === "prioridad"
            ? (valor as PrioridadIncidencia) || undefined
            : prioridad,
        sinSeleccion: true,
      }),
    );
  }

  function cambiarPagina(nuevaPagina: number) {
    setMensaje(null);
    setError(null);
    router.push(
      hrefConFiltros({
        estado,
        prioridad,
        pagina: nuevaPagina,
        sinSeleccion: true,
      }),
    );
  }

  function volverAlListado() {
    router.push(
      hrefConFiltros({
        estado,
        prioridad,
        pagina: incidencias.pagina,
        sinSeleccion: true,
      }),
    );
  }

  function guardar(cambios: {
    prioridad?: PrioridadIncidencia;
    responsableId?: string;
  }) {
    if (!seleccionada || pending) return;
    setMensaje(null);
    setError(null);
    startTransition(async () => {
      const resultado = await guardarAsignacionIncidencia(
        seleccionada.id,
        cambios,
      );
      if (resultado.error || !resultado.datos) {
        if (resultado.status === 409) {
          setError({
            id: seleccionada.id,
            texto: "La incidencia ya fue resuelta. Se actualizará la pantalla.",
          });
          router.refresh();
          return;
        }
        if (resultado.status === 404) {
          setError({
            id: seleccionada.id,
            texto: "La incidencia ya no está disponible. Se actualizará la lista.",
          });
          router.push(
            hrefConFiltros({
              estado,
              prioridad,
              pagina: incidencias.pagina,
              sinSeleccion: true,
            }),
          );
          return;
        }
        if (resultado.status === 403) {
          setError({
            id: seleccionada.id,
            texto: "No tienes permiso para modificar incidencias.",
          });
        } else {
          setError({
            id: seleccionada.id,
            texto:
              resultado.error ??
              "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.",
            campo: resultado.campo,
          });
        }
        return;
      }

      setGuardadoId(seleccionada.id);
      setMensaje({ id: seleccionada.id, texto: "Cambios guardados" });
      const saleDelFiltro = !coincideConFiltros(
        {
          estado: resultado.datos.estado as EstadoIncidencia,
          prioridad: resultado.datos.prioridad as PrioridadIncidencia | null,
        },
        estado,
        prioridad,
      );
      if (saleDelFiltro) {
        router.push(
          hrefConFiltros({
            estado,
            prioridad,
            pagina: incidencias.pagina,
            sinSeleccion: true,
          }),
        );
      } else {
        router.refresh();
      }
    });
  }

  function editarAsignacion() {
    setGuardadoId("");
    setMensaje(null);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Incidencias</h1>
        <p className="mt-1 text-sm text-muted">
          Ordenadas por prioridad y luego por antigüedad.
        </p>
      </header>

      {mensaje && (!seleccionada || mensaje.id === seleccionada.id) && (
        <p role="status" className="rounded-lg border border-success-line bg-success-soft px-4 py-3 text-sm text-success-text">
          {mensaje.texto}
        </p>
      )}
      {!seleccionada && error && (
        <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          {error.texto}
        </p>
      )}
      {errorInicial && (
        <div role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <p>{errorInicial}</p>
          <button className="button-secondary mt-2" onClick={() => router.refresh()}>
            Reintentar
          </button>
        </div>
      )}

      <section
        aria-label="Filtros de incidencias"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="w-full max-w-52 text-sm font-medium">
          Estado
          <select
            className="field mt-1"
            value={estado ?? ""}
            onChange={(event) => cambiarFiltro("estado", event.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS_INCIDENCIA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {etiquetaEstado[opcion]}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full max-w-52 text-sm font-medium">
          Prioridad
          <select
            className="field mt-1"
            value={prioridad ?? ""}
            onChange={(event) => cambiarFiltro("prioridad", event.target.value)}
          >
            <option value="">Todas</option>
            {PRIORIDADES_INCIDENCIA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {etiquetaPrioridad[opcion]}
              </option>
            ))}
          </select>
        </label>
        <p aria-live="polite" role="status" className="pb-3 text-sm text-muted">
          {pending ? "Actualizando incidencias…" : incidencias.total + " resultados"}
        </p>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]">
        <section
          aria-label="Listado de incidencias"
          className={seleccionada ? "hidden lg:block" : ""}
        >
          {incidencias.datos.length === 0 ? (
            <div className="panel text-sm text-muted">
              {errorInicial
                ? "No se pudieron cargar las incidencias."
                : "No hay incidencias para los filtros elegidos"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full min-w-[740px] border-collapse text-left text-xs">
                  <caption className="sr-only">
                    Incidencias ordenadas por prioridad y antigüedad
                  </caption>
                  <thead className="bg-surface-alt text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-3">Código</th>
                      <th scope="col" className="px-3 py-3">Lugar y categoría</th>
                      <th scope="col" className="px-3 py-3">Fecha</th>
                      <th scope="col" className="px-3 py-3">Prioridad</th>
                      <th scope="col" className="px-3 py-3">Responsable</th>
                      <th scope="col" className="px-3 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidencias.datos.map((incidencia) => {
                      const seleccionadaFila = seleccionada?.id === incidencia.id;
                      return (
                        <tr
                          key={incidencia.id}
                          className={
                            "border-t border-line transition-colors " +
                            (seleccionadaFila
                              ? "bg-surface-alt"
                              : "hover:bg-surface-alt/60")
                          }
                        >
                          <th scope="row" className="px-3 py-3 font-semibold">
                            <Link
                              href={hrefConFiltros({
                                estado,
                                prioridad,
                                pagina: incidencias.pagina,
                                id: incidencia.id,
                              })}
                              aria-current={seleccionadaFila ? "true" : undefined}
                              aria-label={"Ver incidencia " + incidencia.codigo}
                              className="rounded-sm text-accent underline decoration-transparent underline-offset-2 hover:decoration-current"
                              onClick={() => {
                                setMensaje(null);
                                setError(null);
                              }}
                            >
                              {incidencia.codigo}
                            </Link>
                          </th>
                          <td className="px-3 py-3">
                            <span className="block font-medium">{incidencia.lugar || "—"}</span>
                            <span className="mt-0.5 block text-muted">{incidencia.categoria || "—"}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">
                            {fechaIncidencia(incidencia.creadaAt)}
                          </td>
                          <td className="px-3 py-3">
                            <PrioridadPill prioridad={incidencia.prioridad} />
                          </td>
                          <td className="px-3 py-3">
                            {incidencia.responsable?.nombre ?? (
                              <span className="text-muted">Sin asignar</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <EstadoPill estado={incidencia.estado} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <p className="text-muted">
                  Página {incidencias.pagina} de {paginas}
                </p>
                <div className="flex gap-2">
                  <button
                    className="button-secondary min-h-9 px-3 py-1"
                    disabled={incidencias.pagina <= 1 || pending}
                    onClick={() => cambiarPagina(incidencias.pagina - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="button-secondary min-h-9 px-3 py-1"
                    disabled={incidencias.pagina >= paginas || pending}
                    onClick={() => cambiarPagina(incidencias.pagina + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {seleccionada ? (
          <aside
            aria-label={"Detalle de " + seleccionada.codigo}
            className="rounded-xl border border-line bg-surface p-4 sm:p-5"
          >
            <button
              type="button"
              className="mb-4 text-sm font-medium text-accent underline lg:hidden"
              onClick={volverAlListado}
            >
              ← Volver al listado
            </button>
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h2 className="text-lg font-semibold">{seleccionada.codigo}</h2>
                <p className="mt-1 text-sm text-muted">
                  {seleccionada.categoria} · {seleccionada.lugar}
                </p>
              </div>
              <EstadoPill estado={seleccionada.estado} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Fecha de reporte</dt>
                <dd className="mt-1 font-medium">
                  {fechaIncidencia(seleccionada.creadaAt)}
                </dd>
              </div>
              {nombreAutor && (
                <div>
                  <dt className="text-xs text-muted">Reportada por</dt>
                  <dd className="mt-1 font-medium">{nombreAutor}</dd>
                </div>
              )}
            </dl>
            {detalle?.descripcion && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-muted">Descripción</h3>
                <p className="mt-1 text-sm leading-6">{detalle.descripcion}</p>
              </div>
            )}
            {errorDetalle && estadoDetalle !== 404 && (
              <div role="alert" className="mt-4 rounded-lg border border-line bg-surface-alt p-3 text-sm">
                <p>{errorDetalle}</p>
                <button
                  className="mt-2 font-semibold text-accent underline"
                  onClick={() => router.refresh()}
                >
                  Reintentar
                </button>
              </div>
            )}
            {(!detalle && (!errorDetalle || estadoDetalle === 404)) && (
              <p className="mt-4 rounded-lg bg-surface-alt px-3 py-2 text-xs text-muted">
                Detalle e historial no disponibles todavía.
              </p>
            )}

            <ControlesAsignacion
              key={seleccionada.id}
              incidencia={seleccionada}
              responsables={responsables}
              errorResponsables={errorResponsables}
              error={error?.id === seleccionada.id ? error.texto : undefined}
              campoError={
                error?.id === seleccionada.id ? error.campo : undefined
              }
              pending={pending}
              guardado={guardadoId === seleccionada.id}
              onEditar={editarAsignacion}
              onGuardar={guardar}
            />

            <section aria-labelledby="historial-incidencia" className="mt-5 border-t border-line pt-4">
              <h3 id="historial-incidencia" className="font-semibold">
                Historial
              </h3>
              {detalle?.historial?.length ? (
                <ol className="mt-3 space-y-3 border-l border-line pl-4">
                  {detalle.historial.map((evento, indice) => (
                    <li key={indice} className="relative text-xs">
                      <span aria-hidden="true" className="absolute -left-[1.32rem] top-1 size-2 rounded-full bg-accent" />
                      <p className="font-semibold">{evento.estado ?? "Actualización"}</p>
                      {fechasConHora(evento.fecha ?? evento.creadaAt) && (
                        <p className="mt-0.5 text-muted">
                          {fechasConHora(evento.fecha ?? evento.creadaAt)}
                        </p>
                      )}
                      {evento.responsable && (
                        <p className="mt-0.5 text-muted">
                          Responsable: {textoPersona(evento.responsable)}
                        </p>
                      )}
                      {evento.detalle && (
                        <p className="mt-0.5 text-muted">{evento.detalle}</p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  {detalle
                    ? "No hay movimientos disponibles."
                    : "El historial estará disponible cuando se integre el detalle de H12."}
                </p>
              )}
            </section>
          </aside>
        ) : (
          <aside className="hidden rounded-xl border border-line bg-surface p-5 text-sm text-muted lg:block">
            Selecciona una incidencia para consultar y actualizar su asignación.
          </aside>
        )}
      </div>
    </div>
  );
}

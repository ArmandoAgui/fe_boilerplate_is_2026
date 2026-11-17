"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  actualizarEstadoIncidencia,
  guardarAsignacionIncidencia,
} from "@/app/actions/incidencias-admin";
import {
  accionEstadoIncidencia,
  ESTADOS_INCIDENCIA,
  PRIORIDADES_INCIDENCIA,
  coincideConFiltros,
  etiquetaEstado,
  etiquetaPrioridad,
  fechaIncidencia,
  type EstadoIncidencia,
  type EstadoDestinoIncidencia,
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

function textoValorHistorial(campo: string, valor: string | null) {
  if (!valor) return campo === "RESPONSABLE" ? "Sin asignar" : "Sin valor";
  if (campo === "ESTADO")
    return valor in etiquetaEstado
      ? etiquetaEstado[valor as EstadoIncidencia]
      : valor;
  if (campo === "PRIORIDAD")
    return valor in etiquetaPrioridad
      ? etiquetaPrioridad[valor as PrioridadIncidencia]
      : valor;
  return "Responsable actualizado";
}

function descripcionMovimiento(campo: string, anterior: string | null, nuevo: string) {
  const etiqueta =
    campo === "ESTADO"
      ? "Estado"
      : campo === "PRIORIDAD"
        ? "Prioridad"
        : "Responsable";
  if (campo === "RESPONSABLE")
    return `${etiqueta}: ${textoValorHistorial(campo, anterior)} → Responsable actualizado`;
  return `${etiqueta}: ${textoValorHistorial(campo, anterior)} → ${textoValorHistorial(campo, nuevo)}`;
}

function FotoEvidencia({
  incidenciaId,
  evidenciaId,
  codigo,
}: {
  incidenciaId: string;
  evidenciaId: string;
  codigo: string;
}) {
  const [fallida, setFallida] = useState(false);
  if (fallida)
    return (
      <span className="flex h-24 w-28 items-center justify-center rounded-lg bg-surface-alt px-2 text-center text-xs text-muted">
        Foto no disponible
      </span>
    );
  return (
    <Image
      src={`/api/incidencias/${incidenciaId}/evidencias/${evidenciaId}`}
      alt={`Evidencia de ${codigo}`}
      width={112}
      height={96}
      unoptimized
      className="h-24 w-28 rounded-lg border border-line object-cover"
      onError={() => setFallida(true)}
    />
  );
}

function ControlesAsignacion({
  incidencia,
  responsables,
  errorResponsables,
  error,
  campoError,
  pending,
  guardado,
  onCambiosPendientes,
  onGuardar,
}: {
  incidencia: IncidenciaResumen;
  responsables: ResponsableIncidencia[];
  errorResponsables?: string;
  error?: string;
  campoError?: string;
  pending: boolean;
  guardado: boolean;
  onCambiosPendientes: (pendiente: boolean) => void;
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
            const valor = event.target.value as PrioridadIncidencia | "";
            setPrioridadNueva(valor);
            onCambiosPendientes(
              valor !== (incidencia.prioridad ?? "") || responsableCambio,
            );
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
            const valor = event.target.value;
            setResponsableNuevo(valor);
            onCambiosPendientes(valor !== (incidencia.responsable?.id ?? "") || prioridadCambio);
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
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [versionEdicion, setVersionEdicion] = useState(0);
  const [confirmacionEstado, setConfirmacionEstado] = useState<{
    id: string;
    codigo: string;
    origen: EstadoIncidencia;
    destino: EstadoDestinoIncidencia;
  } | null>(null);
  const [estadoConfirmado, setEstadoConfirmado] = useState<{
    id: string;
    origen: EstadoIncidencia;
    estado: EstadoIncidencia;
    esperaRefresco: boolean;
  } | null>(null);
  const [errorEstado, setErrorEstado] = useState<{ id: string; texto: string } | null>(null);
  const [verificacionPendiente, setVerificacionPendiente] = useState<{
    id: string;
    lista: ListaIncidencias;
  } | null>(null);
  const dialogoEstado = useRef<HTMLDialogElement>(null);
  const botonAccionEstado = useRef<HTMLButtonElement>(null);
  const botonVolverDialogo = useRef<HTMLButtonElement>(null);
  const anuncioEstado = useRef<HTMLParagraphElement>(null);
  const envioEstadoBloqueado = useRef(false);

  const seleccionadaId = seleccionada?.id;
  const verificacionPendienteId =
    verificacionPendiente?.lista === incidencias ? verificacionPendiente.id : "";
  const estadoSeleccionado =
    seleccionada &&
    estadoConfirmado?.id === seleccionada.id &&
    seleccionada.estado === estadoConfirmado.origen
      ? estadoConfirmado.estado
      : seleccionada?.estado;
  const incidenciaVisible = seleccionada && estadoSeleccionado
    ? { ...seleccionada, estado: estadoSeleccionado }
    : seleccionada;
  const accionH11 = estadoSeleccionado
    ? accionEstadoIncidencia(estadoSeleccionado)
    : undefined;

  useEffect(() => {
    if (mensaje) anuncioEstado.current?.focus();
  }, [mensaje]);

  useEffect(() => {
    const dialogo = dialogoEstado.current;
    if (confirmacionEstado && dialogo && !dialogo.open) {
      dialogo.showModal();
      botonVolverDialogo.current?.focus();
    }
  }, [confirmacionEstado]);
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
      setCambiosPendientes(false);
      setVersionEdicion((version) => version + 1);
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

  function descartarCambios() {
    setCambiosPendientes(false);
    setVersionEdicion((version) => version + 1);
    setMensaje(null);
    setError(null);
  }

  function abrirConfirmacionEstado() {
    if (!seleccionada || !estadoSeleccionado || !accionH11 || pending) return;
    if (cambiosPendientes) return;
    setErrorEstado(null);
    setConfirmacionEstado({
      id: seleccionada.id,
      codigo: seleccionada.codigo,
      origen: estadoSeleccionado,
      destino: accionH11.estado,
    });
  }

  function cerrarConfirmacionEstado(restaurarFoco = true) {
    if (pending) return;
    if (dialogoEstado.current?.open) dialogoEstado.current.close();
    setConfirmacionEstado(null);
    if (restaurarFoco) botonAccionEstado.current?.focus();
  }

  function confirmarCambioEstado() {
    if (
      !confirmacionEstado ||
      !seleccionada ||
      !accionH11 ||
      pending ||
      envioEstadoBloqueado.current
    )
      return;
    if (
      seleccionada.id !== confirmacionEstado.id ||
      estadoSeleccionado !== confirmacionEstado.origen ||
      accionH11.estado !== confirmacionEstado.destino
    ) {
      setErrorEstado({
        id: confirmacionEstado.id,
        texto: "El estado cambió mientras confirmabas. Actualiza los datos antes de continuar.",
      });
      cerrarConfirmacionEstado(false);
      router.refresh();
      return;
    }

    envioEstadoBloqueado.current = true;
    setErrorEstado(null);
    startTransition(async () => {
      let resultado;
      try {
        resultado = await actualizarEstadoIncidencia(
          confirmacionEstado.id,
          confirmacionEstado.destino,
        );
      } finally {
        envioEstadoBloqueado.current = false;
      }

      if (resultado?.datos) {
        setEstadoConfirmado({
          id: resultado.datos.id,
          origen: confirmacionEstado.origen,
          estado: resultado.datos.estado,
          esperaRefresco: true,
        });
        setCambiosPendientes(false);
        setVersionEdicion((version) => version + 1);
        setGuardadoId("");
        setMensaje({
          id: resultado.datos.id,
          texto: accionH11.exito,
        });
        if (dialogoEstado.current?.open) dialogoEstado.current.close();
        setConfirmacionEstado(null);

        if (
          !coincideConFiltros(
            { estado: resultado.datos.estado, prioridad: seleccionada.prioridad },
            estado,
            prioridad,
          )
        ) {
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
        return;
      }

      if (resultado?.status === 400) {
        setErrorEstado({
          id: confirmacionEstado.id,
          texto: resultado.error ?? "La solicitud de cambio de estado no es válida.",
        });
        return;
      }

      if (resultado?.status === 403 || resultado?.status === 404) {
        setErrorEstado({
          id: confirmacionEstado.id,
          texto:
            resultado.status === 403
              ? "No tienes permiso para modificar incidencias."
              : "La incidencia ya no está disponible. Se actualizará la lista.",
        });
        if (dialogoEstado.current?.open) dialogoEstado.current.close();
        setConfirmacionEstado(null);
        if (resultado.status === 404) {
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
        return;
      }

      if (
        resultado?.estadoVerificado &&
        resultado.estadoActual &&
        ESTADOS_INCIDENCIA.includes(resultado.estadoActual)
      ) {
        setEstadoConfirmado({
          id: confirmacionEstado.id,
          origen: confirmacionEstado.origen,
          estado: resultado.estadoActual,
          esperaRefresco: resultado.estadoActual !== confirmacionEstado.origen,
        });
        if (
          resultado.estadoActual === "RESUELTA" &&
          resultado.status !== 409
        ) {
          setMensaje({
            id: confirmacionEstado.id,
            texto: "La incidencia quedó resuelta, pero no se pudo confirmar el aviso al residente.",
          });
        } else {
          setErrorEstado({
            id: confirmacionEstado.id,
            texto:
              resultado.status === 409
                ? `El estado cambió a ${etiquetaEstado[resultado.estadoActual]}. Se actualizaron los datos.`
                : resultado.error ?? "El estado actual se verificó y los datos se actualizaron.",
          });
        }
        if (dialogoEstado.current?.open) dialogoEstado.current.close();
        setConfirmacionEstado(null);
        setCambiosPendientes(false);
        setVersionEdicion((version) => version + 1);
        setGuardadoId("");
        router.refresh();
        return;
      }

      setErrorEstado({
        id: confirmacionEstado.id,
        texto:
          resultado?.error ??
          "No se pudo confirmar el cambio. Actualiza los datos antes de volver a intentarlo.",
      });
      setVerificacionPendiente({ id: confirmacionEstado.id, lista: incidencias });
      if (dialogoEstado.current?.open) dialogoEstado.current.close();
      setConfirmacionEstado(null);
      router.refresh();
    });
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
        <p ref={anuncioEstado} tabIndex={-1} role="status" className="rounded-lg border border-success-line bg-success-soft px-4 py-3 text-sm text-success-text">
          {mensaje.texto}
        </p>
      )}
      {!seleccionada && error && (
        <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          {error.texto}
        </p>
      )}
      {!seleccionada && errorEstado && (
        <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          {errorEstado.texto}
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
                              <EstadoPill
                                estado={
                                  estadoConfirmado?.id === incidencia.id &&
                                  incidencia.estado === estadoConfirmado.origen
                                    ? estadoConfirmado.estado
                                    : incidencia.estado
                                }
                              />
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
              <EstadoPill estado={incidenciaVisible!.estado} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Fecha de reporte</dt>
                <dd className="mt-1 font-medium">
                  {fechaIncidencia(seleccionada.creadaAt)}
                </dd>
              </div>
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

            {detalle?.evidencias.length ? (
              <section aria-labelledby="evidencias-incidencia" className="mt-4">
                <h3 id="evidencias-incidencia" className="text-xs font-semibold text-muted">
                  Fotos
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detalle.evidencias.map((evidencia) => (
                    <FotoEvidencia
                      key={evidencia.id}
                      incidenciaId={detalle.id}
                      evidenciaId={evidencia.id}
                      codigo={detalle.codigo}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <ControlesAsignacion
              key={`${seleccionada.id}-${incidenciaVisible!.estado}-${versionEdicion}`}
              incidencia={incidenciaVisible!}
              responsables={responsables}
              errorResponsables={errorResponsables}
              error={error?.id === seleccionada.id ? error.texto : undefined}
              campoError={
                error?.id === seleccionada.id ? error.campo : undefined
              }
              pending={pending}
              guardado={guardadoId === seleccionada.id}
              onCambiosPendientes={(pendiente) => {
                setCambiosPendientes(pendiente);
                editarAsignacion();
              }}
              onGuardar={guardar}
            />

            {accionH11 && (
              <div className="mt-3 space-y-2">
                {estadoConfirmado?.id === seleccionada.id &&
                  estadoConfirmado.esperaRefresco &&
                  seleccionada.estado === estadoConfirmado.origen && (
                    <p role="status" className="text-xs text-muted">
                      Actualizando el estado confirmado…
                    </p>
                  )}
                <button
                  ref={botonAccionEstado}
                  type="button"
                  className="button min-h-10 w-full rounded-lg py-2"
                  disabled={
                    pending ||
                    cambiosPendientes ||
                    verificacionPendienteId === seleccionada.id ||
                    (estadoConfirmado?.id === seleccionada.id &&
                      estadoConfirmado.esperaRefresco &&
                      seleccionada.estado === estadoConfirmado.origen)
                  }
                  onClick={abrirConfirmacionEstado}
                >
                  {accionH11.etiqueta}
                </button>
                {cambiosPendientes && (
                  <div className="rounded-lg border border-line bg-surface-alt p-3 text-xs text-muted">
                    <p>Guarda o descarta los cambios de prioridad y responsable antes de actualizar el estado.</p>
                    <button
                      type="button"
                      className="mt-2 font-semibold text-accent underline"
                      disabled={pending}
                      onClick={descartarCambios}
                    >
                      Descartar cambios
                    </button>
                  </div>
                )}
              </div>
            )}
            {errorEstado?.id === seleccionada.id && (
              <div role="alert" className="mt-3 rounded-lg border border-line bg-surface-alt p-3 text-sm">
                <p>{errorEstado.texto}</p>
                {verificacionPendienteId === seleccionada.id && (
                  <button
                    type="button"
                    className="mt-2 font-semibold text-accent underline"
                    onClick={() => router.refresh()}
                  >
                    Revisar estado
                  </button>
                )}
              </div>
            )}

            <section aria-labelledby="historial-incidencia" className="mt-5 border-t border-line pt-4">
              <h3 id="historial-incidencia" className="font-semibold">
                Historial
              </h3>
              {detalle?.historial?.length ? (
                <ol className="mt-3 space-y-3 border-l border-line pl-4">
                  {detalle.historial.map((evento, indice) => (
                    <li key={`${evento.fecha}-${evento.campo}-${indice}`} className="relative text-xs">
                      <span aria-hidden="true" className="absolute -left-[1.32rem] top-1 size-2 rounded-full bg-accent" />
                      <p className="font-semibold">
                        {descripcionMovimiento(evento.campo, evento.valorAnterior, evento.valorNuevo)}
                      </p>
                      {fechasConHora(evento.fecha) && (
                        <p className="mt-0.5 text-muted">
                          {fechasConHora(evento.fecha)}
                        </p>
                      )}
                      <p className="mt-0.5 text-muted">Por: {evento.actor}</p>
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
      <dialog
        ref={dialogoEstado}
        aria-labelledby="confirmacion-estado-titulo"
        aria-describedby="confirmacion-estado-descripcion"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-0 shadow-2xl backdrop:bg-black/50"
        onCancel={(event) => {
          event.preventDefault();
          cerrarConfirmacionEstado();
        }}
      >
        {confirmacionEstado && (
          <div className="p-5 sm:p-6">
            <h2 id="confirmacion-estado-titulo" className="text-lg font-semibold">
              {confirmacionEstado.destino === "RESUELTA"
                ? "Marcar como resuelta"
                : "Iniciar atención"}
            </h2>
            <p id="confirmacion-estado-descripcion" className="my-4 text-sm leading-6">
              {accionEstadoIncidencia(confirmacionEstado.origen)?.confirmacion(
                confirmacionEstado.codigo,
              )}
            </p>
            {errorEstado?.id === confirmacionEstado.id && (
              <p role="alert" className="field-error mb-4">{errorEstado.texto}</p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                ref={botonVolverDialogo}
                type="button"
                className="button-secondary"
                disabled={pending}
                onClick={() => cerrarConfirmacionEstado()}
              >
                Volver
              </button>
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={confirmarCambioEstado}
              >
                {pending ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

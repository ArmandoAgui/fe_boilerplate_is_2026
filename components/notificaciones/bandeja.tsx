"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ErrorNotificaciones, solicitarJson } from "@/components/notificaciones/api-cliente";
import { useNotificaciones } from "@/components/notificaciones/proveedor";
import {
  crearQueryAvisos,
  crearUrlAvisos,
  esEstadoAviso,
  esModuloAviso,
  ETIQUETA_MODULO,
  formatearFechaAviso,
  MODULOS_AVISO,
  PRESENTACION_MODULO,
  rutaDestinoAviso,
  type Aviso,
  type FiltrosAvisos,
  type ListaAvisos,
} from "@/lib/notificaciones";

const TAMANO_PAGINA = 20;

function interpretarUrl(search: URLSearchParams): FiltrosAvisos {
  const modulos = search.getAll("moduloOrigen");
  const estados = search.getAll("estado");
  const paginas = search.getAll("pagina");
  const moduloOrigen = modulos.length === 1 && esModuloAviso(modulos[0]) ? modulos[0] : "";
  const estado = estados.length === 1 && esEstadoAviso(estados[0]) ? estados[0] : "";
  const paginaCruda = paginas.length === 1 ? paginas[0] : "1";
  const paginaNumero = /^\d+$/.test(paginaCruda) ? Number(paginaCruda) : 1;
  const pagina =
    Number.isSafeInteger(paginaNumero) &&
    paginaNumero > 0 &&
    Number.isSafeInteger((paginaNumero - 1) * TAMANO_PAGINA)
      ? paginaNumero
      : 1;
  return { moduloOrigen, estado, pagina };
}

function esUrlCanonica(search: URLSearchParams, filtros: FiltrosAvisos) {
  const actual = new URLSearchParams(search);
  actual.delete("tamanoPagina");
  for (const clave of [...actual.keys()]) {
    if (!["moduloOrigen", "estado", "pagina"].includes(clave)) actual.delete(clave);
  }
  return actual.toString() === crearUrlAvisos(filtros).toString();
}

function RowAviso({
  aviso,
  pendiente,
  alSeleccionar,
}: {
  aviso: Aviso;
  pendiente: boolean;
  alSeleccionar: (aviso: Aviso) => void;
}) {
  const icono = PRESENTACION_MODULO[aviso.moduloOrigen];
  const destino = rutaDestinoAviso(aviso);
  return (
    <li className="aviso-row">
      <span aria-hidden="true" className={`aviso-icono ${icono.clase}`}>
        {icono.abreviatura}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{aviso.titulo}</h2>
          <span className={aviso.estado === "NO_LEIDA" ? "aviso-no-leida" : "aviso-leida"}>
            {aviso.estado === "NO_LEIDA" && (
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            )}
            {aviso.estado === "NO_LEIDA" ? "No leída" : "Leída"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{aviso.mensaje}</p>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => alSeleccionar(aviso)}
          className="mt-1 inline-flex min-h-7 items-center text-sm font-semibold text-accent underline underline-offset-2 disabled:cursor-wait"
          aria-label={`${destino?.etiqueta ?? "Marcar como leída"}: ${aviso.titulo}`}
        >
          {pendiente ? "Guardando…" : destino?.etiqueta ?? "Marcar como leída"}
        </button>
        {!destino && (
          <p className="mt-1 text-xs text-muted">
            El módulo relacionado aún no está disponible.
          </p>
        )}
      </div>
      <time className="shrink-0 text-xs text-muted" dateTime={aviso.creadaAt}>
        {formatearFechaAviso(aviso.creadaAt)}
      </time>
    </li>
  );
}

export function BandejaAvisos() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { marcarLeido, refrescar: refrescarCampana, estado: estadoCampana } =
    useNotificaciones();
  const cadenaUrl = searchParams.toString();
  const busqueda = useMemo(() => new URLSearchParams(cadenaUrl), [cadenaUrl]);
  const filtros = useMemo(() => interpretarUrl(busqueda), [busqueda]);
  const canonica = useMemo(() => esUrlCanonica(busqueda, filtros), [busqueda, filtros]);
  const [respuesta, setRespuesta] = useState<{
    clave: string;
    lista?: ListaAvisos;
    error?: string;
    sinPermiso?: boolean;
  } | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [intento, setIntento] = useState(0);
  const claveConsulta = `${cadenaUrl}|${intento}`;
  const resultado = respuesta?.clave === claveConsulta ? respuesta : null;
  const lista = resultado?.lista ?? null;
  const cargando = resultado === null;
  const error = resultado?.error ?? "";
  const sinPermiso = resultado?.sinPermiso === true;

  function navegar(nuevos: FiltrosAvisos, reemplazar = false) {
    const query = crearUrlAvisos(nuevos).toString();
    const destino = query ? `${pathname}?${query}` : pathname;
    if (reemplazar) router.replace(destino, { scroll: false });
    else router.push(destino, { scroll: false });
  }

  useEffect(() => {
    if (!canonica) navegar(filtros, true);
    // La navegación se deriva de los parámetros normalizados de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonica, cadenaUrl]);

  useEffect(() => {
    const controlador = new AbortController();
    const query = crearQueryAvisos(filtros).toString();
    void solicitarJson<ListaAvisos>(`/api/notificaciones/mias?${query}`, {
      signal: controlador.signal,
    })
      .then((respuesta) => {
        if (controlador.signal.aborted) return;
        setRespuesta({ clave: claveConsulta, lista: respuesta });
      })
      .catch((fallo) => {
        if (controlador.signal.aborted) return;
        const status = fallo instanceof ErrorNotificaciones ? fallo.status : 0;
        if (status === 401) {
          router.replace("/login?expired=1");
          return;
        }
        if (status === 403) {
          setRespuesta({ clave: claveConsulta, sinPermiso: true });
          return;
        }
        setRespuesta({
          clave: claveConsulta,
          error: fallo instanceof Error ? fallo.message : "No se pudieron cargar los avisos.",
        });
      });
    return () => controlador.abort();
  }, [cadenaUrl, claveConsulta, filtros, intento, router]);

  useEffect(() => {
    if (!lista || cargando) return;
    const ultimaPagina = Math.max(1, Math.ceil(lista.total / TAMANO_PAGINA));
    if (filtros.pagina > ultimaPagina)
      navegar({ ...filtros, pagina: ultimaPagina }, true);
    // Evita consultar una página que dejó de existir tras una lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, cargando, filtros]);

  async function seleccionar(aviso: Aviso) {
    if (pendiente) return;
    setPendiente(aviso.id);
    setFeedback("");
    const resultado = await marcarLeido(aviso.id, aviso.estado);
    setPendiente(null);
    if (!resultado.ok) {
      setFeedback(resultado.error);
      if (resultado.status === 404) setIntento((valor) => valor + 1);
      return;
    }
    setFeedback("Aviso marcado como leído.");
    void refrescarCampana();
    if (aviso.estado === "NO_LEIDA" || !rutaDestinoAviso(aviso))
      setIntento((valor) => valor + 1);
    const destino = rutaDestinoAviso(aviso);
    if (destino) router.push(destino.href);
    else setFeedback("Aviso leído. El módulo relacionado aún no está disponible.");
  }

  if (sinPermiso)
    return (
      <section className="panel" role="alert">
        <h2 className="text-lg font-semibold">No tienes permiso para consultar avisos.</h2>
      </section>
    );

  const ultimaPagina = Math.max(1, Math.ceil((lista?.total ?? 0) / TAMANO_PAGINA));
  const tieneFiltros = Boolean(filtros.moduloOrigen || filtros.estado);

  return (
    <section aria-label="Bandeja de avisos" className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="grid gap-4 border-b border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
        <label className="grid gap-1.5 text-sm font-semibold" htmlFor="filtro-modulo">
          Módulo de origen
          <select
            id="filtro-modulo"
            className="field min-h-10 rounded-lg py-2 font-normal"
            value={filtros.moduloOrigen}
            onChange={(evento) => navegar({ ...filtros, moduloOrigen: evento.target.value as FiltrosAvisos["moduloOrigen"], pagina: 1 })}
          >
            <option value="">Todos</option>
            {MODULOS_AVISO.map((modulo) => (
              <option key={modulo} value={modulo}>{ETIQUETA_MODULO[modulo]}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold" htmlFor="filtro-estado">
          Estado
          <select
            id="filtro-estado"
            className="field min-h-10 rounded-lg py-2 font-normal"
            value={filtros.estado}
            onChange={(evento) => navegar({ ...filtros, estado: evento.target.value as FiltrosAvisos["estado"], pagina: 1 })}
          >
            <option value="">Todos</option>
            <option value="NO_LEIDA">No leída</option>
            <option value="LEIDA">Leída</option>
          </select>
        </label>
      </div>

      {feedback && <p role="status" className="border-b border-line px-4 py-3 text-sm text-muted sm:px-5">{feedback}</p>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <p className="text-sm">{error}</p>
          <button type="button" className="button-secondary min-h-9 px-3 py-1 text-sm" onClick={() => setIntento((valor) => valor + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {cargando && !lista ? (
        <p role="status" aria-live="polite" className="px-4 py-8 text-sm text-muted sm:px-5">
          Cargando avisos…
        </p>
      ) : lista?.datos.length ? (
        <ul className="divide-y divide-line">
          {lista.datos.map((aviso) => (
            <RowAviso key={aviso.id} aviso={aviso} pendiente={pendiente === aviso.id} alSeleccionar={seleccionar} />
          ))}
        </ul>
      ) : !error && lista && lista.total === 0 ? (
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="font-semibold">{tieneFiltros ? "No hay avisos que coincidan con estos filtros" : "No tienes avisos"}</p>
          {tieneFiltros && (
            <button type="button" className="mt-3 font-medium text-accent underline" onClick={() => navegar({ moduloOrigen: "", estado: "", pagina: 1 })}>
              Restablecer filtros
            </button>
          )}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
        <p aria-live="polite">
          {lista ? `${lista.total} ${lista.total === 1 ? "aviso" : "avisos"}, ${lista.noLeidas} ${lista.noLeidas === 1 ? "no leído" : "no leídos"}` : "Conteo de avisos pendiente"}
          {estadoCampana === "error" && <span className="sr-only"> El contador de campana conserva su último valor confirmado.</span>}
        </p>
        <nav aria-label="Paginación de avisos" className="flex items-center gap-3">
          <button type="button" className="button-secondary min-h-9 px-3 py-1 text-xs" disabled={filtros.pagina <= 1 || cargando} onClick={() => navegar({ ...filtros, pagina: filtros.pagina - 1 })}>
            Anterior
          </button>
          <span>Página {filtros.pagina} de {ultimaPagina}</span>
          <button type="button" className="button-secondary min-h-9 px-3 py-1 text-xs" disabled={filtros.pagina >= ultimaPagina || cargando} onClick={() => navegar({ ...filtros, pagina: filtros.pagina + 1 })}>
            Siguiente
          </button>
        </nav>
      </footer>
      {cargando && lista && <span aria-live="polite" className="sr-only">Actualizando avisos…</span>}
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNotificaciones } from "@/components/notificaciones/proveedor";
import { formatearFechaAviso, rutaDestinoAviso } from "@/lib/notificaciones";

function nombreContador(cantidad: number | null, estado: string) {
  if (cantidad === null)
    return estado === "error" ? "Avisos, no disponibles" : "Avisos, cargando";
  return cantidad === 1 ? "1 aviso sin leer" : `${cantidad} avisos sin leer`;
}

export function CampanaAvisos() {
  const [rutaAlAbrir, setRutaAlAbrir] = useState<string | null>(null);
  const [accion, setAccion] = useState("");
  const [idPendiente, setIdPendiente] = useState<string | null>(null);
  const [idReintentar, setIdReintentar] = useState<string | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { estado, noLeidas, recientes, error, refrescar, marcarLeido } =
    useNotificaciones();
  const router = useRouter();
  const pathname = usePathname();
  const abierta = rutaAlAbrir === pathname;

  useEffect(() => {
    if (!abierta) return;
    function alPresionar(evento: MouseEvent | KeyboardEvent) {
      if (evento instanceof KeyboardEvent && evento.key === "Escape") {
        setRutaAlAbrir(null);
        boton.current?.focus();
      }
      if (
        evento instanceof MouseEvent &&
        !panel.current?.contains(evento.target as Node) &&
        !boton.current?.contains(evento.target as Node)
      ) {
        setRutaAlAbrir(null);
      }
    }
    document.addEventListener("keydown", alPresionar);
    document.addEventListener("mousedown", alPresionar);
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.removeEventListener("mousedown", alPresionar);
    };
  }, [abierta]);

  async function seleccionar(id: string, estadoAviso: "NO_LEIDA" | "LEIDA", href: string | null) {
    if (idPendiente) return;
    setIdPendiente(id);
    setAccion("");
    const resultado = await marcarLeido(id, estadoAviso);
    setIdPendiente(null);
    if (!resultado.ok) {
      setAccion(resultado.error);
      setIdReintentar(id);
      return;
    }
    setIdReintentar(null);
    if (href) {
      setRutaAlAbrir(null);
      router.push(href);
      return;
    }
    setAccion("Aviso leído. Este módulo aún no está disponible.");
  }

  const contador = noLeidas === null ? null : noLeidas > 99 ? "99+" : String(noLeidas);

  return (
    <div className="relative">
      <button
        ref={boton}
        type="button"
        aria-label={nombreContador(noLeidas, estado)}
        aria-expanded={abierta}
        aria-controls="panel-avisos-recientes"
        onClick={() => setRutaAlAbrir((valor) => (valor === pathname ? null : pathname))}
        className="relative grid size-10 place-items-center rounded-full border border-line bg-surface text-foreground hover:bg-surface-alt"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {contador !== null && noLeidas! > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#a83d32] px-1 text-[10px] font-bold leading-5 text-white">
            {contador}
          </span>
        )}
      </button>

      {abierta && (
        <div
          ref={panel}
          id="panel-avisos-recientes"
          role="region"
          aria-label="Avisos recientes"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">
              {noLeidas === null
                ? "Avisos sin leer"
                : `${noLeidas} ${noLeidas === 1 ? "aviso" : "avisos"} sin leer`}
            </h2>
            {estado === "cargando" && <span className="text-xs text-muted">Actualizando…</span>}
          </div>
          {error && (
            <div role="alert" className="border-b border-line px-4 py-3 text-sm text-muted">
              <p>{error}</p>
              <button type="button" className="mt-2 underline" onClick={() => void refrescar()}>
                Reintentar
              </button>
            </div>
          )}
          {recientes.length ? (
            <ul className="divide-y divide-line">
              {recientes.map((aviso) => {
                const destino = rutaDestinoAviso(aviso);
                return (
                  <li key={aviso.id}>
                    <button
                      type="button"
                      disabled={idPendiente === aviso.id}
                      onClick={() => void seleccionar(aviso.id, aviso.estado, destino?.href ?? null)}
                      className="block w-full px-4 py-3 text-left hover:bg-surface-alt disabled:opacity-60"
                    >
                      <span className="block text-sm font-semibold">{idPendiente === aviso.id ? "Guardando…" : aviso.titulo}</span>
                      <time className="mt-1 block text-xs text-muted" dateTime={aviso.creadaAt}>
                        {formatearFechaAviso(aviso.creadaAt)}
                      </time>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : estado === "listo" ? (
            <p className="px-4 py-4 text-sm text-muted">No tienes avisos sin leer.</p>
          ) : !error ? (
            <p aria-live="polite" className="px-4 py-4 text-sm text-muted">Cargando avisos…</p>
          ) : null}
          {idReintentar && recientes.some((aviso) => aviso.id === idReintentar) && (
            <div className="border-t border-line px-4 py-3">
              <button
                type="button"
                className="font-medium text-accent underline"
                onClick={() => {
                  const aviso = recientes.find((item) => item.id === idReintentar);
                  if (aviso) void seleccionar(aviso.id, aviso.estado, rutaDestinoAviso(aviso)?.href ?? null);
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          {accion && <p role="status" className="border-t border-line px-4 py-3 text-sm text-muted">{accion}</p>}
          <div className="border-t border-line px-4 py-3">
            <Link className="font-medium text-accent underline" href="/avisos" onClick={() => setRutaAlAbrir(null)}>
              Ver todos los avisos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

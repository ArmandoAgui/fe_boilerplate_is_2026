"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ErrorNotificaciones,
  solicitarJson,
} from "@/components/notificaciones/api-cliente";
import type { Aviso, EstadoAviso, ListaAvisos } from "@/lib/notificaciones";

type EstadoProveedor = {
  estado: "cargando" | "listo" | "error" | "sin-permiso";
  noLeidas: number | null;
  recientes: Aviso[];
  error: string;
};

type ResultadoLectura = { ok: true } | { ok: false; status: number; error: string };

type ContextoNotificaciones = EstadoProveedor & {
  refrescar: () => Promise<void>;
  marcarLeido: (id: string, estado: EstadoAviso) => Promise<ResultadoLectura>;
};

const Contexto = createContext<ContextoNotificaciones | null>(null);
const estadoInicial: EstadoProveedor = {
  estado: "cargando",
  noLeidas: null,
  recientes: [],
  error: "",
};

export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [datos, setDatos] = useState(estadoInicial);
  const solicitudActual = useRef<AbortController | null>(null);
  const promesaActual = useRef<Promise<void> | null>(null);
  const generacion = useRef(0);
  const bloqueado = useRef(false);
  const lecturasPendientes = useRef(new Set<string>());

  const refrescar = useCallback(() => {
    if (bloqueado.current) return Promise.resolve();
    if (promesaActual.current) return promesaActual.current;

    const controlador = new AbortController();
    const version = ++generacion.current;
    solicitudActual.current = controlador;
    const promesa = (async () => {
      try {
        const respuesta = await solicitarJson<ListaAvisos>(
          "/api/notificaciones/mias?estado=NO_LEIDA&pagina=1&tamanoPagina=2",
          { signal: controlador.signal },
        );
        if (version !== generacion.current) return;
        setDatos({
          estado: "listo",
          noLeidas: respuesta.noLeidas,
          recientes: respuesta.datos,
          error: "",
        });
      } catch (error) {
        if (version !== generacion.current || controlador.signal.aborted) return;
        if (error instanceof ErrorNotificaciones && error.status === 401) {
          bloqueado.current = true;
          setDatos({ ...estadoInicial, estado: "error", error: "La sesión expiró." });
          router.replace("/login?expired=1");
          return;
        }
        if (error instanceof ErrorNotificaciones && error.status === 403) {
          bloqueado.current = true;
          setDatos({ ...estadoInicial, estado: "sin-permiso" });
          return;
        }
        setDatos((actual) => ({
          ...actual,
          estado: actual.noLeidas === null ? "error" : actual.estado,
          error:
            error instanceof Error
              ? error.message
              : "No se pudieron actualizar los avisos.",
        }));
      } finally {
        if (solicitudActual.current === controlador) {
          solicitudActual.current = null;
          promesaActual.current = null;
        }
      }
    })();
    promesaActual.current = promesa;
    return promesa;
  }, [router]);

  const marcarLeido = useCallback(
    async (id: string, estado: EstadoAviso): Promise<ResultadoLectura> => {
      if (lecturasPendientes.current.has(id))
        return { ok: false, status: 409, error: "El aviso ya se está actualizando." };
      lecturasPendientes.current.add(id);
      generacion.current += 1;
      solicitudActual.current?.abort();
      solicitudActual.current = null;
      promesaActual.current = null;

      try {
        await solicitarJson<{ id: string; estado: "LEIDA"; leidaAt: string }>(
          `/api/notificaciones/${encodeURIComponent(id)}/lectura`,
          { method: "PATCH" },
        );
        setDatos((actual) => ({
          ...actual,
          noLeidas:
            estado === "NO_LEIDA" && actual.noLeidas !== null
              ? Math.max(0, actual.noLeidas - 1)
              : actual.noLeidas,
          recientes: actual.recientes.filter((aviso) => aviso.id !== id),
          error: "",
        }));
        void refrescar();
        return { ok: true };
      } catch (error) {
        const status = error instanceof ErrorNotificaciones ? error.status : 0;
        if (status === 401) {
          bloqueado.current = true;
          setDatos({ ...estadoInicial, estado: "error", error: "La sesión expiró." });
          router.replace("/login?expired=1");
        } else if (status === 403) {
          bloqueado.current = true;
          setDatos({ ...estadoInicial, estado: "sin-permiso" });
        } else if (status === 404) {
          void refrescar();
        }
        return {
          ok: false,
          status,
          error:
            status === 404
              ? "El aviso ya no está disponible."
              : error instanceof Error
                ? error.message
                : "No se pudo marcar el aviso como leído.",
        };
      } finally {
        lecturasPendientes.current.delete(id);
      }
    },
    [refrescar, router],
  );

  useEffect(() => {
    void refrescar();
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === "visible") void refrescar();
    }, 30_000);
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") void refrescar();
    };
    document.addEventListener("visibilitychange", alVolverVisible);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", alVolverVisible);
      generacion.current += 1;
      solicitudActual.current?.abort();
      solicitudActual.current = null;
      promesaActual.current = null;
    };
  }, [refrescar]);

  return (
    <Contexto.Provider value={{ ...datos, refrescar, marcarLeido }}>
      {children}
    </Contexto.Provider>
  );
}

export function useNotificaciones() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("Falta ProveedorNotificaciones");
  return contexto;
}

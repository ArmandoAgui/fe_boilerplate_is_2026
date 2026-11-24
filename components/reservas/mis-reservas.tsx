"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelarReserva, eliminarReserva } from "@/app/actions/reservas";
import {
  puedeCancelar,
  puedeEliminar,
  fechaHora,
  hora,
  type ListaReservas,
  type Reserva,
} from "@/lib/reservas";
export function MisReservas({
  lista,
  solicitada,
}: {
  lista: ListaReservas;
  solicitada?: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [seleccionada, setSeleccionada] = useState<Reserva>();
  const [canceladas, setCanceladas] = useState<string[]>([]);
  const [eliminadas, setEliminadas] = useState<string[]>([]);
  const [accion, setAccion] = useState<"cancelar" | "eliminar">("cancelar");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const visibles = lista.datos.filter((r) => !eliminadas.includes(r.id));
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  function abrir(r: Reserva, operacion: "cancelar" | "eliminar" = "cancelar") {
    setSeleccionada(r);
    setAccion(operacion);
    setError("");
    dialog.current?.showModal();
  }
  function cancelar() {
    if (!seleccionada) return;
    startTransition(async () => {
      const result =
        accion === "eliminar"
          ? await eliminarReserva(seleccionada.id)
          : await cancelarReserva(seleccionada.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (accion === "eliminar") {
        setEliminadas((prev) => [...prev, seleccionada.id]);
        setMensaje(
          "Reserva eliminada de tu listado. Se conserva el historial.",
        );
        if (visibles.length === 1 && lista.pagina > 1)
          router.push(`?pagina=${lista.pagina - 1}`);
      } else {
        setCanceladas((prev) => [...prev, seleccionada.id]);
        setMensaje("Reserva cancelada");
      }
      dialog.current?.close();
      router.refresh();
    });
  }
  return (
    <>
      {solicitada && (
        <p role="status" className="panel mb-5 border-accent">
          Solicitud enviada · {solicitada}. El horario queda reservado solo
          cuando el administrador la apruebe.
        </p>
      )}
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>
      {visibles.length === 0 ? (
        <p className="panel">Aún no tienes reservas</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibles.map((original) => {
            const r = canceladas.includes(original.id)
              ? { ...original, estado: "CANCELADA" as const }
              : original;
            return (
              <article key={r.id} className="panel">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-mono text-sm">{r.codigo}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${r.estado === "PENDIENTE" ? "status-pending" : r.estado === "CANCELADA" || r.estado === "RECHAZADA" ? "status-cancelled" : "status-confirmed"}`}
                  >
                    {r.estado === "PENDIENTE"
                      ? "Pendiente de aprobación"
                      : r.estado === "CONFIRMADA"
                        ? "Confirmada"
                        : r.estado === "RECHAZADA"
                          ? "Rechazada"
                          : "Cancelada"}
                  </span>
                </div>
                <h2 className="my-3 text-xl font-semibold">{r.areaNombre}</h2>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="inline text-muted">Fecha y horario: </dt>
                    <dd className="inline">
                      {fechaHora(r.inicio)} – {hora(r.fin)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Asistentes: </dt>
                    <dd className="inline">{r.asistentes}</dd>
                  </div>
                </dl>
                {r.estado === "RECHAZADA" && r.motivoRechazo && (
                  <p className="mt-3 text-sm">
                    Motivo del rechazo: {r.motivoRechazo}
                  </p>
                )}
                {(r.estado === "PENDIENTE" || r.estado === "CONFIRMADA") &&
                  new Date(r.fin).getTime() > ahora &&
                  !puedeCancelar(r, ahora) && (
                    <p className="mt-3 text-sm text-muted">
                      Ya no puedes cancelar: se requieren al menos 24 horas de
                      anticipación.
                    </p>
                  )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    className="text-sm underline"
                    href={`/areas/${r.areaId}/disponibilidad?fecha=${new Date(new Date(r.inicio).getTime() - 6 * 3600000).toISOString().slice(0, 10)}`}
                  >
                    Ver disponibilidad
                  </Link>
                  {puedeCancelar(r, ahora) && (
                    <button
                      className="button-secondary"
                      onClick={() => abrir(r)}
                      disabled={pending}
                    >
                      Cancelar
                    </button>
                  )}
                  {puedeEliminar(r, ahora) && (
                    <button
                      className="button-secondary"
                      onClick={() => abrir(r, "eliminar")}
                      disabled={pending}
                    >
                      Eliminar del listado
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          className="button-secondary"
          disabled={lista.pagina <= 1}
          onClick={() => router.push(`?pagina=${lista.pagina - 1}`)}
        >
          Anterior
        </button>
        <p className="text-sm">
          Página {lista.pagina} · {lista.total} reservas
        </p>
        <button
          className="button-secondary"
          disabled={lista.pagina * lista.tamanoPagina >= lista.total}
          onClick={() => router.push(`?pagina=${lista.pagina + 1}`)}
        >
          Siguiente
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="cancelacion-titulo"
        className="panel m-auto max-w-md"
      >
        <h2 id="cancelacion-titulo" className="text-lg font-semibold">
          ¿{accion === "eliminar" ? "Eliminar del listado" : "Cancelar"} la
          reserva {seleccionada?.codigo}?
        </h2>
        <p className="mt-3">
          {accion === "eliminar"
            ? "Dejará de aparecer en Mis reservas. Conservaremos el historial; esta acción no cancela reservas activas."
            : "Esta acción no se puede deshacer."}
        </p>
        <p role="alert" className="field-error my-4">
          {error}
        </p>
        <div className="flex gap-3">
          <button className="button" onClick={cancelar} disabled={pending}>
            {pending
              ? "Guardando…"
              : accion === "eliminar"
                ? "Confirmar eliminación"
                : "Cancelar reserva"}
          </button>
          <button
            className="button-secondary"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
        </div>
      </dialog>
    </>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprobarReserva } from "@/app/actions/reservas";
import {
  fechaHora,
  hora,
  type ListaReservas,
  type Reserva,
} from "@/lib/reservas";

export function AprobarReservas({ lista }: { lista: ListaReservas }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [seleccionada, setSeleccionada] = useState<Reserva>();
  const [aprobadas, setAprobadas] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pending, startTransition] = useTransition();
  const solicitudes = lista.datos.filter((r) => !aprobadas.includes(r.id));
  function abrir(reserva: Reserva) {
    setSeleccionada(reserva);
    setError("");
    dialog.current?.showModal();
  }
  function aprobar() {
    if (!seleccionada) return;
    startTransition(async () => {
      const resultado = await aprobarReserva(seleccionada.id);
      if (resultado.error) {
        setError(resultado.error);
        router.refresh();
        return;
      }
      setAprobadas((prev) => [...prev, seleccionada.id]);
      setMensaje(`Reserva ${seleccionada.codigo} aprobada`);
      dialog.current?.close();
      router.refresh();
    });
  }
  return (
    <>
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>
      {solicitudes.length === 0 ? (
        <p className="panel">No hay solicitudes pendientes en esta página</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {solicitudes.map((r) => (
            <article key={r.id} className="panel">
              <p className="font-mono text-sm">{r.codigo}</p>
              <h2 className="my-3 text-xl font-semibold">{r.areaNombre}</h2>
              <p>Residente: {r.residenteNombre}</p>
              <p>
                {fechaHora(r.inicio)} – {hora(r.fin)}
              </p>
              <p>Asistentes: {r.asistentes}</p>
              <p className="my-3 text-sm text-muted">
                Pendiente de aprobación · No aparta el horario
              </p>
              <button
                className="button"
                onClick={() => abrir(r)}
                disabled={pending}
              >
                Aprobar
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          className="button-secondary"
          disabled={lista.pagina <= 1 || pending}
          onClick={() => router.push(`?pagina=${lista.pagina - 1}`)}
        >
          Anterior
        </button>
        <p className="text-sm">
          Página {lista.pagina} · {lista.total} solicitudes
        </p>
        <button
          className="button-secondary"
          disabled={lista.pagina * lista.tamanoPagina >= lista.total || pending}
          onClick={() => router.push(`?pagina=${lista.pagina + 1}`)}
        >
          Siguiente
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="aprobacion-titulo"
        className="panel m-auto max-w-md"
      >
        <h2 id="aprobacion-titulo" className="text-lg font-semibold">
          ¿Aprobar la reserva {seleccionada?.codigo}?
        </h2>
        <p className="my-3">
          Al aprobar se confirma la reserva y se ocupa el horario.
        </p>
        <p role="alert" className="field-error my-4">
          {error}
        </p>
        <div className="flex gap-3">
          <button className="button" onClick={aprobar} disabled={pending}>
            {pending ? "Aprobando…" : "Aprobar reserva"}
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

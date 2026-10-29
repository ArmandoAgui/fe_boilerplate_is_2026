"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelarReserva } from "@/app/actions/reservas";
import {
  puedeCancelar,
  fechaHora,
  hora,
  type ListaReservas,
  type Reserva,
} from "@/lib/reservas";
export function MisReservas({
  lista,
  confirmada,
}: {
  lista: ListaReservas;
  confirmada?: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [seleccionada, setSeleccionada] = useState<Reserva>();
  const [canceladas, setCanceladas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  function abrir(r: Reserva) {
    setSeleccionada(r);
    setError("");
    dialog.current?.showModal();
  }
  function cancelar() {
    if (!seleccionada) return;
    startTransition(async () => {
      const result = await cancelarReserva(seleccionada.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCanceladas((prev) => [...prev, seleccionada.id]);
      setMensaje("Reserva cancelada");
      dialog.current?.close();
      router.refresh();
    });
  }
  return (
    <>
      {confirmada && (
        <p role="status" className="panel mb-5 border-accent">
          Reserva confirmada · {confirmada}
        </p>
      )}
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>
      {lista.datos.length === 0 ? (
        <p className="panel">Aún no tienes reservas</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.datos.map((original) => {
            const r = canceladas.includes(original.id)
              ? { ...original, estado: "CANCELADA" as const }
              : original;
            return (
              <article key={r.id} className="panel">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-mono text-sm">{r.codigo}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${r.estado === "CONFIRMADA" ? "status-confirmed" : "status-cancelled"}`}
                  >
                    {r.estado === "CONFIRMADA" ? "Confirmada" : "Cancelada"}
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
                    <dt className="inline text-muted">Unidad: </dt>
                    <dd className="inline">{r.unidadCodigo}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Asistentes: </dt>
                    <dd className="inline">{r.asistentes}</dd>
                  </div>
                </dl>
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
                    >
                      Cancelar
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
          ¿Cancelar la reserva {seleccionada?.codigo}? Esta acción no se puede
          deshacer
        </h2>
        <p role="alert" className="field-error my-4">
          {error}
        </p>
        <div className="flex gap-3">
          <button className="button" onClick={cancelar} disabled={pending}>
            {pending ? "Cancelando…" : "Cancelar reserva"}
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

"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarAutorizacion } from "@/app/actions/visitas";
import { Estado } from "@/components/visitas/ui";
import {
  fechaHora,
  type Autorizacion,
  type ListaAutorizaciones,
} from "@/lib/visitas";

export function MisVisitas({
  lista,
  autorizada,
}: {
  lista: ListaAutorizaciones;
  autorizada?: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [seleccionada, setSeleccionada] = useState<Autorizacion>();
  const [canceladas, setCanceladas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  // Vencida se deriva del fin, así que el botón Cancelar debe desaparecer solo
  // cuando pasa la hora, sin que el residente recargue la página.
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  function abrir(a: Autorizacion) {
    setSeleccionada(a);
    setError("");
    dialog.current?.showModal();
  }

  function cancelar() {
    if (!seleccionada) return;
    startTransition(async () => {
      const result = await cancelarAutorizacion(seleccionada.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCanceladas((prev) => [...prev, seleccionada.id]);
      setMensaje("Autorización cancelada");
      dialog.current?.close();
      router.refresh();
    });
  }

  const paginas = Math.max(1, Math.ceil(lista.total / lista.tamanoPagina));

  return (
    <>
      {autorizada && (
        <p role="status" className="panel mb-5 border-accent">
          Visita autorizada · {autorizada}
        </p>
      )}
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>

      {lista.datos.length === 0 ? (
        <p className="panel">No tienes visitas autorizadas</p>
      ) : (
        <div className="panel p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Visitas que autorizaste para tus unidades
              </caption>
              <thead>
                <tr className="border-b border-line">
                  {["Visitante", "Unidad", "Inicio", "Fin", "Estado", ""].map(
                    (t, i) => (
                      <th key={t || i} scope="col" className="p-4 font-medium">
                        {t || <span className="sr-only">Acciones</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((original) => {
                  const a = canceladas.includes(original.id)
                    ? { ...original, estado: "CANCELADA" as const }
                    : original;
                  // Una vigente cuyo fin ya pasó se muestra y se trata como
                  // Vencida, aunque la base siga guardando VIGENTE.
                  const vigente =
                    a.estado === "VIGENTE" && new Date(a.fin).getTime() > ahora;
                  const estado =
                    a.estado === "VIGENTE" && !vigente ? "VENCIDA" : a.estado;
                  return (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <th scope="row" className="p-4 font-normal">
                        {a.visitanteNombre}
                      </th>
                      <td className="p-4">{a.unidadCodigo}</td>
                      <td className="p-4 whitespace-nowrap">
                        {fechaHora(a.inicio)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {fechaHora(a.fin)}
                      </td>
                      <td className="p-4">
                        <Estado estado={estado} />
                      </td>
                      <td className="p-4 text-right">
                        {vigente && (
                          <button
                            className="button-secondary text-[var(--danger)]"
                            aria-label={`Cancelar la autorización de ${a.visitanteNombre}`}
                            onClick={() => abrir(a)}
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 p-4">
            {paginas > 1 && (
              <>
                <button
                  className="button-secondary"
                  disabled={lista.pagina <= 1}
                  onClick={() => router.push(`?pagina=${lista.pagina - 1}`)}
                >
                  Anterior
                </button>
                <button
                  className="button-secondary"
                  disabled={lista.pagina >= paginas}
                  onClick={() => router.push(`?pagina=${lista.pagina + 1}`)}
                >
                  Siguiente
                </button>
              </>
            )}
            <p className="text-sm text-muted">
              Página {lista.pagina} de {paginas}
            </p>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="cancelacion-visita-titulo"
        className="panel m-auto max-w-md"
      >
        <h2 id="cancelacion-visita-titulo" className="text-xl font-semibold">
          Cancelar autorización
        </h2>
        <p className="mt-3">
          ¿Cancelar la autorización de {seleccionada?.visitanteNombre}?
        </p>
        <p role="alert" className="field-error my-3">
          {error}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="button-secondary"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
          <button className="button" onClick={cancelar} disabled={pending}>
            {pending ? "Cancelando…" : "Cancelar autorización"}
          </button>
        </div>
      </dialog>
    </>
  );
}

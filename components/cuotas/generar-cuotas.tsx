"use client";
import { useRef, useState, useTransition } from "react";
import { generarCuotas, obtenerPrevia } from "@/app/actions/cuotas";
import { Cifra } from "@/components/cuotas/ui";
import {
  CONCEPTO_MANTENIMIENTO,
  dinero,
  errorPeriodo,
  motivoOmision,
  type PreviaGeneracion,
  type ResultadoGeneracion,
} from "@/lib/cuotas";

export function GenerarCuotas({
  previaInicial,
  mesActual,
  mesSiguiente,
}: {
  previaInicial: PreviaGeneracion;
  mesActual: string;
  mesSiguiente: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [periodo, setPeriodo] = useState(previaInicial.periodo);
  const [previa, setPrevia] = useState<PreviaGeneracion | null>(previaInicial);
  const [resultado, setResultado] = useState<ResultadoGeneracion>();
  const [error, setError] = useState("");
  const [cargando, startCarga] = useTransition();
  const [generando, startGeneracion] = useTransition();
  // Evita mostrar la previa de un período anterior si el usuario cambia rápido.
  const ultimoPedido = useRef(previaInicial.periodo);

  const errPeriodo = errorPeriodo(periodo, mesActual);
  const sinUnidades = previa !== null && previa.unidadesAGenerar === 0;
  const deshabilitado =
    Boolean(errPeriodo) || cargando || generando || !previa || sinUnidades;

  function cambiarPeriodo(valor: string) {
    setPeriodo(valor);
    setResultado(undefined);
    setError("");
    if (errorPeriodo(valor, mesActual)) {
      setPrevia(null);
      return;
    }
    ultimoPedido.current = valor;
    startCarga(async () => {
      const r = await obtenerPrevia(valor);
      if (ultimoPedido.current !== valor) return;
      if (r.error) {
        setPrevia(null);
        setError(r.error);
        return;
      }
      setPrevia(r.datos ?? null);
    });
  }

  function confirmar() {
    startGeneracion(async () => {
      const r = await generarCuotas(periodo);
      if (r.error) {
        setError(r.error);
        dialog.current?.close();
        return;
      }
      setResultado(r.datos);
      dialog.current?.close();
      // Tras generar, la previa se recalcula: ahora todas ya tienen cuota.
      const nueva = await obtenerPrevia(periodo);
      if (nueva.datos) setPrevia(nueva.datos);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="panel grid content-start gap-4">
        <div className="text-sm">
          <label htmlFor="periodo" className="block font-medium">
            Período
          </label>
          <input
            id="periodo"
            type="month"
            className={`field mt-1 w-full${errPeriodo ? " border-[var(--danger)]" : ""}`}
            value={periodo}
            min={mesActual}
            max={mesSiguiente}
            onChange={(e) => cambiarPeriodo(e.target.value)}
            aria-describedby="periodo-ayuda"
            aria-invalid={Boolean(errPeriodo)}
          />
          <p id="periodo-ayuda" className="mt-1 text-xs text-muted">
            Mes actual o el siguiente
          </p>
          {errPeriodo && (
            <p role="alert" className="field-error">
              {errPeriodo}
            </p>
          )}
        </div>
        <label className="block text-sm font-medium">
          Concepto
          <input
            className="field mt-1 w-full"
            value={CONCEPTO_MANTENIMIENTO}
            readOnly
          />
        </label>
        <div>
          <button
            className="button"
            disabled={deshabilitado}
            onClick={() => dialog.current?.showModal()}
          >
            Generar cuotas
          </button>
        </div>
      </section>

      <section className="panel" aria-live="polite" aria-busy={cargando}>
        <h2 className="mb-4 text-lg font-semibold">
          Resumen previo, período {periodo}
        </h2>
        {cargando ? (
          <p className="text-muted">Cargando…</p>
        ) : previa ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Cifra
                etiqueta="Unidades a generar"
                valor={String(previa.unidadesAGenerar)}
              />
              <Cifra
                etiqueta="Unidades omitidas"
                valor={String(previa.unidadesOmitidas)}
              />
              <Cifra etiqueta="Total" valor={dinero(previa.totalUsd)} />
            </div>
            {sinUnidades && (
              <p className="mt-4 text-muted">
                Todas las unidades ya tienen cuota para este período
              </p>
            )}
          </>
        ) : (
          <p className="text-muted">
            Elija un período válido para ver el resumen.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="panel field-error lg:col-span-2">
          {error}
        </p>
      )}

      {resultado && (
        <section role="status" className="panel border-accent lg:col-span-2">
          <p className="font-semibold">
            Se crearon {resultado.creadas} cuotas, {resultado.omitidas.length}{" "}
            omitidas
          </p>
          {resultado.omitidas.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {resultado.omitidas.map((o) => (
                <li key={o.unidadId}>
                  {o.codigo}: {motivoOmision[o.motivo]}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="generar-cuotas-titulo"
        className="panel m-auto max-w-md"
      >
        <h2 id="generar-cuotas-titulo" className="text-xl font-semibold">
          Generar cuotas
        </h2>
        <p className="mt-3">
          ¿Generar cuotas del período {periodo} para{" "}
          {previa?.unidadesAGenerar ?? 0} unidades?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="button-secondary"
            disabled={generando}
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
          <button className="button" onClick={confirmar} disabled={generando}>
            {generando ? "Generando…" : "Generar cuotas"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

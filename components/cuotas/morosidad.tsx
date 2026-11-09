"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { obtenerDetalleMorosidad } from "@/app/actions/cuotas";
import {
  dinero,
  fechaCorta,
  sumarMontos,
  torresDe,
  type DetalleMorosidad,
  type FilaMorosidad,
} from "@/lib/cuotas";

const POR_PAGINA = 20;

export function Morosidad({ filas }: { filas: FilaMorosidad[] }) {
  const [torre, setTorre] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccionada, setSeleccionada] = useState<FilaMorosidad>();
  const [detalle, setDetalle] = useState<DetalleMorosidad>();
  const [error, setError] = useState("");
  const [cargando, startCarga] = useTransition();
  // Si el administrador cambia de fila rápido, solo se muestra la última.
  const ultimaPedida = useRef("");

  const torres = useMemo(() => torresDe(filas), [filas]);
  // El backend ya entrega las filas ordenadas por antigüedad y código;
  // filtrar conserva ese orden.
  const visibles = torre ? filas.filter((f) => f.torre === torre) : filas;
  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const enPagina = visibles.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );

  function abrir(fila: FilaMorosidad) {
    setSeleccionada(fila);
    setDetalle(undefined);
    setError("");
    ultimaPedida.current = fila.unidadId;
    startCarga(async () => {
      const r = await obtenerDetalleMorosidad(fila.unidadId);
      if (ultimaPedida.current !== fila.unidadId) return;
      if (r.error) setError(r.error);
      else setDetalle(r.datos);
    });
  }

  if (filas.length === 0)
    return <p className="panel">No hay unidades morosas</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <div className="mb-4 text-sm">
          <label htmlFor="torre" className="block font-medium">
            Torre
          </label>
          <select
            id="torre"
            className="field mt-1"
            value={torre}
            onChange={(e) => {
              setTorre(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {torres.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="panel p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Unidades con cuotas vencidas, de la más antigua a la más reciente
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-4 font-medium">Unidad</th>
                  <th scope="col" className="p-4 font-medium">Torre</th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Cuotas vencidas
                  </th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Saldo vencido
                  </th>
                  <th scope="col" className="p-4 font-medium">
                    Vencimiento más antiguo
                  </th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Días de atraso
                  </th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map((f) => {
                  const activa = seleccionada?.unidadId === f.unidadId;
                  return (
                    <tr
                      key={f.unidadId}
                      className={`border-b border-line last:border-0${activa ? " bg-surface-alt" : ""}`}
                    >
                      <th scope="row" className="p-4 font-semibold">
                        <button
                          className="underline"
                          aria-label={`Ver cuotas vencidas de ${f.codigo}`}
                          aria-pressed={activa}
                          onClick={() => abrir(f)}
                        >
                          {f.codigo}
                        </button>
                      </th>
                      <td className="p-4 whitespace-nowrap">{f.torre}</td>
                      <td className="p-4 text-right tabular-nums">
                        {f.cuotasVencidas}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {dinero(f.saldoVencido)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {fechaCorta(f.vencimientoMasAntiguo)}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {f.diasAtraso}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted">
              {visibles.length} unidades morosas · saldo vencido{" "}
              {dinero(sumarMontos(visibles.map((f) => f.saldoVencido)))}
            </p>
            <div className="flex items-center gap-3">
              {paginas > 1 && (
                <>
                  <button
                    className="button-secondary"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(paginaActual - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="button-secondary"
                    disabled={paginaActual >= paginas}
                    onClick={() => setPagina(paginaActual + 1)}
                  >
                    Siguiente
                  </button>
                </>
              )}
              <p className="text-sm text-muted">
                Página {paginaActual} de {paginas}
              </p>
            </div>
          </div>
        </div>
      </div>

      {seleccionada && (
        <aside className="panel self-start" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Unidad {seleccionada.codigo}
              </h2>
              <p className="text-sm text-muted">{seleccionada.torre}</p>
            </div>
            <button
              className="button-secondary"
              onClick={() => setSeleccionada(undefined)}
            >
              Cerrar
            </button>
          </div>
          <p className="mt-4 text-sm text-muted">Saldo vencido</p>
          <p className="text-3xl font-semibold tabular-nums">
            {dinero(seleccionada.saldoVencido)}
          </p>
          {cargando && <p className="mt-4 text-muted">Cargando…</p>}
          {error && (
            <p role="alert" className="field-error mt-4">
              {error}
            </p>
          )}
          {detalle && (
            <table className="mt-4 w-full text-left text-sm">
              <caption className="sr-only">
                Cuotas vencidas de la unidad {detalle.codigo}
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 font-medium">Período</th>
                  <th scope="col" className="py-2 font-medium">Vence</th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Monto
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Atraso
                  </th>
                </tr>
              </thead>
              <tbody>
                {detalle.cuotas.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="py-2">{c.periodo}</td>
                    <td className="py-2">{fechaCorta(c.fechaVencimiento)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {dinero(c.monto)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {c.diasAtraso} días
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      )}
    </div>
  );
}

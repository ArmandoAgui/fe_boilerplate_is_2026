"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { errorRango, urlReportes } from "@/lib/reportes";

/**
 * Desde y Hasta del panel. Aplicar cambia la URL y la página de servidor
 * vuelve a consultar los indicadores con ese rango.
 */
export function FiltroPeriodo({
  desde: desdeInicial,
  hasta: hastaInicial,
}: {
  desde: string;
  hasta: string;
}) {
  const router = useRouter();
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [aplicando, startAplicar] = useTransition();
  const error = errorRango(desde, hasta);

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    if (error) return;
    startAplicar(() => {
      // Mismo rango: se fuerza la consulta para traer cifras al día.
      if (desde === desdeInicial && hasta === hastaInicial) router.refresh();
      else router.push(urlReportes(desde, hasta));
    });
  }

  return (
    <form
      onSubmit={aplicar}
      className="panel mb-5 flex flex-wrap items-end gap-4"
      aria-label="Período del reporte"
    >
      <div className="text-sm">
        <label htmlFor="desde" className="block font-medium">
          Desde
        </label>
        <input
          id="desde"
          type="date"
          className={`field mt-1${error ? " border-[var(--danger)]" : ""}`}
          value={desde}
          max={hasta || undefined}
          onChange={(e) => setDesde(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "rango-error" : undefined}
        />
      </div>
      <div className="text-sm">
        <label htmlFor="hasta" className="block font-medium">
          Hasta
        </label>
        <input
          id="hasta"
          type="date"
          className={`field mt-1${error ? " border-[var(--danger)]" : ""}`}
          value={hasta}
          min={desde || undefined}
          onChange={(e) => setHasta(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "rango-error" : undefined}
        />
      </div>
      <button
        type="submit"
        className="button"
        disabled={Boolean(error) || aplicando}
      >
        {aplicando ? "Aplicando…" : "Aplicar"}
      </button>
      {error && (
        <p id="rango-error" role="alert" className="field-error w-full">
          {error}
        </p>
      )}
    </form>
  );
}

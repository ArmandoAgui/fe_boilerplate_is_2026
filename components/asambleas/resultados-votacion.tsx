"use client";
import { useEffect, useState } from "react";
import { obtenerResultados } from "@/app/actions/asamblea";
import {
  fechaHora,
  porcentaje1,
  type ResultadosTema,
  type Tema,
} from "@/lib/asambleas";

const AVISO = "Los resultados estarán disponibles al cierre de la votación";

type Carga =
  | { temaId: string; tipo: "ok"; datos: ResultadosTema }
  | { temaId: string; tipo: "abierto" }
  | { temaId: string; tipo: "error"; mensaje: string };

export function ResultadosVotacion({ temas }: { temas: Tema[] }) {
  const [temaId, setTemaId] = useState(temas[0]?.id ?? "");
  const [carga, setCarga] = useState<Carga | null>(null);
  const [intento, setIntento] = useState(0);
  const cerrado = temas.find((t) => t.id === temaId)?.estado === "CERRADO";

  // Consulta al abrir y al cambiar de tema. Un tema que aún no cierra no se
  // consulta: el aviso sale directo (el backend respondería 409).
  useEffect(() => {
    if (!temaId || !cerrado) return;
    let vigente = true;
    obtenerResultados(temaId).then((r) => {
      if (!vigente) return;
      if (r.ok && r.data)
        setCarga({ temaId, tipo: "ok", datos: r.data as ResultadosTema });
      else if (r.status === 409) setCarga({ temaId, tipo: "abierto" });
      else
        setCarga({
          temaId,
          tipo: "error",
          mensaje:
            r.error ?? "No se pudo completar la operación. Intente de nuevo.",
        });
    });
    return () => {
      vigente = false;
    };
  }, [temaId, cerrado, intento]);

  if (!temas.length)
    return <p className="panel">Esta asamblea no tiene temas</p>;

  const actual = carga?.temaId === temaId ? carga : null;
  const aviso = !cerrado || actual?.tipo === "abierto";
  const cargando = cerrado && !actual;

  function reintentar() {
    setCarga(null);
    setIntento((i) => i + 1);
  }

  return (
    <section className="space-y-6">
      <div className="max-w-xl">
        <label htmlFor="tema" className="mb-1 block text-sm font-medium">
          Tema
        </label>
        <select
          id="tema"
          className="field"
          value={temaId}
          onChange={(e) => setTemaId(e.target.value)}
        >
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.pregunta}
            </option>
          ))}
        </select>
      </div>

      {aviso && (
        <p role="status" className="panel">
          {AVISO}
        </p>
      )}
      {cargando && <p role="status">Cargando…</p>}
      {actual?.tipo === "error" && (
        <div role="alert" className="panel">
          <p>{actual.mensaje}</p>
          <button
            type="button"
            className="button-secondary mt-3"
            onClick={reintentar}
          >
            Reintentar
          </button>
        </div>
      )}

      {actual?.tipo === "ok" && (
        <>
          <section className="panel" aria-labelledby="titulo-resultados">
            <h2 id="titulo-resultados" className="text-xl font-semibold">
              {actual.datos.titulo}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Participación: {actual.datos.unidadesVotantes.length} de{" "}
              {actual.datos.unidadesHabilitadas} unidades (
              {porcentaje1(actual.datos.participacion)})
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Resultados por opción</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-4">
                      Opción
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Votos
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actual.datos.opciones.map((o) => (
                    <tr
                      key={o.opcionId}
                      className="border-b border-line align-top"
                    >
                      <td className="w-full py-2 pr-4">
                        <span>{o.texto}</span>
                        <div
                          aria-hidden="true"
                          className="mt-1 h-2 w-full rounded bg-surface-alt"
                        >
                          <div
                            className="h-2 rounded bg-accent"
                            style={{
                              width: `${Math.min(100, Math.max(0, o.porcentaje))}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {o.votos}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {porcentaje1(o.porcentaje)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <th scope="row" className="py-2 pr-4">
                      Total
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {actual.datos.totalVotos}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {porcentaje1(actual.datos.totalVotos > 0 ? 100 : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="panel" aria-labelledby="titulo-unidades">
            <h2 id="titulo-unidades" className="text-xl font-semibold">
              Unidades que votaron
            </h2>
            {actual.datos.unidadesVotantes.length === 0 ? (
              <p className="mt-2 text-muted">
                Ninguna unidad votó en este tema
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="py-2 pr-4">
                        Unidad
                      </th>
                      <th scope="col" className="py-2">
                        Fecha y hora
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actual.datos.unidadesVotantes.map((u) => (
                      <tr key={u.unidadId} className="border-b border-line">
                        <td className="py-2 pr-4">{u.codigo}</td>
                        <td className="py-2">
                          {fechaHora(u.fecha)}
                          {u.opcion
                            ? ` · Opción: ${u.opcion}`
                            : " · Opción no registrada en votos históricos"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

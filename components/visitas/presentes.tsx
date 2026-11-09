"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { listarPresentes } from "@/app/actions/visitas";
import {
  MAXIMO_BUSQUEDA_PRESENTES,
  REFRESCO_PRESENTES_MS,
  errorBuscarPresentes,
  etiquetaCondicion,
  hora,
  horaConSegundos,
  type Presente,
  type UnidadOpcion,
} from "@/lib/visitas";

type Filtros = { buscar: string; unidadId: string };

export function Presentes({
  inicial,
  unidades,
}: {
  inicial: Presente[];
  unidades: UnidadOpcion[];
}) {
  const [datos, setDatos] = useState(inicial);
  const [texto, setTexto] = useState("");
  // Los filtros aplicados se guardan aparte de lo que se está tecleando: el
  // refresco automático debe repetir la última consulta, no una a medio
  // escribir.
  const [filtros, setFiltros] = useState<Filtros>({ buscar: "", unidadId: "" });
  const [actualizado, setActualizado] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const errorTexto = errorBuscarPresentes(texto);

  const consultar = useCallback(async (f: Filtros) => {
    setCargando(true);
    const resultado = await listarPresentes(
      f.buscar || undefined,
      f.unidadId || undefined,
    );
    setCargando(false);
    if (resultado.error) {
      // Se conserva la última lista buena: en la puerta es peor quedarse sin
      // datos que mirar unos segundos desactualizados.
      setError(resultado.error);
      return;
    }
    setError("");
    setDatos(resultado.datos ?? []);
    setActualizado(horaConSegundos(new Date()));
  }, []);

  const primerRender = useRef(true);

  useEffect(() => {
    if (primerRender.current) {
      // La lista inicial ya vino del servidor; volver a pedirla al montar
      // sería una consulta de más. Solo falta el sello de hora, que no puede
      // calcularse en el servidor: el HTML quedaría con una hora distinta a
      // la del cliente y React marcaría un error de hidratación.
      primerRender.current = false;
      setActualizado(horaConSegundos(new Date()));
    } else {
      void consultar(filtros);
    }
    const timer = setInterval(
      () => void consultar(filtros),
      REFRESCO_PRESENTES_MS,
    );
    return () => clearInterval(timer);
  }, [filtros, consultar]);

  function aplicar(cambio: Partial<Filtros>) {
    setFiltros((previos) => ({ ...previos, ...cambio }));
  }

  return (
    <>
      <section className="panel mb-6" aria-labelledby="filtros-titulo">
        <h2 id="filtros-titulo" className="sr-only">
          Filtros
        </h2>
        <form
          className="flex flex-wrap items-start gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (errorTexto) return;
            aplicar({ buscar: texto.trim() });
          }}
        >
          <div className="min-w-60 flex-1">
            <label className="label" htmlFor="buscar-presente">
              Buscar
            </label>
            <input
              id="buscar-presente"
              className="input"
              value={texto}
              maxLength={MAXIMO_BUSQUEDA_PRESENTES}
              onChange={(e) => setTexto(e.target.value)}
              aria-describedby="buscar-presente-error"
              aria-invalid={Boolean(errorTexto)}
              autoComplete="off"
            />
            <p
              id="buscar-presente-error"
              role="alert"
              className="field-error"
            >
              {errorTexto}
            </p>
          </div>
          <div className="min-w-48">
            <label className="label" htmlFor="unidad-presente">
              Unidad
            </label>
            <select
              id="unidad-presente"
              className="input"
              value={filtros.unidadId}
              onChange={(e) => aplicar({ unidadId: e.target.value })}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </div>
          <button className="button-secondary mt-7" type="submit">
            Filtrar
          </button>
          <button
            className="button mt-7"
            type="button"
            disabled={cargando}
            onClick={() => void consultar(filtros)}
          >
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </form>
      </section>

      <p role="alert" className="field-error mb-3">
        {error}
      </p>

      <section className="panel p-0" aria-labelledby="presentes-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 id="presentes-titulo" className="text-xl font-semibold">
            Visitantes dentro: {datos.length}
          </h2>
          <p role="status" className="text-sm text-muted">
            {actualizado && `Última actualización: ${actualizado}`}
          </p>
        </div>

        {datos.length === 0 ? (
          <p className="px-5 pb-5 text-muted">
            No hay visitantes dentro del condominio
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Visitantes dentro del condominio, el de ingreso más antiguo
                primero
              </caption>
              <thead>
                <tr className="border-t border-line">
                  {["Visitante", "Documento", "Unidad", "Ingreso", "Condición"].map(
                    (t) => (
                      <th key={t} scope="col" className="p-4 font-medium">
                        {t}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {datos.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <th scope="row" className="p-4 font-normal">
                      {p.visitanteNombre}
                    </th>
                    <td className="p-4">{p.visitanteDocumento}</td>
                    <td className="p-4">{p.unidadCodigo}</td>
                    <td className="p-4 whitespace-nowrap">
                      {hora(p.ingresoAt)}
                    </td>
                    <td className="p-4">{etiquetaCondicion[p.condicion]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

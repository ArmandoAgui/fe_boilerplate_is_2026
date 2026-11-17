"use client";
import { SolicitarIngreso } from "@/components/integracion/solicitar-ingreso";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarAutorizaciones,
  registrarEntrada,
  registrarSalida,
} from "@/app/actions/visitas";
import {
  MINIMO_BUSQUEDA,
  errorBusqueda,
  etiquetaCondicion,
  fechaHora,
  hora,
  type AutorizacionBuscada,
  type Presente,
  type UnidadOpcion,
} from "@/lib/visitas";

export function Accesos({
  presentes,
  unidades,
}: {
  presentes: Presente[];
  unidades: UnidadOpcion[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  // undefined = todavía no se ha buscado; [] = se buscó y no hubo nada.
  const [resultados, setResultados] = useState<AutorizacionBuscada[]>();
  const [manual, setManual] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pendiente, startTransition] = useTransition();
  const campoBusqueda = useRef<HTMLInputElement>(null);

  const errorTexto = errorBusqueda(texto);
  function limpiar() {
    setMensaje("");
    setError("");
  }

  function buscar() {
    if (texto.trim().length < MINIMO_BUSQUEDA) return;
    limpiar();
    startTransition(async () => {
      const resultado = await buscarAutorizaciones(texto.trim());
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setResultados(resultado.datos ?? []);
    });
  }

  function entrar(a: AutorizacionBuscada) {
    limpiar();
    startTransition(async () => {
      const resultado = await registrarEntrada({ autorizacionId: a.id });
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      // Se oculta mientras el visitante está dentro; puede reutilizarse tras registrar salida.
      setResultados((prev) => prev?.filter((x) => x.id !== a.id));
      setMensaje(`Entrada registrada · ${resultado.nombre}`);
      router.refresh();
    });
  }

  function salir(p: Presente) {
    limpiar();
    startTransition(async () => {
      const resultado = await registrarSalida(p.id);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setMensaje(`Salida registrada · ${p.visitanteNombre}`);
      router.refresh();
    });
  }

  return (
    <>
      <p role="status" className="mb-2 text-accent">
        {mensaje}
      </p>
      <p role="alert" className="field-error mb-4">
        {error}
      </p>

      <section className="panel mb-6" aria-labelledby="buscador-titulo">
        <h2 id="buscador-titulo" className="text-xl font-semibold">
          Buscar autorización
        </h2>
        <form
          className="mt-4 flex flex-wrap items-start gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            buscar();
          }}
        >
          <div className="min-w-60 flex-1">
            <label className="label" htmlFor="buscar">
              Nombre o documento del visitante
            </label>
            <input
              id="buscar"
              ref={campoBusqueda}
              className="input"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-describedby="buscar-ayuda buscar-error"
              autoComplete="off"
            />
            <p id="buscar-ayuda" className="mt-2 text-sm text-muted">
              Mínimo {MINIMO_BUSQUEDA} caracteres.
            </p>
            <p id="buscar-error" role="alert" className="field-error">
              {errorTexto}
            </p>
          </div>
          <button
            className="button mt-7"
            type="submit"
            disabled={pendiente || texto.trim().length < MINIMO_BUSQUEDA}
          >
            {pendiente ? "Buscando…" : "Buscar"}
          </button>
          <button
            className="button-secondary mt-7"
            type="button"
            aria-expanded={manual}
            onClick={() => {
              limpiar();
              setManual((v) => !v);
            }}
          >
            Visita sin autorización
          </button>
        </form>

        {resultados?.length === 0 && (
          <p className="mt-5 text-muted">
            No hay autorizaciones vigentes para esa búsqueda
          </p>
        )}

        {resultados && resultados.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {resultados.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line p-4"
              >
                <div>
                  <p className="font-medium">{a.visitanteNombre}</p>
                  <p className="text-sm text-muted">
                    Documento {a.visitanteDocumento} · Unidad {a.unidadCodigo}
                  </p>
                  <p className="text-sm text-muted">
                    Vigente de {fechaHora(a.inicio)} a {fechaHora(a.fin)}
                  </p>
                </div>
                <button
                  className="button"
                  disabled={pendiente}
                  aria-label={`Registrar entrada de ${a.visitanteNombre}`}
                  onClick={() => entrar(a)}
                >
                  Registrar entrada
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manual && <SolicitarIngreso unidades={unidades} />}

      <section className="panel p-0" aria-labelledby="dentro-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 id="dentro-titulo" className="text-xl font-semibold">
            Dentro ahora
          </h2>
          <p className="text-sm text-muted">
            Visitantes dentro: {presentes.length}
          </p>
        </div>
        {presentes.length === 0 ? (
          <p className="px-5 pb-5 text-muted">
            No hay visitantes dentro del condominio
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Visitantes con entrada registrada y sin salida
              </caption>
              <thead>
                <tr className="border-t border-line">
                  {[
                    "Visitante",
                    "Documento",
                    "Unidad",
                    "Ingreso",
                    "Condición",
                    "",
                  ].map((t, i) => (
                    <th key={t || i} scope="col" className="p-4 font-medium">
                      {t || <span className="sr-only">Acciones</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {presentes.map((p) => (
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
                    <td className="p-4 text-right">
                      <button
                        className="button-secondary"
                        disabled={pendiente}
                        aria-label={`Registrar salida de ${p.visitanteNombre}`}
                        onClick={() => salir(p)}
                      >
                        Registrar salida
                      </button>
                    </td>
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

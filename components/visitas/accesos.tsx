"use client";
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
  errorDocumento,
  errorNombre,
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
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pendiente, startTransition] = useTransition();
  const campoBusqueda = useRef<HTMLInputElement>(null);

  const errorTexto = errorBusqueda(texto);
  const errores = {
    nombre: errorNombre(nombre),
    documento: errorDocumento(documento),
    unidadId: unidadId ? "" : "Seleccione una unidad de destino",
  };
  const manualInvalido = Object.values(errores).some(Boolean);

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
      // La autorización es de uso único: ya no sirve, así que sale de la lista
      // en vez de quedar con un botón que devolvería 409.
      setResultados((prev) => prev?.filter((x) => x.id !== a.id));
      setMensaje(`Entrada registrada · ${resultado.nombre}`);
      router.refresh();
    });
  }

  function entrarSinAutorizacion() {
    setEnviado(true);
    if (manualInvalido) return;
    limpiar();
    startTransition(async () => {
      const resultado = await registrarEntrada({
        visitanteNombre: nombre.trim(),
        visitanteDocumento: documento.trim(),
        unidadId,
      });
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setMensaje(`Entrada registrada · ${resultado.nombre}`);
      setNombre("");
      setDocumento("");
      setUnidadId("");
      setEnviado(false);
      setManual(false);
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

      {manual && (
        <section className="panel mb-6" aria-labelledby="manual-titulo">
          <h2 id="manual-titulo" className="text-xl font-semibold">
            Visita sin autorización
          </h2>
          <p className="mt-2 text-muted">
            Queda registrada con la condición “Sin autorización”.
          </p>
          <form
            className="mt-5 grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              entrarSinAutorizacion();
            }}
          >
            <div>
              <label className="label" htmlFor="manual-nombre">
                Nombre del visitante
              </label>
              <input
                id="manual-nombre"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                aria-describedby="manual-nombre-error"
                aria-invalid={enviado && Boolean(errores.nombre)}
                autoComplete="off"
              />
              <p
                id="manual-nombre-error"
                role="alert"
                className="field-error"
              >
                {enviado ? errores.nombre : ""}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="manual-documento">
                Documento
              </label>
              <input
                id="manual-documento"
                className="input"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                aria-describedby="manual-documento-error"
                aria-invalid={enviado && Boolean(errores.documento)}
                autoComplete="off"
              />
              <p
                id="manual-documento-error"
                role="alert"
                className="field-error"
              >
                {enviado ? errores.documento : ""}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="manual-unidad">
                Unidad de destino
              </label>
              <select
                id="manual-unidad"
                className="input"
                value={unidadId}
                onChange={(e) => setUnidadId(e.target.value)}
                aria-describedby="manual-unidad-error"
                aria-invalid={enviado && Boolean(errores.unidadId)}
              >
                <option value="">Seleccione una unidad</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </select>
              <p
                id="manual-unidad-error"
                role="alert"
                className="field-error"
              >
                {enviado ? errores.unidadId : ""}
              </p>
            </div>
            <div className="flex items-end gap-3">
              <button className="button" type="submit" disabled={pendiente}>
                {pendiente ? "Registrando…" : "Registrar entrada"}
              </button>
              <button
                className="button-secondary"
                type="button"
                disabled={pendiente}
                onClick={() => setManual(false)}
              >
                Volver
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel p-0" aria-labelledby="dentro-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 id="dentro-titulo" className="text-xl font-semibold">
            Dentro ahora
          </h2>
          <p className="text-sm text-muted">Visitantes dentro: {presentes.length}</p>
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
                  {["Visitante", "Documento", "Unidad", "Ingreso", "Condición", ""].map(
                    (t, i) => (
                      <th key={t || i} scope="col" className="p-4 font-medium">
                        {t || <span className="sr-only">Acciones</span>}
                      </th>
                    ),
                  )}
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

"use client";
import { useEffect, useState } from "react";
import { buscarDirectorio, obtenerFicha } from "@/app/actions/directorio";
import type { Ficha, PaginaDirectorio } from "@/lib/directorio";

type Carga =
  | { clave: string; buscar: string; tipo: "ok"; pagina: PaginaDirectorio }
  | { clave: string; buscar: string; tipo: "error"; mensaje: string };

function Datos({ f }: { f: Ficha }) {
  return (
    <>
      {f.telefono && <p className="text-sm">Teléfono: {f.telefono}</p>}
      {f.correo && <p className="text-sm">Correo: {f.correo}</p>}
      {f.unidad && <p className="text-sm">Unidad: {f.unidad}</p>}
    </>
  );
}

export function BuscadorDirectorio() {
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [errorFicha, setErrorFicha] = useState("");

  const buscar = texto.trim();
  const valido = buscar.length >= 3;
  const clave = `${buscar}|${pagina}`;

  // Consulta 300 ms después de dejar de escribir, solo con 3+ caracteres.
  useEffect(() => {
    if (!valido) return;
    let vigente = true;
    const temporizador = setTimeout(() => {
      buscarDirectorio(buscar, pagina).then((r) => {
        if (!vigente) return;
        if (r.data) setCarga({ clave, buscar, tipo: "ok", pagina: r.data });
        else
          setCarga({
            clave,
            buscar,
            tipo: "error",
            mensaje: r.error ?? "No se pudo completar la operación. Intente de nuevo.",
          });
      });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [valido, buscar, pagina, clave]);

  async function abrir(id: string) {
    setErrorFicha("");
    const r = await obtenerFicha(id);
    if (r.data) setFicha(r.data);
    else {
      setFicha(null);
      setErrorFicha(r.error ?? "No se pudo completar la operación. Intente de nuevo.");
    }
  }

  const actual = valido && carga?.clave === clave ? carga : null;
  const cargando = valido && !actual;
  const paginas = actual?.tipo === "ok" ? Math.max(1, Math.ceil(actual.pagina.total / actual.pagina.tamanoPagina)) : 1;

  return (
    <section className="space-y-5">
      <div className="max-w-xl">
        <label htmlFor="buscar" className="mb-1 block text-sm font-medium">
          Buscar
        </label>
        <input
          id="buscar"
          type="search"
          className="field"
          maxLength={50}
          value={texto}
          placeholder="Nombre, unidad o torre"
          onChange={(e) => {
            setTexto(e.target.value);
            setPagina(1);
            setFicha(null);
            setErrorFicha("");
          }}
        />
        {texto.length > 0 && !valido && (
          <p role="alert" className="field-error">
            Escriba al menos 3 caracteres
          </p>
        )}
      </div>

      <div aria-live="polite">
        {cargando && <p>Cargando…</p>}
        {actual?.tipo === "error" && (
          <p role="alert" className="field-error">
            {actual.mensaje}
          </p>
        )}
        {actual?.tipo === "ok" && actual.pagina.datos.length === 0 && (
          <p className="panel">Sin resultados para «{actual.buscar}»</p>
        )}
      </div>

      {actual?.tipo === "ok" && actual.pagina.datos.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {actual.pagina.datos.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="panel w-full text-left"
                  onClick={() => abrir(f.id)}
                >
                  <span className="block text-lg font-semibold">{f.nombre}</span>
                  <Datos f={f} />
                </button>
              </li>
            ))}
          </ul>
          {paginas > 1 && (
            <nav aria-label="Paginación" className="flex items-center gap-3">
              <button
                type="button"
                className="button-secondary"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
              >
                Anterior
              </button>
              <span className="text-sm text-muted">
                Página {pagina} de {paginas}
              </span>
              <button
                type="button"
                className="button-secondary"
                disabled={pagina >= paginas}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}

      {errorFicha && (
        <p role="alert" className="field-error">
          {errorFicha}
        </p>
      )}
      {ficha && (
        <section className="panel" aria-labelledby="ficha-vecino">
          <h2 id="ficha-vecino" className="text-xl font-semibold">
            {ficha.nombre}
          </h2>
          <Datos f={ficha} />
          <button type="button" className="button-secondary mt-3" onClick={() => setFicha(null)}>
            Cerrar
          </button>
        </section>
      )}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";

import {
  consultarMiEstado,
  emitirVoto,
} from "@/app/actions/votaciones";

import {
  fechaParticipacion,
  type TemaVotacion,
  type EstadoParticipacion,
  type UnidadVotante,
} from "@/lib/votaciones";

export function VotacionClient({
  temas,
  unidades,
  estadosIniciales,
}: {
  temas: TemaVotacion[];
  unidades: UnidadVotante[];
  estadosIniciales: EstadoParticipacion[];
}) {
  const [unidadId, setUnidadId] = useState(
    unidades[0].id,
  );

  const [estados, setEstados] = useState<
    Record<string, EstadoParticipacion>
  >(
    Object.fromEntries(
      estadosIniciales.map((estado) => [
        estado.temaId,
        estado,
      ]),
    ),
  );

  const [selecciones, setSelecciones] = useState<
    Record<string, string>
  >({});

  const [temaConfirmacion, setTemaConfirmacion] =
    useState<string | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [pending, startTransition] = useTransition();

  function cambiarUnidad(nextUnidadId: string) {
    setUnidadId(nextUnidadId);
    setMensaje("");
    setError("");

    startTransition(async () => {
      try {
        const nuevosEstados = await Promise.all(
          temas.map((tema) =>
            consultarMiEstado(
              tema.id,
              nextUnidadId,
            ),
          ),
        );

        setEstados(
          Object.fromEntries(
            nuevosEstados.map((estado) => [
              estado.temaId,
              estado,
            ]),
          ),
        );

        setSelecciones({});
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo consultar la participación.",
        );
      }
    });
  }

  function seleccionarOpcion(
    temaId: string,
    opcionId: string,
  ) {
    setSelecciones((actuales) => ({
      ...actuales,
      [temaId]: opcionId,
    }));
  }

  function confirmarVoto() {
    if (!temaConfirmacion) return;

    const temaId = temaConfirmacion;
    const opcionId = selecciones[temaId];

    if (!opcionId) {
      setError("Debes seleccionar una opción.");
      setTemaConfirmacion(null);
      return;
    }

    setError("");
    setMensaje("");

    startTransition(async () => {
      try {
        const participacion = await emitirVoto(
          temaId,
          unidadId,
          opcionId,
        );

        setEstados((actuales) => ({
          ...actuales,
          [temaId]: {
            temaId,
            unidadId,
            yaVoto: true,
            fecha: participacion.fecha,
          },
        }));

        setSelecciones((actuales) => {
          const copia = { ...actuales };
          delete copia[temaId];
          return copia;
        });

        setMensaje("Voto registrado");
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo registrar el voto.",
        );
      } finally {
        setTemaConfirmacion(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {unidades.length > 1 && (
        <section className="panel">
          <label
            htmlFor="unidad-votacion"
            className="mb-2 block text-sm font-medium"
          >
            Unidad
          </label>

          <select
            id="unidad-votacion"
            className="field w-full max-w-sm"
            value={unidadId}
            disabled={pending}
            onChange={(e) =>
              cambiarUnidad(e.target.value)
            }
          >
            {unidades.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.codigo}
              </option>
            ))}
          </select>
        </section>
      )}

      {error && (
        <p role="alert" className="panel text-red-700">
          {error}
        </p>
      )}

      {mensaje && (
        <p role="status" className="panel">
          {mensaje}
        </p>
      )}

      {temas.map((tema) => {
        const estado = estados[tema.id];

        const yaVoto = estado?.yaVoto ?? false;
        const abierto = tema.estado === "ABIERTO";

        return (
          <section key={tema.id} className="panel space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {tema.titulo}
              </h2>

              <p className="mt-1 text-sm text-muted">
                Estado: {tema.estado}
              </p>
            </div>

            {yaVoto ? (
              <p className="rounded-xl bg-surface-alt p-4 text-sm">
                Tu unidad ya votó el{" "}
                <strong>
                  {estado.fecha
                    ? fechaParticipacion(estado.fecha)
                    : "—"}
                </strong>
              </p>
            ) : !abierto ? (
              <p className="text-sm text-muted">
                {tema.estado === "PUBLICADA"
                  ? "La votación todavía no está abierta."
                  : "La votación está cerrada."}
              </p>
            ) : (
              <>
                <fieldset
                  disabled={pending}
                  className="space-y-3"
                >
                  <legend className="mb-2 text-sm font-medium">
                    Selecciona una opción
                  </legend>

                  {tema.opciones?.map((opcion) => (
                    <label
                      key={opcion.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3"
                    >
                      <input
                        type="radio"
                        name={`tema-${tema.id}`}
                        value={opcion.id}
                        checked={
                          selecciones[tema.id] === opcion.id
                        }
                        onChange={() =>
                          seleccionarOpcion(
                            tema.id,
                            opcion.id,
                          )
                        }
                      />

                      <span>{opcion.texto}</span>
                    </label>
                  ))}
                </fieldset>

                <button
                  type="button"
                  className="button"
                  disabled={
                    pending || !selecciones[tema.id]
                  }
                  onClick={() =>
                    setTemaConfirmacion(tema.id)
                  }
                >
                  Votar
                </button>
              </>
            )}
          </section>
        );
      })}

      {temaConfirmacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-voto-titulo"
            className="panel w-full max-w-md space-y-4"
          >
            <h2
              id="confirmar-voto-titulo"
              className="text-xl font-semibold"
            >
              Confirmar voto
            </h2>

            <p>
              Esta acción no se puede deshacer.
              ¿Confirmar tu voto?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="button-secondary"
                disabled={pending}
                onClick={() =>
                  setTemaConfirmacion(null)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={confirmarVoto}
              >
                {pending ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

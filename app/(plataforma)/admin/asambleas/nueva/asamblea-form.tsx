"use client";

import { useState, useTransition } from "react";

import {
  crearAsamblea,
  publicarAsamblea,
} from "@/app/actions/asambleas";

type TemaFormulario = {
  titulo: string;
  apertura: string;
  cierre: string;
  opciones: string[];
};

const nuevoTema = (): TemaFormulario => ({
  titulo: "",
  apertura: "",
  cierre: "",
  opciones: ["", ""],
});

export function AsambleaForm() {
  const [titulo, setTitulo] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [temas, setTemas] = useState<TemaFormulario[]>([
    nuevoTema(),
  ]);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [pending, startTransition] = useTransition();

  function actualizarTema(
    indice: number,
    campo: keyof TemaFormulario,
    valor: string | string[],
  ) {
    setTemas((actuales) =>
      actuales.map((tema, i) =>
        i === indice
          ? { ...tema, [campo]: valor }
          : tema,
      ),
    );
  }

  function actualizarOpcion(
    temaIndice: number,
    opcionIndice: number,
    valor: string,
  ) {
    setTemas((actuales) =>
      actuales.map((tema, i) => {
        if (i !== temaIndice) return tema;

        const opciones = [...tema.opciones];
        opciones[opcionIndice] = valor;

        return {
          ...tema,
          opciones,
        };
      }),
    );
  }

  function agregarTema() {
    setTemas((actuales) => [
      ...actuales,
      nuevoTema(),
    ]);
  }

  function eliminarTema(indice: number) {
    setTemas((actuales) =>
      actuales.filter((_, i) => i !== indice),
    );
  }

  function agregarOpcion(temaIndice: number) {
    setTemas((actuales) =>
      actuales.map((tema, i) => {
        if (i !== temaIndice) return tema;

        if (tema.opciones.length >= 10) return tema;

        return {
          ...tema,
          opciones: [...tema.opciones, ""],
        };
      }),
    );
  }

  function eliminarOpcion(
    temaIndice: number,
    opcionIndice: number,
  ) {
    setTemas((actuales) =>
      actuales.map((tema, i) => {
        if (i !== temaIndice) return tema;

        if (tema.opciones.length <= 2) return tema;

        return {
          ...tema,
          opciones: tema.opciones.filter(
            (_, j) => j !== opcionIndice,
          ),
        };
      }),
    );
  }

  function validarFormulario() {
    if (titulo.trim().length < 5 || titulo.trim().length > 100) {
      throw new Error(
        "El título debe tener entre 5 y 100 caracteres.",
      );
    }

    if (!fechaHora) {
      throw new Error(
        "Debes indicar la fecha y hora de la asamblea.",
      );
    }

    if (descripcion.length > 500) {
      throw new Error(
        "La descripción no puede superar 500 caracteres.",
      );
    }

    for (const tema of temas) {
      if (
        tema.titulo.trim().length < 5 ||
        tema.titulo.trim().length > 150
      ) {
        throw new Error(
          "Cada pregunta debe tener entre 5 y 150 caracteres.",
        );
      }

      if (!tema.apertura || !tema.cierre) {
        throw new Error(
          "Debes indicar la apertura y el cierre de cada tema.",
        );
      }

      if (
        tema.opciones.length < 2 ||
        tema.opciones.length > 10
      ) {
        throw new Error(
          "Cada tema necesita entre 2 y 10 opciones.",
        );
      }

      const opciones = tema.opciones.map((opcion) =>
        opcion.trim().toLocaleLowerCase("es"),
      );

      if (opciones.some((opcion) => !opcion)) {
        throw new Error(
          "No puede haber opciones vacías.",
        );
      }

      if (new Set(opciones).size !== opciones.length) {
        throw new Error(
          "Las opciones de cada tema deben ser únicas.",
        );
      }
    }
  }

  function prepararPayload() {
    return {
      titulo: titulo.trim(),
      fechaHora: new Date(fechaHora).toISOString(),
      descripcion: descripcion.trim() || undefined,

      temas: temas.map((tema) => ({
        titulo: tema.titulo.trim(),
        apertura: new Date(tema.apertura).toISOString(),
        cierre: new Date(tema.cierre).toISOString(),
        opciones: tema.opciones.map((texto) => ({
          texto: texto.trim(),
        })),
      })),
    };
  }

  function guardar(publicar: boolean) {
    setError("");
    setMensaje("");

    startTransition(async () => {
      try {
        validarFormulario();

        if (
          publicar &&
          !window.confirm(
            "¿Confirmas que deseas publicar esta asamblea?",
          )
        ) {
          return;
        }

        const asamblea = await crearAsamblea(
          prepararPayload(),
        );

        if (publicar) {
          await publicarAsamblea(asamblea.id);

          setMensaje("Asamblea publicada");
        } else {
          setMensaje(
            "Borrador de asamblea guardado correctamente.",
          );
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo guardar la asamblea.",
        );
      }
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">
          Información general
        </h2>

        <div>
          <label htmlFor="titulo" className="mb-2 block text-sm font-medium">
            Título
          </label>

          <input
            id="titulo"
            className="field w-full"
            value={titulo}
            minLength={5}
            maxLength={100}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="fecha" className="mb-2 block text-sm font-medium">
            Fecha y hora de la asamblea
          </label>

          <input
            id="fecha"
            type="datetime-local"
            className="field w-full"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="mb-2 block text-sm font-medium"
          >
            Descripción
          </label>

          <textarea
            id="descripcion"
            className="field min-h-24 w-full"
            maxLength={500}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
      </section>

      {temas.map((tema, i) => (
        <section key={i} className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Tema {i + 1}
            </h2>

            {temas.length > 1 && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => eliminarTema(i)}
              >
                Eliminar tema
              </button>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Pregunta
            </label>

            <input
              className="field w-full"
              minLength={5}
              maxLength={150}
              value={tema.titulo}
              onChange={(e) =>
                actualizarTema(i, "titulo", e.target.value)
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Apertura
              </label>

              <input
                type="datetime-local"
                className="field w-full"
                value={tema.apertura}
                onChange={(e) =>
                  actualizarTema(i, "apertura", e.target.value)
                }
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Cierre
              </label>

              <input
                type="datetime-local"
                className="field w-full"
                value={tema.cierre}
                onChange={(e) =>
                  actualizarTema(i, "cierre", e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">
              Opciones de votación
            </h3>

            {tema.opciones.map((opcion, j) => (
              <div key={j} className="flex gap-2">
                <input
                  className="field flex-1"
                  value={opcion}
                  maxLength={100}
                  placeholder={`Opción ${j + 1}`}
                  onChange={(e) =>
                    actualizarOpcion(i, j, e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="button-secondary"
                  disabled={tema.opciones.length <= 2}
                  onClick={() => eliminarOpcion(i, j)}
                >
                  Quitar
                </button>
              </div>
            ))}

            <button
              type="button"
              className="button-secondary"
              disabled={tema.opciones.length >= 10}
              onClick={() => agregarOpcion(i)}
            >
              Agregar opción
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        className="button-secondary"
        onClick={agregarTema}
      >
        Agregar tema
      </button>

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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="button-secondary"
          disabled={pending}
          onClick={() => guardar(false)}
        >
          {pending ? "Guardando..." : "Guardar borrador"}
        </button>

        <button
          type="button"
          className="button"
          disabled={pending || temas.some((t) => t.opciones.length < 2)}
          onClick={() => guardar(true)}
        >
          {pending ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previaComunicado,
  publicarComunicado,
} from "@/app/actions/comunicados";
import {
  etiquetasAlcance,
  erroresComunicado,
  type Alcance,
  type PublicacionComunicado,
  type Torre,
} from "@/lib/comunicados";
export function NuevoComunicado({ torres }: { torres: Torre[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [alcance, setAlcance] = useState<Alcance>("TODOS");
  const [destinoId, setDestinoId] = useState("");
  const [confirmacion, setConfirmacion] = useState<{
    data: PublicacionComunicado;
    cantidad: number;
  }>();
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const data: PublicacionComunicado = {
    titulo: titulo.trim(),
    contenido: contenido.trim(),
    alcance,
    ...(alcance !== "TODOS" ? { destinoId } : {}),
  };
  const errores = erroresComunicado(data);
  const invalido = Object.values(errores).some(Boolean);
  function preparar(event: React.FormEvent) {
    event.preventDefault();
    if (invalido || pending) return;
    setError("");
    setMensaje("");
    start(async () => {
      const previa = await previaComunicado(data.alcance, data.destinoId);
      if (previa.error || previa.destinatarios === undefined) {
        setError(previa.error ?? "No se pudo calcular el alcance");
        return;
      }
      setConfirmacion({ data, cantidad: previa.destinatarios });
      dialog.current?.showModal();
    });
  }
  function publicar() {
    if (!confirmacion || pending) return;
    start(async () => {
      const resultado = await publicarComunicado(confirmacion.data);
      if (resultado.error || resultado.destinatarios === undefined) {
        setError(resultado.error ?? "No se pudo publicar");
        return;
      }
      setMensaje(
        `Comunicado publicado a ${resultado.destinatarios} residentes`,
      );
      setError("");
      setTitulo("");
      setContenido("");
      setDestinoId("");
      setAlcance("TODOS");
      dialog.current?.close();
      router.refresh();
    });
  }
  return (
    <>
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>
      <form
        className="panel max-w-3xl space-y-5"
        onSubmit={preparar}
        noValidate
      >
        <fieldset disabled={pending} className="space-y-5">
          <div>
            <label htmlFor="com-titulo">Título</label>
            <input
              id="com-titulo"
              className="field mt-1"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={100}
              required
              aria-describedby="com-titulo-error"
            />
            <p id="com-titulo-error" className="field-error">
              {titulo && errores.titulo}
            </p>
          </div>
          <div>
            <label htmlFor="com-contenido">Contenido</label>
            <textarea
              id="com-contenido"
              className="field mt-1 min-h-44"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              maxLength={2000}
              required
              aria-describedby="com-contador com-contenido-error"
            />
            <p id="com-contador" className="text-sm text-muted">
              {contenido.length}/2000
            </p>
            <p id="com-contenido-error" className="field-error">
              {contenido && errores.contenido}
            </p>
          </div>
          <fieldset>
            <legend>Alcance</legend>
            <div className="mt-2 flex flex-wrap gap-5">
              {(Object.keys(etiquetasAlcance) as Alcance[]).map((a) => (
                <label key={a} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="alcance"
                    value={a}
                    checked={alcance === a}
                    onChange={() => {
                      setAlcance(a);
                      setDestinoId("");
                    }}
                  />
                  {etiquetasAlcance[a]}
                </label>
              ))}
            </div>
          </fieldset>
          {alcance !== "TODOS" && (
            <div>
              <label htmlFor="com-destino">Destino</label>
              <select
                id="com-destino"
                className="field mt-1"
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                required
              >
                <option value="">Seleccione un destino</option>
                {alcance === "TORRE"
                  ? torres.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))
                  : torres.flatMap((t) =>
                      t.secciones.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t.nombre} · {s.nombre}
                        </option>
                      )),
                    )}
              </select>
            </div>
          )}
          <p role="alert" className="field-error">
            {error}
          </p>
          <button className="button" disabled={invalido || pending}>
            {pending ? "Consultando…" : "Publicar"}
          </button>
        </fieldset>
      </form>
      <dialog
        ref={dialog}
        aria-labelledby="com-confirmacion"
        className="panel m-auto max-w-md"
      >
        <h2 id="com-confirmacion" className="text-xl font-semibold">
          Se enviará a {confirmacion?.cantidad} residentes. ¿Publicar?
        </h2>
        <p className="my-3">
          El comunicado será definitivo y no podrá editarse.
        </p>
        <p role="alert" className="field-error mb-3">
          {error}
        </p>
        <div className="flex gap-3">
          <button className="button" disabled={pending} onClick={publicar}>
            {pending ? "Publicando…" : "Confirmar publicación"}
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
        </div>
      </dialog>
    </>
  );
}

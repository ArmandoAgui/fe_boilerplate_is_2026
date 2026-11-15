"use client";
import { useState, useTransition } from "react";
import { guardarPreferencias } from "@/app/actions/directorio";
import type { Preferencias } from "@/lib/directorio";

export function PreferenciasDirectorio({
  inicial,
  nombre,
  correo,
  unidades,
}: {
  inicial: Preferencias;
  nombre: string;
  correo: string;
  unidades: string[];
}) {
  const [visible, setVisible] = useState(inicial.visible);
  const [telefono, setTelefono] = useState(inicial.mostrarTelefono);
  const [mostrarCorreo, setMostrarCorreo] = useState(inicial.mostrarCorreo);
  const [unidad, setUnidad] = useState(inicial.mostrarUnidad);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function alternar(encendido: boolean) {
    setVisible(encendido);
    // Apagado: el servidor guarda los tres campos en falso; la pantalla igual.
    if (!encendido) {
      setTelefono(false);
      setMostrarCorreo(false);
      setUnidad(false);
    }
    setMensaje("");
  }

  function guardar() {
    setMensaje("");
    setError("");
    start(async () => {
      const r = await guardarPreferencias({
        visible,
        mostrarTelefono: visible && telefono,
        mostrarCorreo: visible && mostrarCorreo,
        mostrarUnidad: visible && unidad,
      });
      if (r.error) setError(r.error);
      else setMensaje("Preferencias guardadas");
    });
  }

  const casilla = (
    id: string,
    texto: string,
    valor: boolean,
    cambiar: (v: boolean) => void,
  ) => (
    <label htmlFor={id} className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        disabled={!visible}
        checked={valor}
        onChange={(e) => {
          cambiar(e.target.checked);
          setMensaje("");
        }}
      />
      {texto}
    </label>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel space-y-4">
        <label htmlFor="visible" className="flex items-center gap-3 font-medium">
          <input
            id="visible"
            type="checkbox"
            role="switch"
            checked={visible}
            onChange={(e) => alternar(e.target.checked)}
          />
          Aparecer en el directorio
        </label>
        <fieldset className="space-y-2" disabled={!visible}>
          <legend className="mb-1 text-sm text-muted">Datos que compartes</legend>
          {casilla("telefono", "Teléfono", telefono, setTelefono)}
          {casilla("correo", "Correo", mostrarCorreo, setMostrarCorreo)}
          {casilla("unidad", "Unidad", unidad, setUnidad)}
        </fieldset>
        <button type="button" className="button" disabled={pending} onClick={guardar}>
          Guardar preferencias
        </button>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {mensaje && <p role="status">{mensaje}</p>}
      </section>

      <section className="panel" aria-labelledby="vista-previa">
        <h2 id="vista-previa" className="text-xl font-semibold">
          Vista previa de la ficha
        </h2>
        {!visible ? (
          <p className="mt-3 text-muted">No apareces en el directorio</p>
        ) : (
          <article className="mt-3 rounded-xl border border-line p-4">
            <p className="font-semibold">{nombre}</p>
            {telefono && <p className="text-sm">Teléfono: tu número registrado</p>}
            {mostrarCorreo && <p className="text-sm">Correo: {correo}</p>}
            {unidad && <p className="text-sm">Unidad: {unidades.join(", ") || "—"}</p>}
          </article>
        )}
      </section>
    </div>
  );
}

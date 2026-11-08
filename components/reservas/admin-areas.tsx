"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarArea } from "@/app/actions/reservas";
import { dias, errorHorarios, type Area, type Horario } from "@/lib/reservas";
export function AdminAreas({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const editor = useRef<HTMLHeadingElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [id, setId] = useState<string>();
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(10);
  const [activa, setActiva] = useState(true);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pending, startTransition] = useTransition();
  const nombreError =
    nombre.trim().length < 3 || nombre.trim().length > 60
      ? "El nombre debe tener de 3 a 60 caracteres"
      : areas.some((a) => a.id !== id && a.nombre === nombre.trim())
        ? "Ya existe un área con ese nombre"
        : "";
  const capacidadError =
    !Number.isInteger(capacidad) || capacidad < 1 || capacidad > 500
      ? "La capacidad debe ser un entero entre 1 y 500"
      : "";
  const horarioError = errorHorarios(horarios);
  function abrir(area?: Area) {
    setId(area?.id);
    setNombre(area?.nombre ?? "");
    setCapacidad(area?.capacidad ?? 10);
    setActiva(area?.activa ?? true);
    setHorarios(
      area?.horarios.map((h) => ({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })) ?? [{ diaSemana: 1, horaInicio: "06:00", horaFin: "22:00" }],
    );
    setError("");
    setMensaje("");
    setAbierto(true);
    setTimeout(() => editor.current?.focus(), 0);
  }
  function cambiar(indice: number, datos: Partial<Horario>) {
    setHorarios((prev) =>
      prev.map((h, i) => (i === indice ? { ...h, ...datos } : h)),
    );
  }
  function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (nombreError || capacidadError || horarioError) return;
    setError("");
    startTransition(async () => {
      const result = await guardarArea(id, {
        nombre: nombre.trim(),
        capacidad,
        activa,
        horarios,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAbierto(false);
      setMensaje("Área guardada");
      router.refresh();
    });
  }
  return (
    <>
      <p role="status" className="mb-4 text-accent">
        {mensaje}
      </p>
      {!abierto ? (
        <>
          <button className="button mb-5" onClick={() => abrir()}>
            Nueva área
          </button>
          {!areas.length ? (
            <p className="panel">Aún no hay áreas registradas</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Áreas y horarios registrados
                </caption>
                <thead className="bg-surface-alt">
                  <tr>
                    {[
                      "Nombre",
                      "Capacidad",
                      "Horarios",
                      "Estado",
                      "Acciones",
                    ].map((t) => (
                      <th key={t} scope="col" className="p-4">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a.id} className="border-t border-line">
                      <th scope="row" className="p-4">
                        {a.nombre}
                      </th>
                      <td className="p-4">{a.capacidad}</td>
                      <td className="min-w-52 p-4">
                        {dias.map((dia, n) => {
                          const franjas = a.horarios.filter(
                            (h) => h.diaSemana === n,
                          );
                          return (
                            franjas.length > 0 && (
                              <p key={dia}>
                                {dia}:{" "}
                                {franjas
                                  .map((h) => `${h.horaInicio}–${h.horaFin}`)
                                  .join(", ")}
                              </p>
                            )
                          );
                        })}
                      </td>
                      <td className="p-4">
                        {a.activa ? "Activa" : "Inactiva"}
                      </td>
                      <td className="p-4">
                        <button
                          className="button-secondary"
                          aria-label={`Editar ${a.nombre}`}
                          onClick={() => abrir(a)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <form className="panel" onSubmit={guardar}>
          <h2 ref={editor} tabIndex={-1} className="mb-5 text-xl font-semibold">
            {id ? "Editar área" : "Nueva área"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              Nombre
              <input
                aria-label="Nombre"
                aria-describedby="nombre-error"
                className="field mt-1"
                required
                minLength={3}
                maxLength={60}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <span id="nombre-error" className="field-error block">
                {nombreError}
              </span>
            </label>
            <label>
              Capacidad
              <input
                aria-label="Capacidad"
                aria-describedby="capacidad-error"
                className="field mt-1"
                type="number"
                required
                min={1}
                max={500}
                step={1}
                value={capacidad || ""}
                onChange={(e) => setCapacidad(Number(e.target.value))}
              />
              <span id="capacidad-error" className="field-error block">
                {capacidadError}
              </span>
            </label>
          </div>
          <label className="my-5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
            />
            Área activa
          </label>
          <fieldset aria-describedby="horarios-error">
            <legend className="mb-4 font-semibold">Horarios por día</legend>
            <p className="mb-4 text-sm text-muted">
              Añade varias franjas para horarios partidos. Las reservas
              existentes se conservan al editar.
            </p>
            <div className="grid gap-3">
              {horarios.map((h, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <label>
                    Día
                    <select
                      aria-label={`Día de franja ${i + 1}`}
                      className="field mt-1"
                      value={h.diaSemana}
                      onChange={(e) =>
                        cambiar(i, { diaSemana: Number(e.target.value) })
                      }
                    >
                      {dias.map((d, n) => (
                        <option key={d} value={n}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hora inicio
                    <input
                      aria-label={`Hora inicio de franja ${i + 1}`}
                      className="field mt-1"
                      type="time"
                      required
                      value={h.horaInicio}
                      onChange={(e) =>
                        cambiar(i, { horaInicio: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Hora fin
                    <input
                      aria-label={`Hora fin de franja ${i + 1}`}
                      className="field mt-1"
                      type="time"
                      required
                      value={h.horaFin}
                      onChange={(e) => cambiar(i, { horaFin: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="button-secondary self-end"
                    aria-label={`Quitar franja ${i + 1}`}
                    onClick={() =>
                      setHorarios((prev) => prev.filter((_, n) => n !== i))
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <p id="horarios-error" className="field-error my-3">
              {horarioError}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setHorarios((prev) => [
                    ...prev,
                    { diaSemana: 1, horaInicio: "06:00", horaFin: "22:00" },
                  ])
                }
              >
                Agregar franja
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setHorarios(
                    dias.map((_, diaSemana) => ({
                      diaSemana,
                      horaInicio: "06:00",
                      horaFin: "22:00",
                    })),
                  )
                }
              >
                Aplicar 06:00–22:00 a toda la semana
              </button>
            </div>
          </fieldset>
          <p role="alert" className="field-error my-4">
            {error}
          </p>
          <div className="flex gap-3">
            <button
              className="button"
              disabled={
                pending || !!nombreError || !!capacidadError || !!horarioError
              }
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={pending}
              onClick={() => setAbierto(false)}
            >
              Volver
            </button>
          </div>
        </form>
      )}
    </>
  );
}

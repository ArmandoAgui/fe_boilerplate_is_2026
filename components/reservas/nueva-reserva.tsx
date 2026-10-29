"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { crearReserva } from "@/app/actions/reservas";
import { fechaValida, type Area } from "@/lib/reservas";
export function NuevaReserva({
  areas,
  hoy,
  inicial,
}: {
  areas: Area[];
  hoy: string;
  inicial: { areaId?: string; fecha?: string; hora?: string };
}) {
  const areaId = inicial.areaId ?? "";
  const fecha = inicial.fecha ?? "";
  const hora = inicial.hora ?? "";
  const [duracion, setDuracion] = useState(1);
  const [asistentes, setAsistentes] = useState(1);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const area = areas.find((a) => a.id === areaId);
  const errores = {
    area: !area ? "Seleccione un área activa" : "",
    fecha: !fechaValida(fecha, hoy)
      ? "Elija una fecha entre hoy y los próximos 30 días"
      : "",
    hora: !/^([01]\d|2[0-3]):00$/.test(hora)
      ? "Seleccione una hora en punto"
      : "",
    asistentes:
      !Number.isInteger(asistentes) ||
      asistentes < 1 ||
      asistentes > (area?.capacidad ?? 500)
        ? "El número de asistentes supera la capacidad o es inválido"
        : "",
    horario: "",
  };
  if (area && !errores.fecha && !errores.hora) {
    const inicio = new Date(`${fecha}T${hora}:00-06:00`);
    const fin = new Date(inicio.getTime() + duracion * 3600000);
    let cursor = inicio.getTime();
    const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    for (const h of area.horarios
      .filter((h) => h.diaSemana === dia)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))) {
      const desde = new Date(`${fecha}T${h.horaInicio}:00-06:00`).getTime();
      const hasta = new Date(`${fecha}T${h.horaFin}:00-06:00`).getTime();
      if (desde <= cursor && hasta > cursor) cursor = hasta;
    }
    if (inicio.getTime() < ahora) errores.horario = "El inicio debe ser futuro";
    else if (cursor < fin.getTime())
      errores.horario = "La reserva está fuera del horario del área";
  }
  if (!areas.length)
    return <p className="panel">Aún no hay áreas activas disponibles</p>;
  if (!area || !fechaValida(fecha, hoy) || errores.hora)
    return (
      <section className="panel max-w-3xl">
        <h2 className="text-xl font-semibold">Primero elige un horario</h2>
        <p className="mt-2 text-muted">
          Consulta la disponibilidad y selecciona el bloque que quieras
          reservar.
        </p>
        <Link href="/areas" className="button mt-5">
          Consultar áreas
        </Link>
      </section>
    );
  const fin = new Date(
    new Date(`${fecha}T${hora}:00-06:00`).getTime() + duracion * 3600000,
  );
  const horaFin = new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fin);
  function confirmar(event: React.FormEvent) {
    event.preventDefault();
    if (Object.values(errores).some(Boolean)) return;
    setError("");
    startTransition(async () => {
      const result = await crearReserva({
        areaId,
        inicio: new Date(`${fecha}T${hora}:00-06:00`).toISOString(),
        duracionHoras: duracion,
        asistentes,
      });
      if (result.error) setError(result.error);
    });
  }
  return (
    <form onSubmit={confirmar} className="panel max-w-3xl">
      <section
        aria-label="Selección de reserva"
        className="reservation-summary mb-6"
      >
        <p className="text-sm font-medium text-muted">
          Tu espacio seleccionado
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {area.nombre}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Capacidad de hasta {area.capacidad} personas
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Fecha</dt>
            <dd className="mt-1 font-medium">
              <time dateTime={fecha}>
                {new Intl.DateTimeFormat("es-SV", {
                  timeZone: "America/El_Salvador",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(`${fecha}T12:00:00-06:00`))}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Horario</dt>
            <dd className="mt-1 font-medium">
              <time dateTime={`${fecha}T${hora}:00-06:00`}>{hora}</time>
              <span> – </span>
              <time dateTime={fin.toISOString()}>{horaFin}</time>
              <span className="ml-2 text-sm font-normal text-muted">
                Hora de El Salvador
              </span>
            </dd>
          </div>
        </dl>
        <Link
          className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
          href={`/areas/${areaId}/disponibilidad?fecha=${fecha}`}
        >
          Elegir otro horario
        </Link>
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          Duración
          <select
            className="field mt-1"
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((h) => (
              <option value={h} key={h}>
                {h} {h === 1 ? "hora" : "horas"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Asistentes{" "}
          <span className="text-sm text-muted">
            (capacidad máxima: {area?.capacidad ?? "—"})
          </span>
          <input
            aria-label="Asistentes"
            className="field mt-1"
            type="number"
            min={1}
            max={area?.capacidad}
            step={1}
            value={asistentes || ""}
            onChange={(e) => setAsistentes(Number(e.target.value))}
            required
          />
          <span className="field-error block">{errores.asistentes}</span>
        </label>
      </div>
      <p role="alert" className="field-error my-4">
        {error || errores.horario}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="button"
          disabled={pending || Object.values(errores).some(Boolean)}
        >
          {pending ? "Confirmando…" : "Confirmar reserva"}
        </button>
        <Link
          className="button-secondary"
          href={`/areas/${areaId}/disponibilidad?fecha=${fecha}`}
        >
          Volver a disponibilidad
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted">
        Puedes tener hasta 2 reservas confirmadas futuras.
      </p>
    </form>
  );
}

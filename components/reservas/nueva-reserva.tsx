"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { crearReserva } from "@/app/actions/reservas";
import { useAuthStore } from "@/components/auth-provider";
import { fechaValida, limiteFecha, type Area } from "@/lib/reservas";
export function NuevaReserva({
  areas,
  hoy,
  inicial,
}: {
  areas: Area[];
  hoy: string;
  inicial: { areaId?: string; fecha?: string; hora?: string };
}) {
  const unidades = useAuthStore((s) => s.unidades);
  const [areaId, setAreaId] = useState(inicial.areaId ?? "");
  const [fecha, setFecha] = useState(inicial.fecha ?? hoy);
  const [hora, setHora] = useState(inicial.hora ?? "");
  const [duracion, setDuracion] = useState(1);
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? "");
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
    unidad: !unidades.some((u) => u.id === unidadId)
      ? "Seleccione una unidad vinculada"
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
  if (!unidades.length)
    return (
      <p className="panel">
        No tienes unidades vinculadas. Solicita su asignación a la
        administración.
      </p>
    );
  function confirmar(event: React.FormEvent) {
    event.preventDefault();
    if (Object.values(errores).some(Boolean)) return;
    setError("");
    startTransition(async () => {
      const result = await crearReserva({
        areaId,
        unidadId,
        inicio: new Date(`${fecha}T${hora}:00-06:00`).toISOString(),
        duracionHoras: duracion,
        asistentes,
      });
      if (result.error) setError(result.error);
    });
  }
  return (
    <form onSubmit={confirmar} className="panel max-w-3xl">
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          Área común
          <select
            aria-label="Área común"
            className="field mt-1"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            required
            aria-describedby="area-error"
          >
            <option value="">Seleccione un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <span id="area-error" className="field-error block">
            {errores.area}
          </span>
        </label>
        <label>
          Unidad habitacional
          <select
            aria-label="Unidad habitacional"
            className="field mt-1"
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            required
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>
          <span className="field-error block">{errores.unidad}</span>
        </label>
        <label>
          Fecha
          <input
            aria-label="Fecha"
            className="field mt-1"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            min={hoy}
            max={limiteFecha(hoy)}
            required
          />
          <span className="field-error block">{errores.fecha}</span>
        </label>
        <label>
          Hora de inicio
          <input
            aria-label="Hora de inicio"
            className="field mt-1"
            type="time"
            step={3600}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
          <span className="field-error block">
            {errores.hora || errores.horario}
          </span>
        </label>
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
          <span className="text-sm text-zinc-500">
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
        {error}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="button"
          disabled={pending || Object.values(errores).some(Boolean)}
        >
          {pending ? "Confirmando…" : "Confirmar reserva"}
        </button>
        <Link className="button-secondary" href="/areas">
          Volver a áreas
        </Link>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Cada unidad puede tener hasta 2 reservas confirmadas futuras.
      </p>
    </form>
  );
}

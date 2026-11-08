"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { crearAutorizacion } from "@/app/actions/visitas";
import {
  HORA,
  aISO,
  errorDocumento,
  errorNombre,
  errorVigencia,
  paraInput,
  ANTICIPACION_MAXIMA_MS,
} from "@/lib/visitas";

type Unidad = { id: string; codigo: string };

// El mockup marca en rojo el campo que falla, no solo el mensaje de abajo.
const campo = (hayError: boolean) =>
  `field mt-1${hayError ? " border-[var(--danger)]" : ""}`;

export function NuevaVisita({ unidades }: { unidades: Unidad[] }) {
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const ahora = Date.now();
  const errNombre = nombre ? errorNombre(nombre) : "";
  const errDocumento = documento ? errorDocumento(documento) : "";
  const errVigencia = errorVigencia(inicio, fin, ahora);
  const completo = Boolean(unidadId && nombre && documento && inicio && fin);
  const invalido =
    !completo || Boolean(errNombre || errDocumento || errVigencia);

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (invalido) return;
    setError("");
    startTransition(async () => {
      const result = await crearAutorizacion({
        unidadId,
        visitanteNombre: nombre.trim(),
        visitanteDocumento: documento,
        inicio: aISO(inicio),
        fin: aISO(fin),
      });
      // Si todo sale bien la acción redirige y acá no se vuelve.
      if (result?.error) setError(result.error);
    });
  }

  if (!unidades.length)
    return (
      <p className="panel">
        No tienes unidades vinculadas, así que no puedes autorizar visitas.
      </p>
    );

  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <p role="alert" className="field-error">
        {error}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* La ayuda y el error van fuera del label y se enlazan con
            aria-describedby: dentro, el nombre accesible del campo cambiaría
            cada vez que el residente escribe. */}
        <div>
          <label htmlFor="visitante-nombre">Nombre del visitante</label>
          <input
            id="visitante-nombre"
            className={campo(Boolean(errNombre))}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            minLength={3}
            maxLength={100}
            required
            aria-invalid={Boolean(errNombre)}
            aria-describedby="visitante-nombre-error"
          />
          <span
            id="visitante-nombre-error"
            role="alert"
            className="field-error block"
          >
            {errNombre}
          </span>
        </div>

        <div>
          <label htmlFor="visitante-documento">Documento</label>
          <input
            id="visitante-documento"
            className={campo(Boolean(errDocumento))}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            required
            aria-invalid={Boolean(errDocumento)}
            aria-describedby="visitante-documento-ayuda visitante-documento-error"
          />
          <span
            id="visitante-documento-ayuda"
            className="mt-1 block text-sm text-muted"
          >
            DUI o pasaporte, de 5 a 20 caracteres sin guiones
          </span>
          <span
            id="visitante-documento-error"
            role="alert"
            className="field-error block"
          >
            {errDocumento}
          </span>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="visitante-unidad">Unidad</label>
          {/* Solo las unidades vinculadas al residente; el servidor lo vuelve
              a verificar contra la sesión antes de guardar. */}
          <select
            id="visitante-unidad"
            className="field mt-1"
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visitante-inicio">Inicio</label>
          <input
            id="visitante-inicio"
            type="datetime-local"
            className={campo(
              Boolean(errVigencia) && errVigencia.includes("inicio"),
            )}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            min={paraInput(ahora)}
            max={paraInput(ahora + ANTICIPACION_MAXIMA_MS)}
            required
          />
        </div>

        <div>
          <label htmlFor="visitante-fin">Fin</label>
          <input
            id="visitante-fin"
            type="datetime-local"
            className={campo(
              Boolean(errVigencia) && !errVigencia.includes("inicio"),
            )}
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            min={inicio || paraInput(ahora)}
            max={paraInput(
              inicio
                ? new Date(aISO(inicio)).getTime() + 24 * HORA
                : ahora + ANTICIPACION_MAXIMA_MS,
            )}
            required
            aria-invalid={Boolean(errVigencia)}
            aria-describedby="visitante-vigencia-error"
          />
          <span
            id="visitante-vigencia-error"
            role="alert"
            className="field-error block"
          >
            {errVigencia}
          </span>
        </div>
      </div>

      {/* Aviso informativo del mockup. El fondo sale de la paleta para que
          funcione en claro y oscuro; solo la línea lateral va literal, porque
          el proyecto todavía no tiene un token de color informativo. */}
      <p
        className="reservation-summary mt-6 border-l-4"
        style={{ borderLeftColor: "#2563eb" }}
      >
        Vigencia máxima: 24 horas. La autorización sirve para un solo ingreso.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="button" disabled={invalido || pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link className="button-secondary" href="/visitas">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

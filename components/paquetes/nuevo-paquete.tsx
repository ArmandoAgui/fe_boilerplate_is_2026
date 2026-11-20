"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { registrarPaquete } from "@/app/actions/paquetes";
import {
  LARGO_EMPRESA,
  MAXIMO_DESCRIPCION,
  errorDescripcion,
  errorEmpresa,
  errorUnidad,
  fechaHora,
  filtrarUnidades,
  type UnidadOpcion,
} from "@/lib/paquetes";

export function NuevoPaquete({ unidades }: { unidades: UnidadOpcion[] }) {
  const [buscar, setBuscar] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [registrado, setRegistrado] = useState("");
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState("");
  const [pendiente, startTransition] = useTransition();

  // La hora de recepción no puede venir del servidor: el HTML llegaría con
  // una hora y el cliente pintaría otra, y React marcaría un error de
  // hidratación. Se refresca para que no envejezca con el formulario abierto.
  useEffect(() => {
    const marcar = () => setAhora(new Date().toISOString());
    marcar();
    const timer = setInterval(marcar, 30_000);
    return () => clearInterval(timer);
  }, []);

  // El catálogo llega entero al abrir, así que filtrar en el cliente es
  // instantáneo y evita una consulta por cada tecla.
  const visibles = useMemo(
    () => filtrarUnidades(unidades, buscar),
    [unidades, buscar],
  );

  const errores = {
    unidadId: errorUnidad(unidadId),
    empresa: errorEmpresa(empresa),
    descripcion: errorDescripcion(descripcion),
  };
  const invalido = Object.values(errores).some(Boolean);

  function registrar() {
    setEnviado(true);
    if (invalido) return;
    setError("");
    setRegistrado("");
    startTransition(async () => {
      const resultado = await registrarPaquete({
        unidadId,
        empresa: empresa.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      if (resultado.error || !resultado.paquete) {
        setError(
          resultado.error ?? "No se pudo completar la operación. Intente de nuevo.",
        );
        return;
      }
      // La tarjeta pide limpiar el formulario: en la recepción se registran
      // varios paquetes seguidos y nadie quiere borrar campos a mano.
      setRegistrado(resultado.paquete.codigo);
      setUnidadId("");
      setEmpresa("");
      setDescripcion("");
      setBuscar("");
      setEnviado(false);
    });
  }

  return (
    <>
      <p role="status" className="mb-2 text-accent">
        {registrado && `Paquete registrado · ${registrado}`}
      </p>
      <p role="alert" className="field-error mb-4">
        {error}
      </p>

      <form
        className="panel grid gap-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          registrar();
        }}
      >
        <div className="sm:col-span-2">
          <label className="label" htmlFor="buscar-unidad">
            Buscar unidad
          </label>
          <input
            id="buscar-unidad"
            className="input"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            aria-describedby="buscar-unidad-ayuda"
            autoComplete="off"
          />
          <p id="buscar-unidad-ayuda" className="mt-2 text-sm text-muted">
            Filtra la lista por código o por torre.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="unidad">
            Unidad de destino
          </label>
          <select
            id="unidad"
            className="input"
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            aria-describedby="unidad-error"
            aria-invalid={enviado && Boolean(errores.unidadId)}
          >
            <option value="">Seleccione una unidad</option>
            {visibles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo} · {u.torre}
              </option>
            ))}
          </select>
          <p id="unidad-error" role="alert" className="field-error">
            {enviado ? errores.unidadId : ""}
          </p>
          {visibles.length === 0 && (
            <p className="mt-2 text-sm text-muted">
              Ninguna unidad coincide con esa búsqueda
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="empresa">
            Empresa
          </label>
          <input
            id="empresa"
            className="input"
            value={empresa}
            maxLength={LARGO_EMPRESA.max}
            onChange={(e) => setEmpresa(e.target.value)}
            aria-describedby="empresa-error"
            aria-invalid={enviado && Boolean(errores.empresa)}
            autoComplete="off"
          />
          <p id="empresa-error" role="alert" className="field-error">
            {enviado ? errores.empresa : ""}
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="descripcion">
            Descripción <span className="text-muted">(opcional)</span>
          </label>
          <textarea
            id="descripcion"
            className="input"
            rows={3}
            value={descripcion}
            maxLength={MAXIMO_DESCRIPCION}
            onChange={(e) => setDescripcion(e.target.value)}
            aria-describedby="descripcion-error"
            aria-invalid={enviado && Boolean(errores.descripcion)}
          />
          <p id="descripcion-error" role="alert" className="field-error">
            {enviado ? errores.descripcion : ""}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="recibido">
            Fecha y hora de recepción
          </label>
          <input
            id="recibido"
            className="input"
            value={ahora ? fechaHora(ahora) : ""}
            readOnly
            aria-describedby="recibido-ayuda"
          />
          <p id="recibido-ayuda" className="mt-2 text-sm text-muted">
            La registra el servidor al guardar.
          </p>
        </div>

        <div className="flex items-end">
          <button
            className="button"
            type="submit"
            disabled={pendiente || (enviado && invalido)}
          >
            {pendiente ? "Registrando…" : "Registrar paquete"}
          </button>
        </div>
      </form>
    </>
  );
}

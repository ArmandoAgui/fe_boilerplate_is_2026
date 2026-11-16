"use client";
import { useState, useTransition } from "react";
import { cargarResidentes, operacion } from "@/app/actions/integracion";
export function SolicitarIngreso({
  unidades,
}: {
  unidades: { id: string; codigo: string }[];
}) {
  const [unidad, setUnidad] = useState("");
  const [residentes, setResidentes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [residente, setResidente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="panel mb-6">
      <h2 className="text-xl font-semibold">
        Solicitar confirmación del residente
      </h2>
      <p className="my-3 text-muted">
        La solicitud aparece en Mis visitantes del residente. Solo después de
        que la apruebe podrás registrar la entrada. Vence en una hora.
      </p>
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(f) =>
          start(async () => {
            const r = await operacion("solicitud", "", {
              unidadId: unidad,
              residenteId: residente,
              visitanteNombre: String(f.get("nombre")),
              ...(f.get("documento")
                ? { visitanteDocumento: String(f.get("documento")) }
                : {}),
            });
            setMensaje(
              r.error ??
                "Solicitud enviada. Espera la aprobación y vuelve a buscar la autorización.",
            );
          })
        }
      >
        <label>
          Unidad
          <select
            className="field mt-1"
            required
            value={unidad}
            onChange={(e) => {
              const id = e.target.value;
              setUnidad(id);
              setResidente("");
              setResidentes([]);
              start(async () => {
                const r = await cargarResidentes("unidad", id);
                setResidentes(r.datos ?? []);
                if (r.error) setMensaje(r.error);
              });
            }}
          >
            <option value="">Seleccionar unidad</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Residente que confirma
          <select
            className="field mt-1"
            required
            disabled={pending}
            value={residente}
            onChange={(e) => setResidente(e.target.value)}
          >
            <option value="">Seleccionar residente</option>
            {residentes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre y apellido del visitante
          <input
            name="nombre"
            className="field mt-1"
            required
            minLength={3}
            maxLength={100}
            pattern="\S+\s+\S+.*"
          />
        </label>
        <label>
          Documento (opcional)
          <input
            name="documento"
            className="field mt-1"
            pattern="[A-Za-z0-9]{5,20}"
          />
        </label>
        <button className="button" disabled={pending || !residente}>
          Solicitar confirmación
        </button>
      </form>
      <p role="status" className="mt-3">
        {mensaje}
      </p>
    </section>
  );
}
export function AprobarIngreso({ id }: { id: string }) {
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button
        className="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await operacion("aprobacion", id, {});
            setMensaje(r.error ?? "Ingreso autorizado");
          })
        }
      >
        Autorizar ingreso
      </button>
      <p role="status">{mensaje}</p>
    </>
  );
}

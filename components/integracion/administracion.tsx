"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { operacion } from "@/app/actions/integracion";
export function Vinculos({
  residentes,
  unidades,
}: {
  residentes: {
    id: string;
    nombre: string;
    email: string;
    unidades: { unidadId: string }[];
  }[];
  unidades: { id: string; codigo: string }[];
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  function enviar(tipo: "vinculo" | "usuario", form: FormData) {
    start(async () => {
      const r = await operacion(tipo, "", Object.fromEntries(form));
      setMensaje(
        r.error ??
          (tipo === "usuario"
            ? "Residente registrado"
            : "Vinculación guardada"),
      );
      if (r.ok) router.refresh();
    });
  }
  return (
    <>
      <p role="status">{mensaje}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <form className="panel space-y-4" action={(f) => enviar("usuario", f)}>
          <h2 className="text-xl font-semibold">Registrar residente</h2>
          <label className="block">
            Nombre y apellido
            <input
              className="field mt-1"
              name="nombre"
              required
              minLength={3}
              maxLength={100}
            />
          </label>
          <label className="block">
            Correo
            <input className="field mt-1" name="email" type="email" required />
          </label>
          <label className="block">
            Contraseña inicial
            <input
              className="field mt-1"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </label>
          <p className="text-sm text-muted">
            Debe incluir mayúscula, minúscula y número.
          </p>
          <button className="button" disabled={pending}>
            Registrar
          </button>
        </form>
        <form className="panel space-y-4" action={(f) => enviar("vinculo", f)}>
          <h2 className="text-xl font-semibold">Asociar residente a unidad</h2>
          <label className="block">
            Residente
            <select className="field mt-1" name="userId" required>
              <option value="">Seleccionar</option>
              {residentes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} · {r.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Unidad
            <select className="field mt-1" name="unidadId" required>
              <option value="">Seleccionar</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">
            Un residente puede pertenecer a varias unidades y una unidad a
            varios residentes.
          </p>
          <button className="button" disabled={pending}>
            Vincular
          </button>
        </form>
      </div>
      <section className="panel mt-5">
        <h2 className="text-xl font-semibold">Vinculaciones actuales</h2>
        <ul className="mt-3 space-y-2">
          {residentes.map((r) => (
            <li key={r.id}>
              {r.nombre}:{" "}
              {r.unidades
                .map(
                  (v) =>
                    unidades.find((u) => u.id === v.unidadId)?.codigo ??
                    "Unidad inactiva",
                )
                .join(", ") || "Sin unidad"}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
export function AjustarCuotas({
  datos,
  tarifaMensual,
  porcentajeRecargo,
}: {
  tarifaMensual: string;
  porcentajeRecargo: number;
  datos: {
    id: string;
    periodo: string;
    monto: string;
    estado: string;
    fechaVencimiento: string;
    unidad: { codigo: string };
  }[];
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <p role="status">{mensaje}</p>
      <p className="panel mb-4">
        Tarifa mensual fija: ${tarifaMensual}. Recargo único de{" "}
        {porcentajeRecargo}% desde el día posterior al vencimiento, sin interés
        compuesto. Los ajustes requieren motivo y conservan evidencia.
      </p>
      <div className="space-y-4">
        {datos.map((c) => (
          <form
            key={c.id}
            className="panel space-y-3"
            action={(f) =>
              start(async () => {
                const r = await operacion("ajuste", c.id, {
                  monto: Number(f.get("monto")),
                  fechaVencimiento: String(f.get("fechaVencimiento")),
                  motivo: String(f.get("motivo")),
                  ...(f.get("anular") ? { estado: "ANULADA" } : {}),
                });
                setMensaje(r.error ?? "Cuota actualizada");
                if (r.ok) router.refresh();
              })
            }
          >
            <h2 className="font-semibold">
              {c.unidad.codigo} · {c.periodo} · {c.estado}
            </h2>
            {c.estado === "PENDIENTE" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    Monto base USD
                    <input
                      className="field mt-1"
                      name="monto"
                      type="number"
                      min="0.01"
                      max="99999999.99"
                      step="0.01"
                      defaultValue={c.monto}
                      required
                    />
                  </label>
                  <label>
                    Vencimiento
                    <input
                      className="field mt-1"
                      name="fechaVencimiento"
                      type="date"
                      defaultValue={c.fechaVencimiento.slice(0, 10)}
                      required
                    />
                  </label>
                </div>
                <label className="block">
                  Motivo
                  <input
                    className="field mt-1"
                    name="motivo"
                    minLength={5}
                    maxLength={300}
                    required
                  />
                </label>
                <label className="flex gap-2">
                  <input name="anular" type="checkbox" />
                  Anular cuota por error
                </label>
                <button className="button-secondary" disabled={pending}>
                  Guardar ajuste
                </button>
              </>
            ) : (
              <p className="text-muted">
                Se conserva el registro y su historial financiero.
              </p>
            )}
          </form>
        ))}
      </div>
    </>
  );
}

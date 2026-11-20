"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cargarResidentes, operacion } from "@/app/actions/integracion";
type Paquete = {
  id: string;
  codigo: string;
  empresa: string;
  descripcion?: string | null;
  unidadCodigo: string;
  estado: string;
  recibidoAt: string;
};
export function GestionPaquetes({
  datos,
  puedeEntregar,
}: {
  datos: Paquete[];
  puedeEntregar: boolean;
}) {
  const router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null);
  const [seleccion, setSeleccion] = useState<Paquete>();
  const [modo, setModo] = useState("entrega");
  const [residentes, setResidentes] = useState<
    { id: string; nombre: string; email?: string }[]
  >([]);
  const [residente, setResidente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  function abrir(p: Paquete, tipo: string) {
    setSeleccion(p);
    setModo(tipo);
    setError("");
    setResidente("");
    setResidentes([]);
    dialog.current?.showModal();
    if (tipo === "entrega")
      start(async () => {
        const r = await cargarResidentes("paquete", p.id);
        setResidentes(r.datos ?? []);
        if (r.error) setError(r.error);
      });
  }
  function enviar(form: FormData) {
    if (!seleccion) return;
    start(async () => {
      const d =
        modo === "entrega"
          ? { residenteId: residente }
          : {
              empresa: String(form.get("empresa")),
              descripcion: String(form.get("descripcion")),
              motivo: String(form.get("motivo")),
              ...(form.get("anular") ? { estado: "ANULADO" } : {}),
            };
      const r = await operacion(
        modo === "entrega" ? "entrega" : "correccion",
        seleccion.id,
        d,
      );
      if (r.error) {
        setError(r.error);
        return;
      }
      setMensaje(
        modo === "entrega" ? "Entrega registrada" : "Registro actualizado",
      );
      dialog.current?.close();
      router.refresh();
    });
  }
  return (
    <>
      <p role="status" className="mb-4">
        {mensaje}
      </p>
      {!datos.length ? (
        <p className="panel">No hay paquetes con estos filtros</p>
      ) : (
        <div className="panel overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {["Código", "Unidad", "Empresa", "Estado", "Acciones"].map(
                  (t) => (
                    <th className="p-3" key={t}>
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {datos.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="p-3">{p.codigo}</td>
                  <td className="p-3">{p.unidadCodigo}</td>
                  <td className="p-3">{p.empresa}</td>
                  <td className="p-3">{p.estado}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {puedeEntregar && p.estado === "PENDIENTE" && (
                        <button
                          className="button"
                          onClick={() => abrir(p, "entrega")}
                        >
                          Entregar
                        </button>
                      )}
                      {p.estado !== "ANULADO" && (
                        <button
                          className="button-secondary"
                          onClick={() => abrir(p, "correccion")}
                        >
                          Corregir o anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dialog ref={dialog} className="panel max-w-lg backdrop:bg-slate-950/60">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            enviar(new FormData(event.currentTarget));
          }}
          key={seleccion?.id + modo}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold">
            {modo === "entrega" ? "Entregar" : "Corregir"} {seleccion?.codigo}
          </h2>
          {modo === "entrega" ? (
            <>
              <p>
                Verifica la identidad con los datos de plataforma. Solo
                residentes activos de la unidad pueden retirar.
              </p>
              <label className="block">
                Residente que retira
                <select
                  className="field mt-1"
                  required
                  value={residente}
                  onChange={(e) => setResidente(e.target.value)}
                >
                  <option value="">Seleccionar residente</option>
                  {residentes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} · {r.email}
                    </option>
                  ))}
                </select>
              </label>
              {!pending && !residentes.length && (
                <p>No hay residentes habilitados para retirar.</p>
              )}
            </>
          ) : (
            <>
              <label className="block">
                Empresa
                <input
                  name="empresa"
                  className="field mt-1"
                  defaultValue={seleccion?.empresa}
                  required
                  minLength={2}
                  maxLength={60}
                />
              </label>
              <label className="block">
                Descripción
                <input
                  name="descripcion"
                  className="field mt-1"
                  maxLength={120}
                  defaultValue={seleccion?.descripcion ?? ""}
                />
              </label>
              <label className="flex gap-2">
                <input type="checkbox" name="anular" />
                Anular registro por error
              </label>
              <label className="block">
                Motivo
                <textarea
                  name="motivo"
                  className="field mt-1"
                  required
                  minLength={5}
                  maxLength={300}
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              className="button"
              disabled={pending || (modo === "entrega" && !residente)}
            >
              {pending ? "Guardando…" : "Confirmar"}
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
        </form>
      </dialog>
    </>
  );
}

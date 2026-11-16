import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  esUuid,
  etiquetaEstado,
  type EstadoIncidencia,
} from "@/lib/incidencias-admin";
import { fechaHora } from "@/lib/asambleas";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await usuarioActual();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  type Detalle = {
    codigo: string;
    descripcion: string;
    lugar: string;
    estado: EstadoIncidencia;
    responsable: { nombre: string } | null;
    evidencias: { id: string; url: string }[];
    historial: {
      campo: string;
      valorAnterior: string | null;
      valorNuevo: string;
      actor: string;
      fecha: string;
    }[];
  };
  let i: Detalle;
  try {
    i = await api<Detalle>(`incidencias/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      <Link href="/incidencias">Volver a mis incidencias</Link>
      <article className="panel mt-4">
        <h1 className="text-2xl font-semibold">{i.codigo}</h1>
        <p className="my-3">
          {etiquetaEstado[i.estado]} · {i.lugar}
        </p>
        <p className="whitespace-pre-wrap">{i.descripcion}</p>
        <p className="mt-4 text-muted">
          Responsable: {i.responsable?.nombre ?? "Sin asignar"}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {i.evidencias.map((e) => (
            <a
              key={e.id}
              className="button-secondary"
              href={`/api/incidencias/${id}/evidencias/${e.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver fotografía
            </a>
          ))}
        </div>
        <h2 className="mt-6 text-xl font-semibold">Historial</h2>
        <ol className="mt-3 space-y-4 border-l border-line pl-4">
          {i.historial.map((h, n) => (
            <li key={n}>
              <p>
                {h.campo}: {h.valorAnterior ?? "Sin valor"} → {h.valorNuevo}
              </p>
              <p className="text-sm text-muted">
                {fechaHora(h.fecha)} · {h.actor}
              </p>
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}

import Link from "next/link";

import { api } from "@/lib/api";

import {
  SinPermiso,
  Titulo,
} from "@/components/reservas/ui";

import {
  fechaAsamblea,
  type ListaAsambleas,
} from "@/lib/asambleas";

export default async function AsambleasPage() {
  const usuario = await api<{ rol: string }>("auth/me");

  if (usuario.rol !== "RESIDENTE") {
    return <SinPermiso />;
  }

  const resultado = await api<ListaAsambleas>(
    "asambleas?pagina=1&tamanoPagina=20",
  );

  return (
    <>
      <Titulo
        titulo="Asambleas"
        detalle="Consulta las convocatorias y participa en las votaciones de tu comunidad."
      />

      {!resultado.datos.length ? (
        <p className="panel">
          No hay asambleas convocadas
        </p>
      ) : (
        <div className="grid gap-4">
          {resultado.datos.map((asamblea) => (
            <article key={asamblea.id} className="panel">
              <h2 className="text-xl font-semibold">
                {asamblea.titulo}
              </h2>

              <p className="mt-2 text-sm text-muted">
                {fechaAsamblea(asamblea.fechaHora)}
              </p>

              {asamblea.descripcion && (
                <p className="mt-3">
                  {asamblea.descripcion}
                </p>
              )}

              <p className="mt-3 text-sm text-muted">
                {asamblea.temas.length} temas de votación
              </p>

              <Link
                href={`/asambleas/${asamblea.id}`}
                className="button mt-4 inline-flex"
              >
                Consultar asamblea
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

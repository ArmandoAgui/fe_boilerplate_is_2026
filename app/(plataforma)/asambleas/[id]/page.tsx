import { api } from "@/lib/api";

import {
  SinPermiso,
  Titulo,
} from "@/components/reservas/ui";

import type {
  TemaVotacion,
  EstadoParticipacion,
  UnidadVotante,
} from "@/lib/votaciones";

import { VotacionClient } from "./votacion-client";

export default async function VotacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const usuario = await api<{ rol: string }>("auth/me");

  if (usuario.rol !== "RESIDENTE") {
    return <SinPermiso />;
  }

  const temas = await api<TemaVotacion[]>(
    `asambleas/${id}/temas`,
  );

  const { datos: unidades } = await api<{
    datos: UnidadVotante[];
  }>("unidades/mias");

  let estadosIniciales: EstadoParticipacion[] = [];

  if (unidades.length > 0) {
    estadosIniciales = await Promise.all(
      temas.map((tema) => {
        const params = new URLSearchParams({
          unidadId: unidades[0].id,
        });

        return api<EstadoParticipacion>(
          `votaciones/${tema.id}/miestado?${params.toString()}`,
        );
      }),
    );
  }

  return (
    <>
      <Titulo
        titulo="Votaciones de la asamblea"
        detalle="Selecciona una unidad y participa en los temas que estén abiertos."
      />

      {!unidades.length ? (
        <p className="panel">
          No tienes unidades activas vinculadas.
        </p>
      ) : !temas.length ? (
        <p className="panel">
          Esta asamblea no tiene temas de votación.
        </p>
      ) : (
        <VotacionClient
          temas={temas}
          unidades={unidades}
          estadosIniciales={estadosIniciales}
        />
      )}
    </>
  );
}

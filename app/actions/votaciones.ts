"use server";

import { api } from "@/lib/api";

import type {
  ResultadoVotacion,
  EstadoParticipacion,
} from "@/lib/votaciones";

export async function consultarResultado(
  temaId: string,
) {
  return api<ResultadoVotacion>(
    `votaciones/${temaId}/resultados`,
  );
}

export async function consultarMiEstado(
  temaId: string,
  unidadId: string,
) {
  const params = new URLSearchParams({
    unidadId,
  });

  return api<EstadoParticipacion>(
    `votaciones/${temaId}/miestado?${params.toString()}`,
  );
}

export async function emitirVoto(
  temaId: string,
  unidadId: string,
  opcionId: string,
) {
  return api<{
    id: string;
    temaId: string;
    unidadId: string;
    fecha: string;
  }>(
    `votaciones/${temaId}/votos`,
    {
      method: "POST",
      body: JSON.stringify({
        unidadId,
        opcionId,
      }),
    },
  );
}

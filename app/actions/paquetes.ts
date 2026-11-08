"use server";

import { api } from "@/lib/api";

import type {
  ListaPaquetes,
  EstadoPaquete,
} from "@/lib/paquetes";

export async function listarMisPaquetes(
  unidadId: string,
  estado: EstadoPaquete,
  pagina = 1,
) {
  const params = new URLSearchParams({
    unidadId,
    estado,
    pagina: String(pagina),
    tamanoPagina: "20",
  });

  return api<ListaPaquetes>(
    `paquetes/mios?${params.toString()}`,
  );
}

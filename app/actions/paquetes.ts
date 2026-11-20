"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { PaqueteRegistrado, UnidadOpcion } from "@/lib/paquetes";

export type Resultado = { error?: string; status?: number };

function fallo(error: unknown): Resultado {
  // Las redirecciones de Next viajan como Error con digest y deben propagarse,
  // incluida la de sesión vencida que lanza lib/api.
  if (error instanceof ApiError)
    return { error: error.message, status: error.status };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}

export type Registro = Resultado & { paquete?: PaqueteRegistrado };

export async function registrarPaquete(data: {
  unidadId: string;
  empresa: string;
  descripcion?: string;
}): Promise<Registro> {
  let paquete: PaqueteRegistrado;
  try {
    paquete = await api<PaqueteRegistrado>("paquetes", {
      method: "POST",
      // Una descripción vacía no se manda: el contrato la admite ausente, no
      // en blanco.
      body: JSON.stringify({
        unidadId: data.unidadId,
        empresa: data.empresa,
        ...(data.descripcion ? { descripcion: data.descripcion } : {}),
      }),
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/seguridad/paquetes");
  return { paquete };
}

export type CatalogoUnidades = Resultado & { datos?: UnidadOpcion[] };

export async function listarUnidades(
  buscar?: string,
): Promise<CatalogoUnidades> {
  const query = buscar ? `?buscar=${encodeURIComponent(buscar)}` : "";
  try {
    const { datos } = await api<{ datos: UnidadOpcion[] }>(
      `unidades${query}`,
    );
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

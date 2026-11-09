"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type {
  DetalleMorosidad,
  PreviaGeneracion,
  ResultadoGeneracion,
} from "@/lib/cuotas";

export type Resultado<T> = { datos?: T; error?: string; status?: number };

function fallo<T>(error: unknown): Resultado<T> {
  // Las redirecciones de Next (por ejemplo, sesión vencida en lib/api) viajan
  // como Error con digest y deben propagarse.
  if (error instanceof ApiError)
    return { error: error.message, status: error.status };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}

/** H3: resumen previo del período elegido. */
export async function obtenerPrevia(
  periodo: string,
): Promise<Resultado<PreviaGeneracion>> {
  try {
    const datos = await api<PreviaGeneracion>(
      `cuotas/generaciones/previa?periodo=${encodeURIComponent(periodo)}`,
    );
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

/** H3: genera las cuotas del período. */
export async function generarCuotas(
  periodo: string,
): Promise<Resultado<ResultadoGeneracion>> {
  try {
    const datos = await api<ResultadoGeneracion>("cuotas/generaciones", {
      method: "POST",
      body: JSON.stringify({ periodo }),
    });
    revalidatePath("/admin/cuotas/generar");
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

/** H4: cuotas vencidas de una unidad, para el panel de detalle. */
export async function obtenerDetalleMorosidad(
  unidadId: string,
): Promise<Resultado<DetalleMorosidad>> {
  try {
    const datos = await api<DetalleMorosidad>(
      `administracion/morosidad/${encodeURIComponent(unidadId)}`,
    );
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

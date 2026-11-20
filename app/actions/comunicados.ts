"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { PublicacionComunicado, Alcance } from "@/lib/comunicados";
type Resultado = { error?: string; destinatarios?: number };
function fallo(error: unknown): Resultado {
  if (error instanceof ApiError) return { error: error.message };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}
export async function previaComunicado(
  alcance: Alcance,
  destinoId?: string,
): Promise<Resultado> {
  const query = new URLSearchParams({ alcance });
  if (destinoId) query.set("destinoId", destinoId);
  try {
    return await api<{ destinatarios: number }>(
      `comunicados/destinatarios?${query}`,
    );
  } catch (error) {
    return fallo(error);
  }
}
export async function publicarComunicado(
  data: PublicacionComunicado,
): Promise<Resultado> {
  try {
    const creado = await api<{ destinatarios: number }>("comunicados", {
      method: "POST",
      body: JSON.stringify(data),
    });
    revalidatePath("/admin/comunicados");
    revalidatePath("/comunicados");
    return { destinatarios: creado.destinatarios };
  } catch (error) {
    return fallo(error);
  }
}

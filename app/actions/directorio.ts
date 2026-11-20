"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { Ficha, PaginaDirectorio, Preferencias } from "@/lib/directorio";
type Resultado = { ok?: boolean; error?: string; data?: Preferencias };
function fallo(e: unknown): { error: string } {
  if (e instanceof ApiError) return { error: e.message };
  if (e instanceof Error && "digest" in e) throw e;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}
export async function guardarPreferencias(datos: Preferencias): Promise<Resultado> {
  try {
    const data = await api<Preferencias>("directorio/mis-preferencias", {
      method: "PUT",
      body: JSON.stringify(datos),
    });
    revalidatePath("/directorio/preferencias");
    return { ok: true, data };
  } catch (e) {
    return fallo(e);
  }
}
export async function buscarDirectorio(
  buscar: string,
  pagina = 1,
): Promise<{ error?: string; data?: PaginaDirectorio }> {
  try {
    const q = new URLSearchParams({ buscar, pagina: String(pagina) });
    return { data: await api<PaginaDirectorio>(`directorio?${q}`) };
  } catch (e) {
    return fallo(e);
  }
}
export async function obtenerFicha(id: string): Promise<{ error?: string; data?: Ficha }> {
  try {
    return { data: await api<Ficha>(`directorio/${encodeURIComponent(id)}`) };
  } catch (e) {
    return fallo(e);
  }
}

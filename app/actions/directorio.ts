"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { Preferencias } from "@/lib/directorio";

type Resultado = { ok?: boolean; error?: string; data?: Preferencias };
function fallo(e: unknown): Resultado {
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

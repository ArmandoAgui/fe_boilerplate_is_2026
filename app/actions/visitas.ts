"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Autorizacion } from "@/lib/visitas";

export type Resultado = { error?: string; status?: number; ok?: boolean };

function fallo(error: unknown): Resultado {
  // Las redirecciones de Next viajan como Error con digest y deben propagarse,
  // incluida la de sesión vencida que lanza lib/api.
  if (error instanceof ApiError)
    return { error: error.message, status: error.status };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}

export async function crearAutorizacion(data: {
  unidadId: string;
  visitanteNombre: string;
  visitanteDocumento: string;
  inicio: string;
  fin: string;
}): Promise<Resultado> {
  let creada: Autorizacion;
  try {
    creada = await api<Autorizacion>("visitas/autorizaciones", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/visitas");
  redirect(
    `/visitas?autorizada=${encodeURIComponent(creada.visitanteNombre)}`,
  );
}

export async function cancelarAutorizacion(id: string): Promise<Resultado> {
  try {
    await api(
      `visitas/autorizaciones/${encodeURIComponent(id)}/cancelacion`,
      { method: "PATCH" },
    );
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/visitas");
  return { ok: true };
}

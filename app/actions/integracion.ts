"use server";
import { api, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
// Fixed operation names prevent exposing an arbitrary backend proxy as a Server Action.
export async function operacion(
  tipo:
    | "estado"
    | "entrega"
    | "correccion"
    | "ajuste"
    | "vinculo"
    | "usuario"
    | "solicitud"
    | "aprobacion",
  id: string,
  datos: Record<string, unknown>,
) {
  const rutas = {
    estado: `incidencias/${encodeURIComponent(id)}/estado`,
    entrega: `paquetes/${encodeURIComponent(id)}/entrega`,
    correccion: `paquetes/${encodeURIComponent(id)}/correccion`,
    ajuste: `administracion/cuotas/${encodeURIComponent(id)}`,
    vinculo: "administracion/vinculos",
    usuario: "users",
    solicitud: "visitas/autorizaciones/solicitudes",
    aprobacion: `visitas/autorizaciones/${encodeURIComponent(id)}/aprobacion`,
  };
  if (!Object.hasOwn(rutas, tipo)) return { error: "Operación inválida" };
  try {
    await api(rutas[tipo], {
      method: ["estado", "correccion", "ajuste", "aprobacion"].includes(tipo)
        ? "PATCH"
        : "POST",
      body: JSON.stringify(datos),
    });
    for (const path of [
      "/incidencias",
      "/admin/incidencias",
      "/paquetes",
      "/seguridad/paquetes",
      "/admin/cuotas",
      "/admin/residentes",
      "/visitas",
      "/seguridad/accesos",
    ])
      revalidatePath(path);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    if (e instanceof Error && "digest" in e) throw e;
    return { error: "No se pudo completar la operación. Intenta de nuevo." };
  }
}
export async function cargarResidentes(
  tipo: "paquete" | "unidad",
  id: string,
): Promise<{
  datos?: { id: string; nombre: string; email?: string }[];
  error?: string;
}> {
  if (tipo !== "paquete" && tipo !== "unidad")
    return { error: "Operación inválida" };
  try {
    return await api(
      tipo === "paquete"
        ? `paquetes/${encodeURIComponent(id)}/residentes`
        : `administracion/unidades/${encodeURIComponent(id)}/residentes`,
    );
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    if (e instanceof Error && "digest" in e) throw e;
    return { error: "No se pudieron cargar los residentes" };
  }
}

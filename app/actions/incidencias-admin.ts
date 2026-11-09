"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api, usuarioActual } from "@/lib/api";
import {
  PRIORIDADES_INCIDENCIA,
  esUuid,
  type ActualizacionAsignacion,
  type ResponsableIncidencia,
  type Resultado,
} from "@/lib/incidencias-admin";

function fallo<T>(error: unknown): Resultado<T> {
  if (error instanceof ApiError)
    return {
      error: error.message,
      status: error.status,
      campo: error.campo,
    };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}

async function esAdministrador() {
  const usuario = await usuarioActual();
  return usuario.rol === "ADMINISTRADOR";
}

export async function guardarAsignacionIncidencia(
  id: string,
  cambios: ActualizacionAsignacion,
): Promise<Resultado<{ id: string; prioridad: string | null; responsable: ResponsableIncidencia | null; estado: string }>> {
  try {
    if (!(await esAdministrador()))
      return { error: "No tienes permiso para realizar este cambio.", status: 403 };
    if (!esUuid(id))
      return { error: "La incidencia solicitada no es válida.", status: 400 };

    const body: ActualizacionAsignacion = {};
    if (cambios.prioridad !== undefined) {
      if (!PRIORIDADES_INCIDENCIA.includes(cambios.prioridad))
        return { error: "Seleccione una prioridad válida.", status: 400, campo: "prioridad" };
      body.prioridad = cambios.prioridad;
    }
    if (cambios.responsableId !== undefined) {
      if (!esUuid(cambios.responsableId))
        return { error: "Seleccione un responsable válido.", status: 400, campo: "responsableId" };
      body.responsableId = cambios.responsableId;
    }
    if (!Object.keys(body).length)
      return { error: "Realice al menos un cambio antes de guardar.", status: 400 };

    const datos = await api<{
      id: string;
      prioridad: string | null;
      responsable: ResponsableIncidencia | null;
      estado: string;
    }>("incidencias/" + id + "/asignacion", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    revalidatePath("/admin/incidencias");
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

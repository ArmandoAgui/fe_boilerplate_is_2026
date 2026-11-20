"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api, usuarioActual } from "@/lib/api";
import {
  ESTADOS_DESTINO_H11,
  PRIORIDADES_INCIDENCIA,
  coincideConEstadoDestino,
  esUuid,
  type ActualizacionAsignacion,
  type ActualizacionEstadoIncidencia,
  type EstadoIncidencia,
  type ResponsableIncidencia,
  type Resultado,
} from "@/lib/incidencias-admin";

type ResultadoActualizacionEstado = Resultado<ActualizacionEstadoIncidencia> & {
  estadoActual?: EstadoIncidencia;
  estadoVerificado?: boolean;
};

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

async function leerEstadoIncidencia(
  id: string,
): Promise<EstadoIncidencia | undefined> {
  try {
    const detalle = await api<{ estado?: unknown }>("incidencias/" + id);
    return ESTADOS_DESTINO_H11.includes(
      detalle.estado as (typeof ESTADOS_DESTINO_H11)[number],
    ) || detalle.estado === "ABIERTA" || detalle.estado === "ASIGNADA"
      ? (detalle.estado as EstadoIncidencia)
      : undefined;
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return undefined;
  }
}

export async function actualizarEstadoIncidencia(
  id: string,
  estado: unknown,
): Promise<ResultadoActualizacionEstado> {
  try {
    if (!(await esAdministrador()))
      return {
        error: "No tienes permiso para modificar incidencias.",
        status: 403,
      };
    if (!esUuid(id))
      return { error: "La incidencia solicitada no es válida.", status: 400 };
    if (!coincideConEstadoDestino(estado))
      return {
        error: "Seleccione una transición de estado válida.",
        status: 400,
        campo: "estado",
      };

    let datos: ActualizacionEstadoIncidencia;
    try {
      datos = await api<ActualizacionEstadoIncidencia>(
        "incidencias/" + id + "/estado",
        { method: "PATCH", body: JSON.stringify({ estado }) },
      );
    } catch (error) {
      const resultado = fallo<ActualizacionEstadoIncidencia>(error);
      if (
        resultado.status !== 409 &&
        resultado.status !== undefined &&
        resultado.status < 500
      )
        return resultado;

      const estadoActual = await leerEstadoIncidencia(id);
      if (estadoActual) revalidatePath("/admin/incidencias");
      return {
        ...resultado,
        estadoActual,
        estadoVerificado: estadoActual !== undefined,
      };
    }

    if (
      datos.id !== id ||
      datos.estado !== estado ||
      !Number.isFinite(Date.parse(datos.actualizadaAt))
    ) {
      const estadoActual = await leerEstadoIncidencia(id);
      if (estadoActual) revalidatePath("/admin/incidencias");
      return {
        error: "La respuesta del servidor no confirmó el cambio de estado.",
        status: 502,
        estadoActual,
        estadoVerificado: estadoActual !== undefined,
      };
    }

    revalidatePath("/admin/incidencias");
    return { datos, estadoActual: estado, estadoVerificado: true };
  } catch (error) {
    return fallo(error);
  }
}

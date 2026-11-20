import "server-only";
import { ApiError, api, usuarioActual } from "@/lib/api";
import {
  esUuid,
  type IncidenciaDetalle,
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

export async function cargarResponsablesAdmin(): Promise<
  Resultado<ResponsableIncidencia[]>
> {
  try {
    if (!(await esAdministrador()))
      return { error: "No tienes permiso para ver esta página.", status: 403 };

    const paginaTamano = 50;
    const primera = await api<{
      datos: ResponsableIncidencia[];
      total: number;
    }>("incidencias/responsables?pagina=1&tamanoPagina=" + paginaTamano);
    const datos = [...primera.datos];
    const paginas = Math.ceil(primera.total / paginaTamano);
    for (let pagina = 2; pagina <= paginas; pagina += 1) {
      const siguiente = await api<{ datos: ResponsableIncidencia[] }>(
        "incidencias/responsables?pagina=" +
          pagina +
          "&tamanoPagina=" +
          paginaTamano,
      );
      datos.push(...siguiente.datos);
    }
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

export async function cargarDetalleIncidenciaAdmin(
  id: string,
): Promise<Resultado<IncidenciaDetalle>> {
  try {
    if (!(await esAdministrador()))
      return { error: "No tienes permiso para ver esta página.", status: 403 };
    if (!esUuid(id))
      return { error: "La incidencia solicitada no es válida.", status: 400 };
    return { datos: await api<IncidenciaDetalle>("incidencias/" + id) };
  } catch (error) {
    return fallo(error);
  }
}

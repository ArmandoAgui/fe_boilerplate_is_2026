"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type {
  Autorizacion,
  AutorizacionBuscada,
  Presente,
} from "@/lib/visitas";

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

// ===== H14 =====

export type Busqueda = { datos?: AutorizacionBuscada[]; error?: string };

export async function buscarAutorizaciones(buscar: string): Promise<Busqueda> {
  try {
    const { datos } = await api<{ datos: AutorizacionBuscada[] }>(
      `visitas/autorizaciones?buscar=${encodeURIComponent(buscar)}`,
    );
    return { datos };
  } catch (error) {
    return fallo(error);
  }
}

/**
 * Un solo endpoint cubre los dos caminos: con `autorizacionId` para una visita
 * preautorizada y con los tres datos manuales para una sin autorización. Se
 * manda solo lo que corresponde, porque el backend rechaza campos de más.
 */
export async function registrarEntrada(
  data:
    | { autorizacionId: string }
    | {
        visitanteNombre: string;
        visitanteDocumento: string;
        unidadId: string;
      },
): Promise<Resultado & { nombre?: string }> {
  let movimiento: { visitanteNombre: string };
  try {
    movimiento = await api<{ visitanteNombre: string }>("visitas/entradas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/seguridad/accesos");
  return { ok: true, nombre: movimiento.visitanteNombre };
}

export async function registrarSalida(id: string): Promise<Resultado> {
  try {
    await api(`visitas/entradas/${encodeURIComponent(id)}/salida`, {
      method: "POST",
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/seguridad/accesos");
  return { ok: true };
}

// ===== H15 =====

export type ListaPresentes = {
  datos?: Presente[];
  total?: number;
  error?: string;
};

export async function listarPresentes(
  buscar?: string,
  unidadId?: string,
): Promise<ListaPresentes> {
  // Los filtros vacíos no se mandan: el DTO exige al menos un carácter en
  // `buscar` y un uuid en `unidadId`, así que enviarlos vacíos daría 400.
  const params = new URLSearchParams();
  if (buscar) params.set("buscar", buscar);
  if (unidadId) params.set("unidadId", unidadId);
  const query = params.toString();
  try {
    const lista = await api<{ datos: Presente[]; total: number }>(
      `visitas/presentes${query ? `?${query}` : ""}`,
    );
    return { datos: lista.datos, total: lista.total };
  } catch (error) {
    return fallo(error);
  }
}

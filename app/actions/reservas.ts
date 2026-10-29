"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Horario, Reserva } from "@/lib/reservas";
export type Resultado = { error?: string; status?: number; ok?: boolean };
function fallo(error: unknown): Resultado {
  // Las redirecciones de Next deben propagarse, incluida la de sesión vencida.
  if (error instanceof ApiError)
    return { error: error.message, status: error.status };
  if (error instanceof Error && "digest" in error) throw error;
  return { error: "No se pudo completar la operación. Intente de nuevo." };
}
export async function crearReserva(data: {
  areaId: string;
  unidadId: string;
  inicio: string;
  duracionHoras: number;
  asistentes: number;
}): Promise<Resultado> {
  let reserva: Reserva;
  try {
    reserva = await api<Reserva>("reservas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/areas", "layout");
  revalidatePath("/reservas");
  redirect(`/reservas?confirmada=${encodeURIComponent(reserva.codigo)}`);
}
export async function cancelarReserva(id: string): Promise<Resultado> {
  try {
    await api(`reservas/${encodeURIComponent(id)}/cancelacion`, {
      method: "PATCH",
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/reservas");
  revalidatePath("/areas", "layout");
  return { ok: true };
}
export async function guardarArea(
  id: string | undefined,
  data: {
    nombre: string;
    capacidad: number;
    activa: boolean;
    horarios: Horario[];
  },
): Promise<Resultado> {
  try {
    await api(id ? `areas/${encodeURIComponent(id)}` : "areas", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/admin/areas");
  revalidatePath("/areas", "layout");
  return { ok: true };
}

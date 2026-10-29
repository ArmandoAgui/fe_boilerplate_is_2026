import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { Usuario } from "@/lib/reservas";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const token = await getSession();
  if (!token) redirect("/login");
  const base = process.env.API_URL;
  if (!base) throw new Error("Falta API_URL");
  const response = await fetch(new URL(ruta, base.replace(/\/?$/, "/")), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401) redirect("/login?expired=1");
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      Array.isArray(data.message)
        ? data.message.join("; ")
        : (data.message ??
            "No se pudo completar la operación. Intente de nuevo."),
    );
  return data as T;
}
export async function usuarioActual() {
  return api<Usuario>("auth/me");
}

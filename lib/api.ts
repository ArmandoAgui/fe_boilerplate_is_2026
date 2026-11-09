import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { Usuario } from "@/lib/reservas";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public campo?: string,
  ) {
    super(message);
  }
}
export async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const token = await getSession();
  if (!token) redirect("/login");
  const base = process.env.API_URL;
  if (!base) throw new Error("Falta API_URL");
  const headers = new Headers(init?.headers);
  if (init?.body instanceof FormData) headers.delete("Content-Type");
  else if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(new URL(ruta, base.replace(/\/?$/, "/")), {
    ...init,
    headers,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 401) redirect("/login?expired=1");
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      Array.isArray(data?.message)
        ? data.message.join("; ")
        : typeof data?.message === "string"
          ? data.message
          : "No se pudo completar la operación. Intente de nuevo.",
      typeof data?.campo === "string" ? data.campo : undefined,
    );
  }
  return (await response.json()) as T;
}
export async function usuarioActual() {
  return api<Usuario>("auth/me");
}

import { ApiError, api } from "@/lib/api";
import {
  MODULOS_AVISO,
  type ListaAvisos,
} from "@/lib/notificaciones";
import type { Usuario } from "@/lib/reservas";

const ESTADOS = ["NO_LEIDA", "LEIDA"] as const;
const CLAVES_PERMITIDAS = new Set([
  "moduloOrigen",
  "estado",
  "pagina",
  "tamanoPagina",
]);

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function errorJson(status: number, message: string) {
  return json({ message }, status);
}

async function comprobarResidente() {
  try {
    const usuario = await api<Usuario>("auth/me", undefined, {
      onUnauthorized: "throw",
    });
    return usuario.rol === "RESIDENTE"
      ? null
      : errorJson(403, "No tienes permiso para consultar avisos.");
  } catch (error) {
    if (error instanceof ApiError)
      return errorJson(401, "La sesión expiró. Inicia sesión de nuevo.");
    return errorJson(502, "No se pudo conectar con el servicio de avisos.");
  }
}

function consultaInvalida(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  for (const clave of params.keys()) {
    if (!CLAVES_PERMITIDAS.has(clave) || params.getAll(clave).length !== 1)
      return null;
  }

  const moduloOrigen = params.get("moduloOrigen");
  if (
    params.has("moduloOrigen") &&
    !MODULOS_AVISO.includes(moduloOrigen as (typeof MODULOS_AVISO)[number])
  )
    return null;
  const estado = params.get("estado");
  if (params.has("estado") && !ESTADOS.includes(estado as (typeof ESTADOS)[number]))
    return null;

  const paginaRaw = params.get("pagina") ?? "1";
  const tamanoRaw = params.get("tamanoPagina") ?? "20";
  if (!/^\d+$/.test(paginaRaw) || !/^\d+$/.test(tamanoRaw)) return null;
  const pagina = Number(paginaRaw);
  const tamanoPagina = Number(tamanoRaw);
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    !Number.isSafeInteger(tamanoPagina) ||
    tamanoPagina < 1 ||
    tamanoPagina > 50 ||
    !Number.isSafeInteger((pagina - 1) * tamanoPagina)
  )
    return null;

  return { moduloOrigen, estado, pagina, tamanoPagina };
}

export async function GET(request: Request) {
  const consulta = consultaInvalida(request);
  if (!consulta) {
    const acceso = await comprobarResidente();
    if (acceso) return acceso;
    return errorJson(400, "La consulta de avisos no es válida.");
  }

  const params = new URLSearchParams({
    pagina: String(consulta.pagina),
    tamanoPagina: String(consulta.tamanoPagina),
  });
  if (consulta.moduloOrigen) params.set("moduloOrigen", consulta.moduloOrigen);
  if (consulta.estado) params.set("estado", consulta.estado);

  try {
    const resultado = await api<ListaAvisos>(
      `notificaciones/mias?${params.toString()}`,
      undefined,
      { onUnauthorized: "throw" },
    );
    return json(resultado);
  } catch (error) {
    if (error instanceof ApiError)
      return errorJson(
        error.status,
        error.status === 401
          ? "La sesión expiró. Inicia sesión de nuevo."
          : error.status === 403
            ? "No tienes permiso para consultar avisos."
            : "No se pudieron consultar los avisos.",
      );
    return errorJson(502, "No se pudo conectar con el servicio de avisos.");
  }
}

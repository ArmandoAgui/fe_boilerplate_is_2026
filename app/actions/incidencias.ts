"use server";

import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  esCategoriaIncidencia,
  errorDescripcion,
  errorFoto,
  MAX_FOTOS,
  MENSAJE_ENVIO,
  MENSAJE_MAX_FOTOS,
  type IncidenciaCreada,
  type ResultadoIncidencia,
} from "@/lib/incidencias";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const CAMPOS = [
  "lugarTipo",
  "unidadId",
  "areaId",
  "categoria",
  "descripcion",
  "fotos",
];

export async function crearIncidencia(
  datos: FormData,
): Promise<ResultadoIncidencia> {
  if (!(datos instanceof FormData))
    return {
      status: 400,
      error: "El formulario de la incidencia no es válido.",
    };

  const lugarTipo = datos.get("lugarTipo");
  if (lugarTipo !== "UNIDAD" && lugarTipo !== "AREA_COMUN")
    return {
      status: 400,
      campo: "lugarTipo",
      error: "Elige el tipo de lugar.",
    };

  const campoLugar = lugarTipo === "UNIDAD" ? "unidadId" : "areaId";
  const otroCampo = lugarTipo === "UNIDAD" ? "areaId" : "unidadId";
  const lugarId = datos.get(campoLugar);
  if (
    typeof lugarId !== "string" ||
    !UUID.test(lugarId) ||
    datos.has(otroCampo)
  )
    return {
      status: 400,
      campo: campoLugar,
      error: "Elige una ubicación válida.",
    };

  const categoria = datos.get("categoria");
  if (!esCategoriaIncidencia(categoria))
    return {
      status: 400,
      campo: "categoria",
      error: "Elige una categoría válida.",
    };

  const descripcion = datos.get("descripcion");
  const texto = typeof descripcion === "string" ? descripcion.trim() : "";
  const mensajeDescripcion = errorDescripcion(texto);
  if (mensajeDescripcion)
    return { status: 400, campo: "descripcion", error: mensajeDescripcion };

  const fotos = datos.getAll("fotos");
  if (fotos.length > MAX_FOTOS)
    return { status: 400, campo: "fotos", error: MENSAJE_MAX_FOTOS };

  const cuerpo = new FormData();
  cuerpo.set("lugarTipo", lugarTipo);
  cuerpo.set(campoLugar, lugarId);
  cuerpo.set("categoria", categoria);
  cuerpo.set("descripcion", texto);
  for (const foto of fotos) {
    if (typeof foto === "string")
      return {
        status: 400,
        campo: "fotos",
        error: "Selecciona un archivo JPG o PNG.",
      };
    const mensaje = errorFoto(foto);
    if (mensaje) return { status: 400, campo: "fotos", error: mensaje };
    cuerpo.append("fotos", foto);
  }

  try {
    if ((await usuarioActual()).rol !== "RESIDENTE")
      return {
        status: 403,
        error: "Solo un residente puede reportar incidencias.",
      };

    const { codigo, estado } = await api<IncidenciaCreada>("incidencias", {
      method: "POST",
      body: cuerpo,
      signal: fotos.length ? AbortSignal.timeout(45_000) : undefined,
    });
    return { codigo, estado };
  } catch (error) {
    if (error instanceof ApiError)
      return {
        status: error.status,
        error: error.status >= 500 ? MENSAJE_ENVIO : error.message,
        campo:
          error.campo && CAMPOS.includes(error.campo) ? error.campo : undefined,
      };
    if (error instanceof Error && "digest" in error) throw error;
    return { error: MENSAJE_ENVIO };
  }
}

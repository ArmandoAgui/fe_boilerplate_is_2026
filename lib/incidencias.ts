export const CATEGORIAS_INCIDENCIA = {
  FUGA: "Fuga",
  ELECTRICIDAD: "Electricidad",
  ASCENSOR: "Ascensor",
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  OTRO: "Otro",
} as const;

export type LugarIncidencia = "UNIDAD" | "AREA_COMUN";
export type CategoriaIncidencia = keyof typeof CATEGORIAS_INCIDENCIA;
export type IncidenciaCreada = { codigo: string; estado: "ABIERTA" };
export type ErrorIncidencia = {
  error: string;
  status?: number;
  campo?: string;
};
export type ResultadoIncidencia = IncidenciaCreada | ErrorIncidencia;

export const MAX_DESCRIPCION = 500;
export const MAX_FOTOS = 3;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
export const MENSAJE_MAX_FOTOS = "Se permite un máximo de 3 fotos.";
export const MENSAJE_ENVIO = "No se pudo enviar el reporte. Intenta de nuevo.";

export function esCategoriaIncidencia(
  valor: FormDataEntryValue | null,
): valor is CategoriaIncidencia {
  return (
    typeof valor === "string" && Object.hasOwn(CATEGORIAS_INCIDENCIA, valor)
  );
}

export function longitudDescripcion(valor: string) {
  return Array.from(valor.trim()).length;
}

export function errorDescripcion(valor: string) {
  const longitud = longitudDescripcion(valor);
  return longitud < 10 || longitud > MAX_DESCRIPCION
    ? "La descripción debe tener entre 10 y 500 caracteres"
    : "";
}

export function errorFoto(archivo: File) {
  if (
    (archivo.type !== "image/jpeg" && archivo.type !== "image/png") ||
    archivo.size > MAX_BYTES_FOTO
  )
    return "Solo se permiten JPG o PNG de hasta 5 MB";
  return archivo.size === 0 ? "El archivo está vacío." : "";
}

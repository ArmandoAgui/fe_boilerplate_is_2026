export type Alcance = "TODOS" | "TORRE" | "SECCION";
export const etiquetasAlcance: Record<Alcance, string> = {
  TODOS: "Todos",
  TORRE: "Torre",
  SECCION: "Sección",
};
export type Torre = {
  id: string;
  nombre: string;
  secciones: { id: string; nombre: string }[];
};
export type PublicacionComunicado = {
  titulo: string;
  contenido: string;
  alcance: Alcance;
  destinoId?: string;
};
export type ComunicadoAdmin = {
  id: string;
  titulo: string;
  alcance: Alcance;
  destino: string | null;
  creadoAt: string;
  leidoPor: number;
  destinatarios: number;
};
export type ListaComunicadosAdmin = {
  datos: ComunicadoAdmin[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};
export function erroresComunicado(data: PublicacionComunicado) {
  return {
    titulo:
      data.titulo.trim().length < 5 || data.titulo.trim().length > 100
        ? "El título debe tener entre 5 y 100 caracteres"
        : "",
    contenido:
      !data.contenido.trim() || data.contenido.trim().length > 2000
        ? "El contenido debe tener entre 1 y 2000 caracteres"
        : "",
    destino:
      data.alcance !== "TODOS" && !data.destinoId
        ? "Seleccione un destino"
        : "",
  };
}
export function fechaComunicado(iso: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export type EstadoTema =
  | "PUBLICADA"
  | "ABIERTO"
  | "CERRADO";

export type OpcionAsamblea = {
  id: string;
  texto: string;
};

export type TemaAsamblea = {
  id: string;
  titulo: string;
  apertura: string;
  cierre: string;
  estado: EstadoTema;
  opciones: OpcionAsamblea[];
};

export type Asamblea = {
  id: string;
  titulo: string;
  fechaHora: string;
  descripcion: string | null;
  estado: "BORRADOR" | "PUBLICADA";
  temas: {
    id: string;
    titulo: string;
    apertura: string;
    cierre: string;
    estadoTema: EstadoTema;
  }[];
};

export type ListaAsambleas = {
  datos: Asamblea[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export function fechaAsamblea(fecha: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));
}

import type { EstadoTema } from "@/lib/asambleas";

export type TemaVotacion = {
  id: string;
  titulo: string;
  estado:
    | EstadoTema
    | "PROGRAMADO"
    | "ABIERTO"
    | "CERRADO";
  apertura?: string;
  cierre?: string;
  opciones?: {
    id: string;
    texto: string;
  }[];
};

export type ResultadoVotacion = {
  temaId: string;
  titulo: string;

  opciones: {
    opcionId: string;
    texto: string;
    votos: number;
    porcentaje: number;
  }[];

  totalVotos: number;
  unidadesHabilitadas: number;
  participacion: number;

  unidadesVotantes: {
    unidadId: string;
    codigo: string;
    fecha: string;
  }[];
};

export type EstadoParticipacion = {
  temaId: string;
  unidadId: string;
  yaVoto: boolean;
  fecha: string | null;
};

export type UnidadVotante = {
  id: string;
  codigo: string;
};

export function fechaParticipacion(iso: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

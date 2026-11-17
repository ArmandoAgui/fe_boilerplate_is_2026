import {
  CATEGORIAS_INCIDENCIA,
  type CategoriaIncidencia,
} from "@/lib/incidencias";
import {
  ESTADOS_INCIDENCIA,
  etiquetaEstado,
  esUuid,
  type EstadoIncidencia,
} from "@/lib/incidencias-admin";

export const TAMANO_PAGINA_INCIDENCIAS = 20;

export type IncidenciaMia = {
  id: string;
  codigo: string;
  categoria: string;
  creadaAt: string;
  estado: EstadoIncidencia;
};

export type ListaIncidenciasMias = {
  datos: IncidenciaMia[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export type EventoSeguimiento = {
  campo: "ESTADO" | "PRIORIDAD" | "RESPONSABLE";
  valorAnterior: string | null;
  valorNuevo: string | null;
  actor: string | { id?: string; nombre?: string } | null;
  fecha: string;
};

export type IncidenciaSeguimiento = {
  id: string;
  codigo: string;
  categoria: string;
  descripcion: string;
  lugar: string;
  estado: EstadoIncidencia;
  prioridad: string | null;
  responsable: { id: string; nombre: string } | null;
  evidencias: { id: string; url: string }[];
  historial: EventoSeguimiento[];
};

export function esEstadoSeguimiento(value?: string): value is EstadoIncidencia {
  return ESTADOS_INCIDENCIA.includes(value as EstadoIncidencia);
}

export function normalizarPagina(value?: string) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) &&
    page > 0 &&
    Number.isSafeInteger((page - 1) * TAMANO_PAGINA_INCIDENCIAS)
    ? page
    : 1;
}

export function crearQueryIncidenciasMias(
  pagina: number,
  estado?: EstadoIncidencia,
) {
  const params = new URLSearchParams({
    pagina: String(pagina),
    tamanoPagina: String(TAMANO_PAGINA_INCIDENCIAS),
  });
  if (estado) params.set("estado", estado);
  return params;
}

export function crearQueryRetornoIncidencias(
  estado?: EstadoIncidencia,
  pagina = 1,
) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (pagina > 1) params.set("pagina", String(pagina));
  return params;
}

export function categoriaIncidencia(value: string) {
  return Object.hasOwn(CATEGORIAS_INCIDENCIA, value)
    ? CATEGORIAS_INCIDENCIA[value as CategoriaIncidencia]
    : value.replaceAll("_", " ").toLocaleLowerCase("es-SV");
}

export function etiquetaEstadoSeguimiento(value: string | null) {
  return esEstadoSeguimiento(value ?? "") ? etiquetaEstado[value as EstadoIncidencia] : "Estado actualizado";
}

export function nombreActor(
  actor: EventoSeguimiento["actor"],
) {
  if (typeof actor === "string") return actor.trim() || null;
  if (actor && typeof actor.nombre === "string") return actor.nombre.trim() || null;
  return null;
}

export function fechaHoraSeguimiento(value: string) {
  const fecha = new Date(value);
  if (!Number.isFinite(fecha.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

export function idValidoIncidencia(value: string) {
  return esUuid(value);
}

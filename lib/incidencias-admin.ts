export const ESTADOS_INCIDENCIA = [
  "ABIERTA",
  "ASIGNADA",
  "EN_PROCESO",
  "RESUELTA",
] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export const PRIORIDADES_INCIDENCIA = [
  "BAJA",
  "MEDIA",
  "ALTA",
  "URGENTE",
] as const;
export type PrioridadIncidencia = (typeof PRIORIDADES_INCIDENCIA)[number];

export type ResponsableIncidencia = { id: string; nombre: string };
export type IncidenciaResumen = {
  id: string;
  codigo: string;
  lugar: string;
  categoria: string;
  creadaAt: string;
  prioridad: PrioridadIncidencia | null;
  responsable: ResponsableIncidencia | null;
  estado: EstadoIncidencia;
};
export type ListaIncidencias = {
  datos: IncidenciaResumen[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};
export type IncidenciaDetalle = {
  descripcion?: string;
  autor?: string | { nombre?: string };
  residente?: string | { nombre?: string };
  creadoPor?: string | { nombre?: string };
  historial?: {
    estado?: string;
    fecha?: string;
    creadaAt?: string;
    detalle?: string;
    responsable?: string | { nombre?: string };
  }[];
};
export type ActualizacionAsignacion = {
  prioridad?: PrioridadIncidencia;
  responsableId?: string;
};
export type Resultado<T> = {
  datos?: T;
  error?: string;
  status?: number;
  campo?: string;
};

export const etiquetaEstado: Record<EstadoIncidencia, string> = {
  ABIERTA: "Abierta",
  ASIGNADA: "Asignada",
  EN_PROCESO: "En proceso",
  RESUELTA: "Resuelta",
};

export const etiquetaPrioridad: Record<PrioridadIncidencia, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(valor: string) {
  return UUID.test(valor);
}

export function fechaIncidencia(valor: string) {
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "short",
  }).format(fecha);
}

export function coincideConFiltros(
  incidencia: Pick<IncidenciaResumen, "estado" | "prioridad">,
  estado?: EstadoIncidencia,
  prioridad?: PrioridadIncidencia,
) {
  return (
    (!estado || incidencia.estado === estado) &&
    (!prioridad || incidencia.prioridad === prioridad)
  );
}

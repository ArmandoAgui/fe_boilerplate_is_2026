export const ESTADOS_INCIDENCIA = [
  "ABIERTA",
  "ASIGNADA",
  "EN_PROCESO",
  "RESUELTA",
] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];
export const ESTADOS_DESTINO_H11 = ["EN_PROCESO", "RESUELTA"] as const;
export type EstadoDestinoIncidencia = (typeof ESTADOS_DESTINO_H11)[number];

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
  id: string;
  codigo: string;
  categoria: string;
  descripcion: string;
  lugar: string;
  estado: EstadoIncidencia;
  prioridad: PrioridadIncidencia | null;
  responsable: ResponsableIncidencia | null;
  evidencias: { id: string; url: string }[];
  historial: HistorialIncidencia[];
};
export type HistorialIncidencia = {
  campo: "ESTADO" | "PRIORIDAD" | "RESPONSABLE";
  valorAnterior: string | null;
  valorNuevo: string;
  actor: string;
  fecha: string;
};
export type ActualizacionEstadoIncidencia = {
  id: string;
  estado: EstadoDestinoIncidencia;
  actualizadaAt: string;
};
export type AccionEstadoIncidencia = {
  estado: EstadoDestinoIncidencia;
  etiqueta: string;
  confirmacion: (codigo: string) => string;
  exito: string;
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

export function accionEstadoIncidencia(
  estado: EstadoIncidencia,
): AccionEstadoIncidencia | undefined {
  if (estado === "ASIGNADA")
    return {
      estado: "EN_PROCESO",
      etiqueta: "Iniciar atención",
      confirmacion: (codigo) =>
        `¿Iniciar la atención de la incidencia ${codigo}? Pasará a En proceso.`,
      exito: "Atención iniciada",
    };
  if (estado === "EN_PROCESO")
    return {
      estado: "RESUELTA",
      etiqueta: "Marcar como resuelta",
      confirmacion: (codigo) =>
        `¿Marcar la incidencia ${codigo} como Resuelta? El residente recibirá un aviso.`,
      exito: "Incidencia resuelta",
    };
  return undefined;
}

export function coincideConEstadoDestino(
  valor: unknown,
): valor is EstadoDestinoIncidencia {
  return ESTADOS_DESTINO_H11.includes(valor as EstadoDestinoIncidencia);
}

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

export const MODULOS_AVISO = [
  "CUOTAS",
  "PAQUETERIA",
  "COMUNICADOS",
  "ASAMBLEAS",
  "INCIDENCIAS",
] as const;

export type ModuloAviso = (typeof MODULOS_AVISO)[number];
export type EstadoAviso = "NO_LEIDA" | "LEIDA";

export type Aviso = {
  id: string;
  moduloOrigen: ModuloAviso;
  tipoEvento: string;
  titulo: string;
  mensaje: string;
  referenciaId: string | null;
  estado: EstadoAviso;
  creadaAt: string;
};

export type ListaAvisos = {
  datos: Aviso[];
  noLeidas: number;
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export type FiltrosAvisos = {
  moduloOrigen: ModuloAviso | "";
  estado: EstadoAviso | "";
  pagina: number;
};

export const ETIQUETA_MODULO: Record<ModuloAviso, string> = {
  CUOTAS: "Cuotas",
  PAQUETERIA: "Paquetería",
  COMUNICADOS: "Comunicados",
  ASAMBLEAS: "Asambleas",
  INCIDENCIAS: "Incidencias",
};

export const PRESENTACION_MODULO: Record<
  ModuloAviso,
  { abreviatura: string; clase: string }
> = {
  CUOTAS: { abreviatura: "$", clase: "aviso-icono-cuotas" },
  PAQUETERIA: { abreviatura: "Paq", clase: "aviso-icono-paquetes" },
  COMUNICADOS: { abreviatura: "Com", clase: "aviso-icono-comunicados" },
  ASAMBLEAS: { abreviatura: "Vot", clase: "aviso-icono-asambleas" },
  INCIDENCIAS: { abreviatura: "Inc", clase: "aviso-icono-incidencias" },
};

export const UUID_AVISO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esModuloAviso(value: string): value is ModuloAviso {
  return MODULOS_AVISO.includes(value as ModuloAviso);
}

export function esEstadoAviso(value: string): value is EstadoAviso {
  return value === "NO_LEIDA" || value === "LEIDA";
}

export function crearQueryAvisos(filtros: FiltrosAvisos) {
  const params = new URLSearchParams();
  if (filtros.moduloOrigen) params.set("moduloOrigen", filtros.moduloOrigen);
  if (filtros.estado) params.set("estado", filtros.estado);
  params.set("pagina", String(filtros.pagina));
  params.set("tamanoPagina", "20");
  return params;
}

export function crearUrlAvisos(filtros: FiltrosAvisos) {
  const params = new URLSearchParams();
  if (filtros.moduloOrigen) params.set("moduloOrigen", filtros.moduloOrigen);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.pagina > 1) params.set("pagina", String(filtros.pagina));
  return params;
}

export function rutaDestinoAviso(aviso: Aviso) {
  switch (aviso.tipoEvento) {
    case "CUOTA_POR_VENCER":
      return { href: "/cuotas", etiqueta: "Ver estado de cuenta" };
    case "PAQUETE_RECIBIDO":
      return { href: "/paquetes", etiqueta: "Ver paquete" };
    case "VOTACION_ABIERTA":
      return { href: "/asambleas", etiqueta: "Ver asamblea" };
    default:
      // H12 y H24 incorporarán los detalles privados de incidencia y comunicado.
      return null;
  }
}

function partesFecha(iso: string) {
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return {
    fecha,
    dia: `${valor("year")}-${valor("month")}-${valor("day")}`,
  };
}

function horaLocal(fecha: Date) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

export function formatearFechaAviso(iso: string, ahora = new Date()) {
  const partes = partesFecha(iso);
  if (!partes) return "Fecha no disponible";
  const diferencia = ahora.getTime() - partes.fecha.getTime();
  if (diferencia >= 0 && diferencia < 60 * 60 * 1000) {
    const minutos = Math.floor(diferencia / 60_000);
    return minutos < 1 ? "Hace menos de 1 min" : `Hace ${minutos} min`;
  }

  const hoy = partesFecha(ahora.toISOString())?.dia;
  if (partes.dia === hoy) return `Hoy ${horaLocal(partes.fecha)}`;
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  if (partes.dia === partesFecha(ayer.toISOString())?.dia)
    return `Ayer ${horaLocal(partes.fecha)}`;
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(partes.fecha);
}

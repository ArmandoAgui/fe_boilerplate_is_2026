export type EstadoVisita = "VIGENTE" | "USADA" | "CANCELADA" | "VENCIDA";

export type Autorizacion = {
  id: string;
  visitanteNombre: string;
  unidadCodigo: string;
  inicio: string;
  fin: string;
  estado: EstadoVisita;
};

export type ListaAutorizaciones = {
  datos: Autorizacion[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export const HORA = 3_600_000;
export const VIGENCIA_MAXIMA_MS = 24 * HORA;
export const ANTICIPACION_MAXIMA_MS = 30 * 24 * HORA;

export const etiquetaEstado: Record<EstadoVisita, string> = {
  VIGENTE: "Vigente",
  USADA: "Usada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
};

/**
 * El condominio vive en UTC−6 sin horario de verano (supuesto de KAN-10), y el
 * control datetime-local no envía zona. Se interpreta siempre como hora del
 * condominio y se le agrega el offset, que es lo que exige el DTO del backend.
 */
export function aISO(valor: string) {
  return `${valor.slice(0, 16)}:00-06:00`;
}

/** Inversa de aISO: milisegundos a lo que el input espera ver. */
export function paraInput(ms: number) {
  return new Date(ms - 6 * HORA).toISOString().slice(0, 16);
}

/**
 * Mismos límites y mismos textos que las reglas del servidor. Acá sirven para
 * no dejar enviar el formulario; la validación que manda sigue siendo la del
 * backend, porque deshabilitar un botón no impide una petición.
 */
export function errorVigencia(
  inicio: string,
  fin: string,
  ahora = Date.now(),
): string {
  if (!inicio || !fin) return "";
  const desde = new Date(aISO(inicio)).getTime();
  const hasta = new Date(aISO(fin)).getTime();
  if (!Number.isFinite(desde) || !Number.isFinite(hasta))
    return "Las fechas de vigencia son inválidas";
  if (desde < ahora) return "El inicio no puede ser anterior a ahora";
  if (desde > ahora + ANTICIPACION_MAXIMA_MS)
    return "El inicio no puede superar los 30 días a futuro";
  if (hasta <= desde) return "El fin debe ser posterior al inicio";
  if (hasta - desde > VIGENCIA_MAXIMA_MS)
    return "La vigencia máxima es de 24 horas";
  return "";
}

export function errorNombre(valor: string) {
  const v = valor.trim();
  if (v.length < 3 || v.length > 100)
    return "El nombre debe tener entre 3 y 100 caracteres";
  return "";
}

export function errorDocumento(valor: string) {
  if (!/^[A-Za-z0-9]{5,20}$/.test(valor))
    return "El documento debe tener de 5 a 20 caracteres alfanuméricos";
  return "";
}

/** Formato del mockup: 07/11/2026 15:00, en hora del condominio. */
export function fechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "");
}

/**
 * El mockup distingue los cuatro estados por color. La paleta del proyecto
 * solo tiene verde, gris y rojo, así que el azul de Usada y el ámbar de
 * Vencida van literales: son puntos pequeños y estos tonos medios se leen
 * igual sobre el fondo claro y el oscuro. Candidatos a tokens en globals.css
 * cuando otro módulo necesite los mismos estados.
 */
export const colorEstado: Record<EstadoVisita, string> = {
  VIGENTE: "#16a34a",
  USADA: "#2563eb",
  VENCIDA: "#d97706",
  CANCELADA: "#6b7280",
};

// Tipos y reglas del Módulo 10 (Reportes) del lado del cliente.
// La validación que manda es la del backend; estas copias solo evitan
// consultar un rango que de antemano sabemos inválido.

export type EstadoIndicador = "DATOS" | "SIN_DATOS";

export type ResumenIndicadores = {
  desde: string; // AAAA-MM-DD
  hasta: string; // AAAA-MM-DD
  generadoAt: string; // ISO
  morosidad: {
    estado: EstadoIndicador;
    unidadesMorosas: number;
    unidadesActivas: number;
    porcentaje: number | null;
    saldoVencido: string | null;
  };
  usoAreas: {
    estado: EstadoIndicador;
    horasReservadas: number;
    horasHabilitadas: number;
    porcentaje: number | null;
  };
  incidenciasAbiertas: {
    estado: EstadoIndicador;
    abiertas: number;
    creadas: number;
  };
  participacion: {
    estado: EstadoIndicador;
    temasCerrados: number;
    porcentajePromedio: number | null;
  };
};

export const MAX_DIAS_RANGO = 366;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
// El condominio usa UTC−6 todo el año, igual que el backend.
const DESFASE_SV_MS = 6 * 60 * 60 * 1000;

/** Fecha de hoy (AAAA-MM-DD) en El Salvador. */
export function hoyLocal(ahora = Date.now()): string {
  return new Date(ahora - DESFASE_SV_MS).toISOString().slice(0, 10);
}

/** Rango por defecto del panel: primer día del mes actual hasta hoy. */
export function rangoPorDefecto(ahora = Date.now()): {
  desde: string;
  hasta: string;
} {
  const hoy = hoyLocal(ahora);
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaReal(fecha: string): boolean {
  if (!FECHA.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Días del rango contando Desde y Hasta. */
export function diasDelRango(desde: string, hasta: string): number {
  const ms =
    Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / MS_POR_DIA) + 1;
}

/** Mismas reglas y textos que el backend; "" si el rango es válido. */
export function errorRango(desde: string, hasta: string): string {
  if (!desde || !hasta) return "Seleccione las fechas Desde y Hasta";
  if (!esFechaReal(desde) || !esFechaReal(hasta))
    return "La fecha no existe en el calendario";
  if (desde > hasta) return "Desde no puede ser posterior a Hasta";
  if (diasDelRango(desde, hasta) > MAX_DIAS_RANGO)
    return "El rango no puede superar 366 días";
  return "";
}

/** URL del panel con el rango elegido. */
export function urlReportes(desde: string, hasta: string): string {
  return `/admin/reportes?${new URLSearchParams({ desde, hasta }).toString()}`;
}

/** "2026-11-01" → "01/11/2026", sin pasar por Date para no correr el día. */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Hasta 1 decimal sin ceros de relleno: 75 → "75", 33.3 → "33.3", 0 → "0". */
export function numero(valor: number): string {
  return String(Math.round(valor * 10) / 10);
}

/** Montos del backend ("1400.50") → "$1,400.50". */
export function dinero(monto: string): string {
  const [entero, decimales = "00"] = monto.split(".");
  const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${conComas}.${decimales.padEnd(2, "0").slice(0, 2)}`;
}

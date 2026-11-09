// Tipos y reglas del Módulo 1 (Cuotas y pagos) del lado del cliente.
// La validación que manda es la del backend; estas copias solo evitan enviar
// datos que de antemano sabemos que serían rechazados.

export type MotivoOmision = "YA_EXISTE" | "MONTO_INVALIDO";

export type PreviaGeneracion = {
  periodo: string;
  unidadesAGenerar: number;
  unidadesOmitidas: number;
  totalUsd: string;
};

export type ResultadoGeneracion = {
  periodo: string;
  creadas: number;
  omitidas: { unidadId: string; codigo: string; motivo: MotivoOmision }[];
};

export const motivoOmision: Record<MotivoOmision, string> = {
  YA_EXISTE: "Ya tiene cuota en este período",
  MONTO_INVALIDO: "Cuota mensual menor o igual a $0.00",
};

export const CONCEPTO_MANTENIMIENTO = "Cuota de mantenimiento";

// El condominio usa UTC−6 todo el año, igual que el backend.
const DESFASE_SV_MS = 6 * 60 * 60 * 1000;

/** Mes calendario (AAAA-MM) según la hora de El Salvador. */
export function mesLocal(ahora = Date.now()): string {
  return new Date(ahora - DESFASE_SV_MS).toISOString().slice(0, 7);
}

/** Mes siguiente a un período AAAA-MM (diciembre pasa a enero). */
export function mesSiguiente(periodo: string): string {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  return new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 7);
}

/** H3: solo el mes actual o el siguiente, con el texto de la card. */
export function errorPeriodo(periodo: string, mesActual: string): string {
  if (periodo === mesActual || periodo === mesSiguiente(mesActual)) return "";
  return "Seleccione el mes actual o el siguiente";
}

/** Montos: el backend los manda como texto con 2 decimales ("400.00"). */
export function dinero(monto: string): string {
  const [entero, decimales = "00"] = monto.split(".");
  const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${conComas}.${decimales.padEnd(2, "0").slice(0, 2)}`;
}

// ---------- H1: estado de cuenta ----------

export type EstadoCuota = "PENDIENTE" | "VENCIDA" | "PAGADA";

export type Cuota = {
  id: string;
  concepto: string;
  periodo: string;
  monto: string;
  fechaVencimiento: string; // AAAA-MM-DD
  estado: EstadoCuota;
};

export type DetalleCuota = Cuota & {
  unidadId: string;
  fechaPago: string | null;
};

export type ListaCuotas = {
  datos: Cuota[];
  totalPendiente: string;
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export const ESTADOS_CUOTA: EstadoCuota[] = ["PENDIENTE", "VENCIDA", "PAGADA"];

export const etiquetaEstadoCuota: Record<EstadoCuota, string> = {
  PENDIENTE: "Pendiente",
  VENCIDA: "Vencida",
  PAGADA: "Pagada",
};

// Mismos tonos que usa Visitas para estados equivalentes, para que el sistema
// se lea igual en todos los módulos.
export const colorEstadoCuota: Record<EstadoCuota, string> = {
  PENDIENTE: "#2563eb",
  VENCIDA: "#d97706",
  PAGADA: "#16a34a",
};

/** "2026-11-10" → "10/11/2026", sin pasar por Date para no correr el día. */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Fecha y hora de un instante ISO en hora de El Salvador. */
export function fechaHoraLocal(iso: string): string {
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

// ---------- H4: morosidad ----------

export type FilaMorosidad = {
  unidadId: string;
  codigo: string;
  torre: string;
  cuotasVencidas: number;
  saldoVencido: string;
  vencimientoMasAntiguo: string; // AAAA-MM-DD
  diasAtraso: number;
};

export type ListaMorosidad = {
  datos: FilaMorosidad[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export type DetalleMorosidad = {
  unidadId: string;
  codigo: string;
  cuotas: {
    id: string;
    periodo: string;
    monto: string;
    fechaVencimiento: string;
    diasAtraso: number;
  }[];
};

/** Torres presentes en la lista, sin repetir y en orden alfabético. */
export function torresDe(filas: FilaMorosidad[]): string[] {
  return [...new Set(filas.map((f) => f.torre))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Suma de montos en centavos, para no acumular errores de punto flotante. */
export function sumarMontos(montos: string[]): string {
  const centavos = montos.reduce((total, monto) => {
    const [entero, decimales = "0"] = monto.split(".");
    return total + Number(entero) * 100 + Number(decimales.padEnd(2, "0").slice(0, 2));
  }, 0);
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

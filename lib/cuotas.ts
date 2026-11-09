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

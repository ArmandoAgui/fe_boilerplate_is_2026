export type ListaPaquetes={datos:Paquete[];total:number;pagina:number;tamanoPagina:number};
export type EstadoPaquete = "PENDIENTE" | "ENTREGADO";

export type UnidadOpcion = { id: string; codigo: string; torre: string };

export type PaqueteRegistrado = {
  id: string;
  codigo: string;
  unidadId: string;
  unidadCodigo: string;
  empresa: string;
  descripcion: string | null;
  estado: EstadoPaquete;
  recibidoAt: string;
};

export const LARGO_EMPRESA = { min: 2, max: 60 };
export const MAXIMO_DESCRIPCION = 120;

/** Mismos textos que usa el servidor, para que el usuario vea uno solo. */
export function errorEmpresa(valor: string) {
  const v = valor.trim();
  if (v.length < LARGO_EMPRESA.min || v.length > LARGO_EMPRESA.max)
    return `La empresa debe tener entre ${LARGO_EMPRESA.min} y ${LARGO_EMPRESA.max} caracteres`;
  return "";
}

export function errorDescripcion(valor: string) {
  if (valor.trim().length > MAXIMO_DESCRIPCION)
    return `La descripción admite hasta ${MAXIMO_DESCRIPCION} caracteres`;
  return "";
}

/**
 * Mismo texto que usa la pantalla de accesos de H14, y distinto al de la
 * opción vacía del desplegable, que la tarjeta fija en "Seleccione una
 * unidad": si fueran idénticos, un lector de pantalla leería dos veces la
 * misma frase, la del control y la del error.
 */
export function errorUnidad(valor: string) {
  return valor ? "" : "Seleccione una unidad de destino";
}

/** Filtra el catálogo ya cargado, por código y por torre. */
export function filtrarUnidades(unidades: UnidadOpcion[], buscar: string) {
  const t = buscar.trim().toLowerCase();
  if (!t) return unidades;
  return unidades.filter(
    (u) =>
      u.codigo.toLowerCase().includes(t) || u.torre.toLowerCase().includes(t),
  );
}

/**
 * Mismo formato y misma zona que el de visitas. Está duplicado porque cada
 * módulo se mantiene solo; los dos deberían mudarse a un lib compartido
 * cuando el equipo lo decida.
 */
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

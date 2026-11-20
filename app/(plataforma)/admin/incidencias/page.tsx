import { SinPermiso } from "@/components/reservas/ui";
import { AdministrarIncidencias } from "@/components/incidencias/administrar-incidencias";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  cargarDetalleIncidenciaAdmin,
  cargarResponsablesAdmin,
} from "@/lib/incidencias-admin-data";
import {
  ESTADOS_INCIDENCIA,
  PRIORIDADES_INCIDENCIA,
  type EstadoIncidencia,
  type IncidenciaResumen,
  type ListaIncidencias,
  type PrioridadIncidencia,
} from "@/lib/incidencias-admin";

const TAMANO_PAGINA = 20;
const LISTA_VACIA: ListaIncidencias = {
  datos: [],
  total: 0,
  pagina: 1,
  tamanoPagina: TAMANO_PAGINA,
};

function primerValor(valor?: string | string[]) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function esEstado(valor?: string): valor is EstadoIncidencia {
  return ESTADOS_INCIDENCIA.includes(valor as EstadoIncidencia);
}

function esPrioridad(valor?: string): valor is PrioridadIncidencia {
  return PRIORIDADES_INCIDENCIA.includes(valor as PrioridadIncidencia);
}

function queryLista(
  pagina: number,
  estado?: EstadoIncidencia,
  prioridad?: PrioridadIncidencia,
) {
  const params = new URLSearchParams({
    pagina: String(pagina),
    tamanoPagina: String(TAMANO_PAGINA),
  });
  if (estado) params.set("estado", estado);
  if (prioridad) params.set("prioridad", prioridad);
  return "incidencias?" + params.toString();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string | string[];
    prioridad?: string | string[];
    pagina?: string | string[];
    id?: string | string[];
    sinSeleccion?: string | string[];
  }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;

  const params = await searchParams;
  const estadoValor = primerValor(params.estado);
  const prioridadValor = primerValor(params.prioridad);
  const estado = esEstado(estadoValor) ? estadoValor : undefined;
  const prioridad = esPrioridad(prioridadValor) ? prioridadValor : undefined;
  const paginaSolicitada = Number(primerValor(params.pagina));
  const pagina = Number.isSafeInteger(paginaSolicitada) && paginaSolicitada > 0
    ? paginaSolicitada
    : 1;
  const idSolicitado = primerValor(params.id);
  const sinSeleccion = primerValor(params.sinSeleccion) === "1";

  let listado = LISTA_VACIA;
  let errorInicial = "";
  try {
    listado = await api<ListaIncidencias>(queryLista(pagina, estado, prioridad));
    const ultimaPagina = Math.max(1, Math.ceil(listado.total / TAMANO_PAGINA));
    if (pagina > ultimaPagina) {
      listado = await api<ListaIncidencias>(
        queryLista(ultimaPagina, estado, prioridad),
      );
    }
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    errorInicial =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las incidencias. Intente de nuevo.";
  }

  const seleccionada =
    listado.datos.find((incidencia: IncidenciaResumen) =>
      idSolicitado ? incidencia.id === idSolicitado : false,
    ) ?? (!idSolicitado && !sinSeleccion ? listado.datos[0] : undefined);
  const [responsables, detalle] = seleccionada
    ? await Promise.all([
        cargarResponsablesAdmin(),
        cargarDetalleIncidenciaAdmin(seleccionada.id),
      ])
    : [undefined, undefined];

  return (
    <AdministrarIncidencias
      incidencias={listado}
      estado={estado}
      prioridad={prioridad}
      seleccionada={seleccionada}
      responsables={responsables?.datos ?? []}
      errorResponsables={responsables?.error}
      detalle={detalle?.datos}
      errorDetalle={detalle?.error}
      estadoDetalle={detalle?.status}
      errorInicial={errorInicial}
    />
  );
}

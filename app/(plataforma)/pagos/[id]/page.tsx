import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  EstadoPagoBadge,
  SinPermiso,
  TituloCuotas,
} from "@/components/cuotas/ui";
import {
  colorEstadoPago,
  dinero,
  fechaHoraLocal,
  type DetalleCuota,
  type Pago,
} from "@/lib/cuotas";

/** H2: comprobante del pago. Solo lo ve el residente que pagó. */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const { id } = await params;

  let pago: Pago;
  try {
    pago = await api<Pago>(`pagos/${encodeURIComponent(id)}`);
  } catch (error) {
    // 404: no existe o es de otro usuario; 400: el id no es un UUID.
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  // El pago no trae la unidad; la cuota sí, y así "Volver" abre el estado de
  // cuenta de la unidad correcta cuando el residente tiene varias.
  let volverA = "/cuotas";
  try {
    const cuota = await api<DetalleCuota>(
      `cuotas/${encodeURIComponent(pago.cuotaId)}`,
    );
    volverA = `/cuotas?unidadId=${cuota.unidadId}`;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  const aprobado = pago.estado === "APROBADO";
  const datos: [string, React.ReactNode][] = [
    ["Número de referencia", pago.referencia],
    ["Fecha y hora", fechaHoraLocal(pago.fecha)],
    ["Concepto", pago.concepto],
    ["Monto", dinero(pago.monto)],
    ["Tarjeta", `•••• ${pago.ultimos4}`],
    ["Estado", <EstadoPagoBadge key="estado" estado={pago.estado} />],
  ];
  if (!aprobado)
    datos.push(["Motivo", pago.motivoRechazo ?? "Sin motivo informado"]);

  return (
    <>
      <TituloCuotas
        titulo={aprobado ? "Comprobante de pago" : "Pago rechazado"}
        detalle={
          aprobado
            ? "Tu pago fue aprobado y la cuota quedó pagada."
            : "La cuota sigue pendiente; puedes intentar el pago de nuevo."
        }
        accion={
          <Link className="button-secondary" href={volverA}>
            Volver al estado de cuenta
          </Link>
        }
      />
      <section
        className="panel max-w-2xl border-l-4"
        style={{ borderLeftColor: colorEstadoPago[pago.estado] }}
        aria-label={aprobado ? "Comprobante" : "Detalle del pago rechazado"}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-sm text-muted">{etiqueta}</dt>
              <dd className="mt-1 font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>
      {!aprobado && (
        <Link className="button mt-5" href={`/cuotas/${pago.cuotaId}/pagar`}>
          Intentar de nuevo
        </Link>
      )}
    </>
  );
}

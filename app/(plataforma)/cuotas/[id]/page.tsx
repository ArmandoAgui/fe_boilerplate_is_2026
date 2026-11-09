import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import {
  EstadoCuotaBadge,
  SinPermiso,
  TituloCuotas,
} from "@/components/cuotas/ui";
import {
  dinero,
  fechaCorta,
  fechaHoraLocal,
  type DetalleCuota,
} from "@/lib/cuotas";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const { id } = await params;

  let cuota: DetalleCuota;
  try {
    cuota = await api<DetalleCuota>(`cuotas/${encodeURIComponent(id)}`);
  } catch (error) {
    // 404: no existe o es de una unidad ajena; 400: el id no es un UUID.
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  const datos: [string, React.ReactNode][] = [
    ["Concepto", cuota.concepto],
    ["Período", cuota.periodo],
    ["Monto", dinero(cuota.monto)],
    ["Vencimiento", fechaCorta(cuota.fechaVencimiento)],
    ["Estado", <EstadoCuotaBadge key="estado" estado={cuota.estado} />],
    [
      "Fecha de pago",
      cuota.fechaPago ? fechaHoraLocal(cuota.fechaPago) : "Sin pago registrado",
    ],
  ];

  return (
    <>
      <TituloCuotas
        titulo="Detalle de cuota"
        detalle={`${cuota.concepto}, período ${cuota.periodo}.`}
        accion={
          <Link
            className="button-secondary"
            href={`/cuotas?unidadId=${cuota.unidadId}`}
          >
            Volver al estado de cuenta
          </Link>
        }
      />
      <dl className="panel grid max-w-2xl gap-4 sm:grid-cols-2">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="text-sm text-muted">{etiqueta}</dt>
            <dd className="mt-1 font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

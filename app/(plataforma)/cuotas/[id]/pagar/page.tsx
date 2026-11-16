import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import { PagarCuota } from "@/components/cuotas/pagar-cuota";
import {
  EstadoCuotaBadge,
  SinPermiso,
  TituloCuotas,
} from "@/components/cuotas/ui";
import {
  dinero,
  fechaCorta,
  mesLocal,
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

  const volverA = `/cuotas?unidadId=${cuota.unidadId}`;
  const resumen: [string, React.ReactNode][] = [
    ["Concepto", cuota.concepto],
    ["Período", cuota.periodo],
    ["Monto", dinero(cuota.monto)],
    ["Vencimiento", fechaCorta(cuota.fechaVencimiento)],
    ["Estado", <EstadoCuotaBadge key="estado" estado={cuota.estado} />],
  ];

  return (
    <>
      <TituloCuotas
        titulo="Pagar cuota"
        detalle={`${cuota.concepto}, período ${cuota.periodo}.`}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,30rem)]">
        <section className="panel" aria-labelledby="resumen-titulo">
          <h2 id="resumen-titulo" className="mb-4 text-lg font-semibold">
            Resumen de la cuota
          </h2>
          <dl className="grid gap-4">
            {resumen.map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="mt-1 font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {cuota.estado === "PAGADA" ? (
          <section className="panel">
            <p className="font-medium">Esta cuota ya está pagada.</p>
            <Link className="button-secondary mt-4" href={`/cuotas/${cuota.id}`}>
              Ver detalle de la cuota
            </Link>
          </section>
        ) : (
          <PagarCuota
            cuotaId={cuota.id}
            monto={cuota.monto}
            mesActual={mesLocal()}
            volverA={volverA}
          />
        )}
      </div>
    </>
  );
}

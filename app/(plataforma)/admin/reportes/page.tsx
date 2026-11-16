import { api, ApiError, usuarioActual } from "@/lib/api";
import { SinPermiso } from "@/components/cuotas/ui";
import { FiltroPeriodo } from "@/components/reportes/filtro-periodo";
import { TarjetasIndicadores } from "@/components/reportes/tarjetas-indicadores";
import { TituloReportes } from "@/components/reportes/ui";
import { fechaHoraLocal } from "@/lib/cuotas";
import {
  errorRango,
  rangoPorDefecto,
  type ResumenIndicadores,
} from "@/lib/reportes";

/** H29: panel de indicadores consolidados. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "ADMINISTRADOR") return <SinPermiso />;

  const query = await searchParams;
  const porDefecto = rangoPorDefecto();
  const desde = typeof query.desde === "string" ? query.desde : porDefecto.desde;
  const hasta = typeof query.hasta === "string" ? query.hasta : porDefecto.hasta;

  // Un rango inválido escrito a mano en la URL ya lo muestra el filtro; no se
  // consulta al backend para recibir el mismo error.
  let resumen: ResumenIndicadores | undefined;
  let errorApi = "";
  if (!errorRango(desde, hasta)) {
    try {
      resumen = await api<ResumenIndicadores>(
        `reportes/resumen?${new URLSearchParams({ desde, hasta }).toString()}`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 400)
        errorApi = error.message;
      else throw error;
    }
  }

  return (
    <>
      <TituloReportes
        titulo="Panel de indicadores"
        detalle="Morosidad, uso de áreas, incidencias y participación del condominio en el período elegido."
      />
      {/* key: al cambiar la URL el filtro vuelve a tomar las fechas aplicadas. */}
      <FiltroPeriodo key={`${desde}_${hasta}`} desde={desde} hasta={hasta} />
      {errorApi && (
        <p role="alert" className="panel field-error">
          {errorApi}
        </p>
      )}
      {resumen && (
        <section aria-label="Indicadores" aria-live="polite">
          <TarjetasIndicadores resumen={resumen} />
          <p className="mt-4 text-xs text-muted">
            Calculado el {fechaHoraLocal(resumen.generadoAt)} con los datos
            actuales de cada módulo.
          </p>
        </section>
      )}
    </>
  );
}

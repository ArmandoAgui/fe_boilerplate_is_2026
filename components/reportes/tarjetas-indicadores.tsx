import {
  dinero,
  fechaCorta,
  numero,
  type ResumenIndicadores,
} from "@/lib/reportes";

export type Tarjeta = {
  titulo: string;
  /** null cuando no hay base de cálculo: se muestra "Sin datos". */
  valor: string | null;
  detalle: string;
  origen: string;
};

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/**
 * Traduce la respuesta del backend a las cuatro tarjetas. "Sin datos" y un
 * cero real son cosas distintas: el backend lo indica con `estado`.
 */
export function tarjetasDe(r: ResumenIndicadores): Tarjeta[] {
  const { morosidad: m, usoAreas: u, incidenciasAbiertas: i } = r;
  const p = r.participacion;
  return [
    {
      titulo: "Morosidad",
      valor:
        m.estado === "DATOS" && m.porcentaje !== null
          ? `${numero(m.porcentaje)} %`
          : null,
      detalle:
        m.estado === "DATOS"
          ? `${m.unidadesMorosas} de ${plural(m.unidadesActivas, "unidad activa", "unidades activas")}, saldo vencido ${dinero(m.saldoVencido ?? "0.00")}`
          : m.unidadesActivas === 0
            ? "No hay unidades activas"
            : "Ninguna cuota venció en el período",
      origen: "Cuotas y pagos",
    },
    {
      titulo: "Uso de áreas",
      valor:
        u.estado === "DATOS" && u.porcentaje !== null
          ? `${numero(u.porcentaje)} %`
          : null,
      detalle:
        u.estado === "DATOS"
          ? `${numero(u.horasReservadas)} h reservadas de ${numero(u.horasHabilitadas)} h habilitadas`
          : "No hay áreas activas con horario en el período",
      origen: "Reservas de áreas comunes",
    },
    {
      titulo: "Incidencias abiertas",
      valor: i.estado === "DATOS" ? String(i.abiertas) : null,
      detalle:
        i.estado === "DATOS"
          ? `De ${plural(i.creadas, "incidencia creada", "incidencias creadas")} en el período`
          : "No se crearon incidencias en el período",
      origen: "Incidencias",
    },
    {
      titulo: "Participación en votaciones",
      valor:
        p.estado === "DATOS" && p.porcentajePromedio !== null
          ? `${numero(p.porcentajePromedio)} %`
          : null,
      detalle:
        p.estado === "DATOS"
          ? `Promedio de ${plural(p.temasCerrados, "tema cerrado", "temas cerrados")}`
          : "Ninguna votación cerró en el período",
      origen: "Asambleas y votaciones",
    },
  ];
}

/** Las cuatro tarjetas de H29. Sin estado propio: H30 la reutiliza. */
export function TarjetasIndicadores({
  resumen,
}: {
  resumen: ResumenIndicadores;
}) {
  const periodo = `${fechaCorta(resumen.desde)} al ${fechaCorta(resumen.hasta)}`;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {tarjetasDe(resumen).map((t) => (
        <article key={t.titulo} className="panel flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted">{t.titulo}</h2>
          <p className="text-4xl font-semibold tabular-nums">
            {t.valor ?? (
              <span className="text-2xl font-medium text-muted">Sin datos</span>
            )}
          </p>
          <p className="text-sm">{t.detalle}</p>
          <dl className="mt-auto grid gap-1 border-t border-line pt-3 text-xs text-muted">
            <div className="flex flex-wrap gap-1">
              <dt>Período:</dt>
              <dd>{periodo}</dd>
            </div>
            <div className="flex flex-wrap gap-1">
              <dt>Origen:</dt>
              <dd>{t.origen}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

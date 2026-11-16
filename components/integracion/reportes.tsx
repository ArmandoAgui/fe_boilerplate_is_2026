import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PantallaCompleta } from "./pantalla-completa";
export async function Reporte({
  q,
  compartir = false,
}: {
  q: { desde?: string; hasta?: string };
  compartir?: boolean;
}) {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const desde = q.desde ?? hoy.slice(0, 7) + "-01",
    hasta = q.hasta ?? hoy;
  const params = new URLSearchParams({ desde, hasta });
  type Reporte = {
    desde: string;
    hasta: string;
    generadoAt: string;
    generadoPor: string;
    criterio: string;
    indicadores: {
      clave: string;
      titulo: string;
      valor: number | null;
      unidad: string;
      origen: string;
      formula: string;
      saldoVencido?: string;
    }[];
  };
  let r: Reporte;
  try {
    r = await api<Reporte>(`administracion/reportes?${params}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 400)
      return (
        <p role="alert" className="panel">
          {e.message} <Link href="/admin/reportes">Corregir período</Link>
        </p>
      );
    throw e;
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {compartir ? (
          <>
            <PantallaCompleta />
            <a className="button" href={`/api/reportes/pdf?${params}`}>
              Descargar PDF
            </a>
            <Link
              className="button-secondary"
              href={`/admin/reportes?${params}`}
            >
              Volver al panel
            </Link>
          </>
        ) : (
          <Link className="button" href={`/admin/reportes/compartir?${params}`}>
            Compartir reporte
          </Link>
        )}
      </div>
      <form className="panel mb-5 flex flex-wrap items-end gap-4">
        <label>
          Desde
          <input
            className="field mt-1"
            name="desde"
            type="date"
            defaultValue={desde}
            required
          />
        </label>
        <label>
          Hasta
          <input
            className="field mt-1"
            name="hasta"
            type="date"
            defaultValue={hasta}
            required
          />
        </label>
        <button className="button-secondary">Consultar</button>
      </form>
      {compartir && (
        <p className="mb-4 text-muted">
          Puedes compartir el PDF con cualquier persona. Contiene indicadores
          generales, sin nombres ni deudas de unidades individuales.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {r.indicadores.map((i) => (
          <article key={i.clave} className="panel">
            <h2 className="text-lg font-semibold">{i.titulo}</h2>
            <p className="my-3 text-3xl font-semibold">
              {i.valor === null ? "Sin datos" : `${i.valor}${i.unidad}`}
            </p>
            {i.saldoVencido && <p>Saldo vencido: ${i.saldoVencido}</p>}
            <p className="mt-3 text-sm text-muted">
              {r.desde} — {r.hasta} · {i.origen}
            </p>
            <p className="mt-2 text-sm text-muted">{i.formula}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted">
        Generado por {r.generadoPor} ·{" "}
        {new Date(r.generadoAt).toLocaleString("es-SV", {
          timeZone: "America/El_Salvador",
        })}
      </p>
      <p className="mt-2 text-sm text-muted">{r.criterio}</p>
    </>
  );
}

import Link from "next/link";
import { colorEstado, etiquetaEstado, type EstadoVisita } from "@/lib/visitas";

// Duplica a propósito los equivalentes de reservas: cada integrante mantiene
// su módulo sin depender del de otro. Candidatos a un components/ui común
// cuando haya un tercer módulo con las mismas piezas.
export function SinPermiso() {
  return (
    <section className="panel">
      <h1>No tienes permiso para ver esta página</h1>
      <Link className="button" href="/">
        Ir al inicio
      </Link>
    </section>
  );
}

/**
 * El mockup pone un breadcrumb sobre el título. Esa barra vive en el layout
 * compartido, así que acá se aproxima con la sección como antetítulo.
 */
export function TituloVisitas({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted">Visitas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="mt-2 text-muted">{detalle}</p>
      </div>
      {accion}
    </header>
  );
}

/** Punto de color más etiqueta, como en la hoja del módulo. */
export function Estado({ estado }: { estado: EstadoVisita }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: colorEstado[estado] }}
      />
      {etiquetaEstado[estado]}
    </span>
  );
}

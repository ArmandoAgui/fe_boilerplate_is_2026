import Link from "next/link";

// Duplica a propósito los equivalentes de reservas y visitas, siguiendo la
// convención del equipo: cada integrante mantiene su módulo sin depender del
// de otro.
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

export function TituloCuotas({
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
        <p className="text-sm font-medium text-muted">Cuotas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="mt-2 text-muted">{detalle}</p>
      </div>
      {accion}
    </header>
  );
}

/** Cifra grande con su etiqueta, como las tarjetas del mockup. */
export function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

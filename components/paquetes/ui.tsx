import Link from "next/link";

// Duplica los equivalentes de visitas y reservas: cada módulo se mantiene
// solo. Candidatos a un components/ui común cuando el equipo lo decida.
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

export function TituloPaquetes({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <header className="mb-7">
      <p className="text-sm font-medium text-muted">Paquetería</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-muted">{detalle}</p>
    </header>
  );
}

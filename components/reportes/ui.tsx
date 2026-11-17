/** Encabezado de las pantallas del Módulo 10, mismo estilo que Cuotas. */
export function TituloReportes({
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
        <p className="text-sm font-medium text-muted">Reportes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="mt-2 text-muted">{detalle}</p>
      </div>
      {accion}
    </header>
  );
}

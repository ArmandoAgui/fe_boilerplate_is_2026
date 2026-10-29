import Link from "next/link";
import type { Area, Rol } from "@/lib/reservas";
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
export function Titulo({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <header className="mb-7">
      <p className="text-sm font-medium text-accent">
        Condominio · Áreas comunes
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-muted">{detalle}</p>
    </header>
  );
}
export function Catalogo({ areas }: { areas: Area[] }) {
  if (!areas.length)
    return <p className="panel">Aún no hay áreas activas disponibles</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {areas.map((a) => (
        <article key={a.id} className="panel">
          <h2 className="text-xl font-semibold">{a.nombre}</h2>
          <p className="my-3 text-muted">Capacidad: {a.capacidad} personas</p>
          <Link className="button" href={`/areas/${a.id}/disponibilidad`}>
            Consultar disponibilidad <span aria-hidden>→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
export function Navegacion({ rol }: { rol: Rol }) {
  return (
    <nav
      aria-label="Principal"
      className="flex flex-wrap gap-4 text-sm font-medium"
    >
      <Link href="/">Inicio</Link>
      {rol !== "SEGURIDAD" && <Link href="/areas">Áreas comunes</Link>}
      {rol === "RESIDENTE" && (
        <>
          <Link href="/reservas">Mis reservas</Link>
          <Link href="/reservas/nueva">Nueva reserva</Link>
        </>
      )}
      {rol === "ADMINISTRADOR" && (
        <Link href="/admin/areas">Administrar áreas</Link>
      )}
    </nav>
  );
}

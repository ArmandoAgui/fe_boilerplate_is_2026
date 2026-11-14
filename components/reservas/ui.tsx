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
const enlacesResidente = [
  { texto: "Inicio", href: "/" },
  { texto: "Áreas comunes", href: "/areas" },
  { texto: "Mis reservas", href: "/reservas" },
  { texto: "Nueva reserva", href: "/reservas/nueva" },
  { texto: "Mis visitantes", href: "/visitas" },
  { texto: "Mis paquetes", href: "/paquetes" },
  { texto: "Asambleas", href: "/asambleas" },
  { texto: "Incidencias", href: "/incidencias/nueva" },
  { texto: "Estado de cuenta", href: "/cuotas" },
  { texto: "Avisos", href: "/avisos" },
];

export function Navegacion({
  rol,
  actualHref,
  variante = "default",
}: {
  rol: Rol;
  actualHref?: string;
  variante?: "default" | "lateral";
}) {
  if (rol === "RESIDENTE")
    return (
      <nav
        aria-label="Principal"
        className={
          variante === "lateral"
            ? "nav-residente-lateral flex min-w-max gap-1 p-2 lg:min-w-0 lg:flex-col lg:gap-0 lg:px-0 lg:py-3"
            : "default-navigation flex flex-wrap gap-4 text-sm font-medium"
        }
      >
        {enlacesResidente.map((enlace) => {
          const actual = actualHref === enlace.href || actualHref?.startsWith(`${enlace.href}/`);
          const estiloLateral = variante === "lateral";
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={actual ? "page" : undefined}
              className={
                estiloLateral
                  ? `flex min-h-10 items-center whitespace-nowrap border-l-2 px-3 text-xs no-underline transition-colors lg:px-5 ${actual ? "border-amber-300 bg-white/10 font-semibold text-white" : "border-transparent text-white/75 hover:bg-white/5 hover:text-white"}`
                  : actual
                    ? "border-b-accent! font-semibold text-accent"
                    : undefined
              }
            >
              {enlace.texto}
            </Link>
          );
        })}
      </nav>
    );

  return (
    <nav
      aria-label="Principal"
      className="default-navigation flex flex-wrap gap-4 text-sm font-medium"
    >
      <Link href="/">Inicio</Link>
      {rol !== "SEGURIDAD" && <Link href="/areas">Áreas comunes</Link>}
      {rol === "SEGURIDAD" && (
        <>
          <Link href="/seguridad/accesos">Control de accesos</Link>
          <Link href="/seguridad/presentes">Visitantes presentes</Link>
          <Link href="/seguridad/paquetes/nuevo">Recibir paquete</Link>
        </>
      )}
      {rol === "ADMINISTRADOR" && (
        <>
          <Link href="/admin/incidencias">Incidencias</Link>
          <Link href="/admin/areas">Administrar áreas</Link>
          <Link href="/admin/comunicados">Comunicados</Link>
          <Link href="/admin/reservas">Aprobar reservas</Link>
          <Link href="/admin/cuotas/generar">Generar cuotas</Link>
          <Link href="/admin/morosidad">Morosidad</Link>
          <Link href="/seguridad/presentes">Visitantes presentes</Link>
          <Link href="/admin/asambleas/nueva">Convocar asamblea</Link>
         <Link href="/asambleas">Asambleas</Link>
        </>
      )}
    </nav>
  );
}

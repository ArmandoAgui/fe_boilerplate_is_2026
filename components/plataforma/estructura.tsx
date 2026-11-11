"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { ThemePicker } from "@/components/theme-provider";
import { Navegacion } from "@/components/reservas/ui";
import type { Usuario } from "@/lib/reservas";

const enlaces = [
  { texto: "Inicio", href: "/" },
  { texto: "Generar cuotas", href: "/admin/cuotas/generar" },
  { texto: "Morosidad" },
  { texto: "Áreas comunes", href: "/admin/areas" },
  { texto: "Incidencias", href: "/admin/incidencias", actual: true },
  { texto: "Visitantes presentes", href: "/seguridad/presentes" },
  { texto: "Asambleas" },
  { texto: "Comunicados", href: "/admin/comunicados" },
  { texto: "Reportes" },
];

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export function EstructuraPlataforma({
  usuario,
  children,
}: {
  usuario: Usuario;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (
    pathname === "/admin/incidencias" &&
    usuario.rol === "ADMINISTRADOR"
  ) {
    return (
      <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col bg-[#20443d] text-white lg:min-h-screen lg:w-48">
          <Link
            href="/"
            className="flex min-h-16 flex-col justify-center border-b border-white/10 px-5 py-3 no-underline hover:bg-white/5"
          >
            <span className="text-base font-semibold">Condominio</span>
            <span className="text-xs text-white/65">Torres A y B</span>
          </Link>
          <nav aria-label="Navegación administrativa" className="flex-1 overflow-x-auto lg:overflow-visible">
            <div className="flex min-w-max gap-1 p-2 lg:min-w-0 lg:flex-col lg:gap-0 lg:px-0 lg:py-3">
              {enlaces.map((enlace, indice) => {
                const grupo = indice === 1 || indice === 3 || indice === 8;
                return (
                  <div key={enlace.texto} className="lg:contents">
                    {grupo && (
                      <p className="hidden px-5 pb-1 pt-3 text-[10px] uppercase tracking-wider text-white/50 lg:block">
                        {indice === 1 ? "Cuotas" : indice === 3 ? "Operación" : "Análisis"}
                      </p>
                    )}
                    {enlace.href ? (
                      <Link
                        href={enlace.href}
                        aria-current={enlace.actual ? "page" : undefined}
                        className={
                          "flex min-h-10 items-center whitespace-nowrap border-l-2 px-3 text-xs no-underline transition-colors lg:px-5 " +
                          (enlace.actual
                            ? "border-amber-300 bg-white/10 font-semibold text-white"
                            : "border-transparent text-white/75 hover:bg-white/5 hover:text-white")
                        }
                      >
                        {enlace.texto}
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="flex min-h-10 items-center whitespace-nowrap border-l-2 border-transparent px-3 text-xs text-white/40 lg:px-5"
                      >
                        {enlace.texto}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
          <form action={logout} className="hidden border-t border-white/10 p-3 lg:block">
            <button className="min-h-10 w-full rounded-lg px-3 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white">
              Cerrar sesión
            </button>
          </form>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 sm:px-6">
            <p className="text-xs text-muted">
              Operación <span aria-hidden="true">/</span>{" "}
              <span className="font-medium text-foreground">Incidencias</span>
            </p>
            <div className="flex items-center gap-3">
              <ThemePicker />
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full bg-surface-alt text-xs font-semibold text-accent"
              >
                {iniciales(usuario.nombre)}
              </span>
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold">{usuario.nombre}</span>
                <span className="block text-xs text-muted">Administrador</span>
              </span>
              <form action={logout} className="lg:hidden">
                <button className="button-secondary min-h-9 px-3 py-1 text-xs">
                  Salir
                </button>
              </form>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-7">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
          <div>
            <p className="mb-3 text-lg font-semibold">Nuestra comunidad</p>
            <Navegacion rol={usuario.rol} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">{usuario.nombre}</span>
            <ThemePicker />
            <form action={logout}>
              <button className="button-secondary">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-9">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-xs text-muted">
        Horarios de El Salvador · UTC−6
      </footer>
    </>
  );
}

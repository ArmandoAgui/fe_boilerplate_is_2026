"use client";

import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { ThemePicker } from "@/components/theme-provider";
import { CampanaAvisos } from "@/components/notificaciones/campana";
import { Navegacion } from "@/components/reservas/ui";
import type { Usuario } from "@/lib/reservas";

export function EstructuraPlataforma({
  usuario,
  children,
}: {
  usuario: Usuario;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const esResidente = usuario.rol === "RESIDENTE";
  return (
    <>
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
          <div>
            <p className="mb-3 text-lg font-semibold">Nuestra comunidad</p>
            <Navegacion rol={usuario.rol} actualHref={pathname} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">{usuario.nombre}</span>
            {esResidente && <CampanaAvisos />}
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

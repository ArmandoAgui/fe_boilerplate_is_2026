import { api, usuarioActual } from "@/lib/api";
import { logout } from "@/app/actions/auth";
import { AuthProvider } from "@/components/auth-provider";
import { Navegacion } from "@/components/reservas/ui";
import type { Unidad } from "@/lib/reservas";
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  const unidades =
    usuario.rol === "RESIDENTE"
      ? (await api<{ datos: Unidad[] }>("unidades/mias")).datos
      : [];
  return (
    <AuthProvider usuario={usuario} unidades={unidades}>
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
          <div>
            <p className="mb-3 text-lg font-semibold">Nuestra comunidad</p>
            <Navegacion rol={usuario.rol} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>{usuario.nombre}</span>
            <form action={logout}>
              <button className="button-secondary">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-9">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-xs text-zinc-500">
        Horarios de El Salvador · UTC−6
      </footer>
    </AuthProvider>
  );
}

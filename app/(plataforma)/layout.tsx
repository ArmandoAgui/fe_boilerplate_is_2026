import { ThemePicker } from "@/components/theme-provider";
import { usuarioActual } from "@/lib/api";
import { logout } from "@/app/actions/auth";
import { AuthProvider } from "@/components/auth-provider";
import { Navegacion } from "@/components/reservas/ui";
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  return (
    <AuthProvider usuario={usuario} unidades={[]}>
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
    </AuthProvider>
  );
}
